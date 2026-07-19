import { createJSONStorage } from "zustand/middleware"
import type { StateStorage } from "zustand/middleware"
import type {
  Fixture,
  Guest,
  Hall,
  HallPreset,
  Table,
} from "@/stores/planner.store"

// Sentinel `weddingId` for the single, device-local wedding a signed-out
// guest plans in. Never a real Supabase row id, so it doubles as the signal
// that mutations (src/lib/sync/mutations/shared.ts) should no-op.
export const LOCAL_WEDDING_ID = "local"

export const isLocalWedding = (id?: string): boolean => id === LOCAL_WEDDING_ID

export const PLANNER_STORAGE_KEY = "easywed.planner.local"
export const GLOBAL_STORAGE_KEY = "easywed.global.local"

// Resolves the currently-active weddingId for the gate below. global.store.ts
// registers its own getter right after declaring itself (registerActiveWeddingIdGetter,
// below) - that indirection, rather than importing useGlobalStore here, is
// what lets global.store.ts wrap *itself* in this same gated storage without
// a same-file circular type-inference error (TS can't type-check a store
// referencing its own not-yet-fully-typed self inside its own persist config).
let getActiveWeddingId = (): string | undefined => undefined

export const registerActiveWeddingIdGetter = (
  getter: () => string | undefined
): void => {
  getActiveWeddingId = getter
}

// localStorage is unavailable during SSR and can throw even when present
// (privacy mode, blocked storage, quota exceeded). These treat it as an
// optional cache: unavailable/throwing storage degrades to a no-op instead
// of crashing the app.
const safeGetItem = (key: string): string | null => {
  if (typeof localStorage === "undefined") return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const safeSetItem = (key: string, value: string): void => {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage blocked/full - guest mode just won't persist this write.
  }
}

const safeRemoveItem = (key: string): void => {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.removeItem(key)
  } catch {
    // see safeSetItem
  }
}

// Gates writes so the planner/global stores only ever persist to localStorage
// while the local wedding is the active one - editing a cloud wedding (same
// store instances) must never leak into these keys. Reads always pass
// through.
export const createLocalGatedStorage = (): StateStorage => ({
  getItem: (name) => safeGetItem(name),
  setItem: (name, value) => {
    if (!isLocalWedding(getActiveWeddingId())) return
    safeSetItem(name, value)
  },
  removeItem: (name) => {
    if (!isLocalWedding(getActiveWeddingId())) return
    safeRemoveItem(name)
  },
})

export const localPlannerStorage = createJSONStorage(() =>
  createLocalGatedStorage()
)

// A malformed/hand-edited persisted date string must not become an Invalid
// Date - downstream code (MigrateLocalWeddingDialog, PlannerPrintView) calls
// .toISOString()/date formatting on global.store's `date`, which throws for
// an Invalid Date. Returning undefined here drops the key entirely (both as
// a JSON.parse reviver and as a plain value).
const parseValidDate = (value: unknown): Date | undefined => {
  if (typeof value !== "string") return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

// global.store's `date` field is a real `Date` instance elsewhere in the app
// (see loadWedding.ts, PlannerPrintView.tsx). Plain JSON round-trips it to a
// string, so revive it back on read.
export const localGlobalStorage = createJSONStorage(
  () => createLocalGatedStorage(),
  {
    reviver: (key, value) => (key === "date" ? parseValidDate(value) : value),
  }
)

export interface LocalPlannerSnapshot {
  tables: Array<Table>
  guests: Array<Guest>
  fixtures: Array<Fixture>
  halls: Array<Hall>
}

// Pre-multi-hall persisted shape: a single `hall` object whose
// `preset: undefined` doubled as the "never configured" sentinel.
interface LegacyPlannerSnapshot {
  tables: Array<Omit<Table, "hallId">>
  guests: Array<Guest>
  fixtures: Array<Omit<Fixture, "hallId">>
  hall: {
    dimensions: { width: number; height: number }
    preset?: HallPreset
  }
}

export interface LocalGlobalSnapshot {
  name?: string
  date?: Date
}

const readPersistedState = <T>(key: string): T | null => {
  const raw = safeGetItem(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { state?: T }
    return parsed.state ?? null
  } catch {
    return null
  }
}

const isValidHallDimensions = (
  value: unknown
): value is { width: number; height: number } =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { width?: unknown }).width === "number" &&
  typeof (value as { height?: unknown }).height === "number"

