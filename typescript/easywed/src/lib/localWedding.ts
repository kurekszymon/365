import { createJSONStorage } from "zustand/middleware"
import type { StateStorage } from "zustand/middleware"
import type { Fixture, Guest, HallPreset, Table } from "@/stores/planner.store"

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
// consumer like MigrateLocalWeddingDialog, which reads planner.hall.dimensions.*
// directly.
const isValidPlannerSnapshot = (
  value: unknown
): value is LocalPlannerSnapshot => {
  if (typeof value !== "object" || value === null) return false
  const v = value as {
    tables?: unknown
    guests?: unknown
    fixtures?: unknown
    hall?: unknown
  }
  return (
    Array.isArray(v.tables) &&
    Array.isArray(v.guests) &&
    Array.isArray(v.fixtures) &&
    typeof v.hall === "object" &&
    v.hall !== null &&
    isValidHallDimensions((v.hall as { dimensions?: unknown }).dimensions)
  )
}

// Reads the raw persisted snapshot directly, bypassing the live stores
// entirely. Rehydrating the live planner/global stores just to inspect them
// would clobber an actively-loaded cloud wedding if the user signs in from a
// different tab/route - this must stay decoupled from in-memory state.
export const readLocalPlannerSnapshot = (): LocalPlannerSnapshot | null => {
  const state = readPersistedState<LocalPlannerSnapshot>(PLANNER_STORAGE_KEY)
  return isValidPlannerSnapshot(state) ? state : null
}

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
