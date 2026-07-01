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
// below) — that indirection, rather than importing useGlobalStore here, is
// what lets global.store.ts wrap *itself* in this same gated storage without
// a same-file circular type-inference error (TS can't type-check a store
// referencing its own not-yet-fully-typed self inside its own persist config).
let getActiveWeddingId = (): string | undefined => undefined

export const registerActiveWeddingIdGetter = (
  getter: () => string | undefined
): void => {
  getActiveWeddingId = getter
}

// Gates writes so the planner/global stores only ever persist to localStorage
// while the local wedding is the active one — editing a cloud wedding (same
// store instances) must never leak into these keys. Reads always pass
// through.
export const createLocalGatedStorage = (): StateStorage => ({
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => {
    if (!isLocalWedding(getActiveWeddingId())) return
    localStorage.setItem(name, value)
  },
  removeItem: (name) => {
    if (!isLocalWedding(getActiveWeddingId())) return
    localStorage.removeItem(name)
  },
})

export const localPlannerStorage = createJSONStorage(() =>
  createLocalGatedStorage()
)

// global.store's `date` field is a real `Date` instance elsewhere in the app
// (see loadWedding.ts, PlannerPrintView.tsx). Plain JSON round-trips it to a
// string, so revive it back on read.
export const localGlobalStorage = createJSONStorage(
  () => createLocalGatedStorage(),
  {
    reviver: (key, value) =>
      key === "date" && typeof value === "string" ? new Date(value) : value,
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
  if (typeof localStorage === "undefined") return null
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { state?: T }
    return parsed.state ?? null
  } catch {
    return null
  }
}

// Reads the raw persisted snapshot directly, bypassing the live stores
// entirely. Rehydrating the live planner/global stores just to inspect them
// would clobber an actively-loaded cloud wedding if the user signs in from a
// different tab/route — this must stay decoupled from in-memory state.
export const readLocalPlannerSnapshot = (): LocalPlannerSnapshot | null =>
  readPersistedState<LocalPlannerSnapshot>(PLANNER_STORAGE_KEY)

export const readLocalGlobalSnapshot = (): LocalGlobalSnapshot | null => {
  const state = readPersistedState<{ name?: string; date?: string }>(
    GLOBAL_STORAGE_KEY
  )
  if (!state) return null
  return {
    name: state.name,
    date: state.date ? new Date(state.date) : undefined,
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
  localStorage.removeItem(PLANNER_STORAGE_KEY)
  localStorage.removeItem(GLOBAL_STORAGE_KEY)
}