// Guards against a corrupted/malformed persisted snapshot (e.g. hand-edited
// localStorage, or a schema change from an older app version) crashing a
// consumer like MigrateLocalWeddingDialog. Accepts both the current
// multi-hall shape (`halls` array) and the legacy single-`hall` shape;
// `normalizeLocalPlannerSnapshot` converts the latter.
const hasEntityArrays = (
  value: unknown
): value is {
  tables: Array<unknown>
  guests: Array<unknown>
  fixtures: Array<unknown>
} => {
  if (typeof value !== "object" || value === null) return false
  const v = value as { tables?: unknown; guests?: unknown; fixtures?: unknown }
  return (
    Array.isArray(v.tables) &&
    Array.isArray(v.guests) &&
    Array.isArray(v.fixtures)
  )
}

const isValidPlannerSnapshot = (
  value: unknown
): value is LocalPlannerSnapshot =>
  hasEntityArrays(value) && Array.isArray((value as { halls?: unknown }).halls)

const isLegacyPlannerSnapshot = (
  value: unknown
): value is LegacyPlannerSnapshot => {
  if (!hasEntityArrays(value)) return false
  const hall = (value as { hall?: unknown }).hall
  return (
    typeof hall === "object" &&
    hall !== null &&
    isValidHallDimensions((hall as { dimensions?: unknown }).dimensions)
  )
}

// Converts a legacy single-hall snapshot to the multi-hall shape: the hall
// becomes `halls[0]` at world (0, 0) and every entity is stamped with its id.
// A legacy wedding whose hall was never configured (`preset` undefined) and
// that has no entities normalizes to zero halls - the empty state.
const legacyToMultiHall = (
  legacy: LegacyPlannerSnapshot
): LocalPlannerSnapshot => {
  const needsHall =
    legacy.hall.preset !== undefined ||
    legacy.tables.length > 0 ||
    legacy.fixtures.length > 0
  if (!needsHall) {
    return {
      tables: [],
      guests: legacy.guests,
      fixtures: [],
      halls: [],
    }
  }
  const hall: Hall = {
    id: crypto.randomUUID(),
    name: "",
    // Legacy presets never carried geometry (they were only round-tripped),
    // so coerce to rectangle - matching the DB-side normalization in the
    // hall_geometry migration and the geometry <=> preset invariant.
    preset: "rectangle",
    size: {
      width: legacy.hall.dimensions.width,
      height: legacy.hall.dimensions.height,
    },
    position: { x: 0, y: 0 },
  }
  return {
    tables: legacy.tables.map((t) => ({ ...t, hallId: hall.id })),
    guests: legacy.guests,
    fixtures: legacy.fixtures.map((f) => ({ ...f, hallId: hall.id })),
    halls: [hall],
  }
}

// Normalizes any persisted planner payload (current or legacy shape) to the
// multi-hall snapshot, or null when it's unusable. Shared by the raw snapshot
// reader below and the planner store's persist `migrate`.
export const normalizeLocalPlannerSnapshot = (
  value: unknown
): LocalPlannerSnapshot | null => {
  if (isValidPlannerSnapshot(value)) return value
  if (isLegacyPlannerSnapshot(value)) return legacyToMultiHall(value)
  return null
}

// Reads the raw persisted snapshot directly, bypassing the live stores
// entirely. Rehydrating the live planner/global stores just to inspect them
// would clobber an actively-loaded cloud wedding if the user signs in from a
// different tab/route - this must stay decoupled from in-memory state.
export const readLocalPlannerSnapshot = (): LocalPlannerSnapshot | null =>
  normalizeLocalPlannerSnapshot(readPersistedState(PLANNER_STORAGE_KEY))

export const readLocalGlobalSnapshot = (): LocalGlobalSnapshot | null => {
  const state = readPersistedState<{ name?: string; date?: string }>(
    GLOBAL_STORAGE_KEY
  )
  if (!state) return null
  return {
    name: state.name,
    date: parseValidDate(state.date),
  }
}

export const hasLocalWeddingData = (): boolean => {
  const planner = readLocalPlannerSnapshot()
  const global = readLocalGlobalSnapshot()
  return (
    (planner?.tables.length ?? 0) > 0 ||
    (planner?.guests.length ?? 0) > 0 ||
    (planner?.fixtures.length ?? 0) > 0 ||
    Boolean(global?.name?.trim()) ||
    Boolean(global?.date)
  )
}

export const clearLocalWeddingStorage = (): void => {
  safeRemoveItem(PLANNER_STORAGE_KEY)
  safeRemoveItem(GLOBAL_STORAGE_KEY)
}
