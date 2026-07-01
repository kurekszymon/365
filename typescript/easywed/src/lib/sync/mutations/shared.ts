import { toast } from "sonner"
import type { Fixture, Geometry, Table } from "@/stores/planner.store"
import type { Json } from "@/lib/supabase.types"
import { supabase } from "@/lib/supabase"
import i18n from "@/i18n"
import { useGlobalStore } from "@/stores/global.store"
import { isLocalWedding } from "@/lib/localWedding"

// Geometry's typed shape (object with `vertices` and `closed`) is structurally
// compatible with `Json` at runtime, but TS rejects the assignment because the
// supabase-generated `Json` type requires an index signature. This helper
// localizes the cast so every mutation site doesn't repeat `as unknown as Json`.
export const toJsonOrNull = (g: Geometry | null | undefined): Json | null =>
  g ? (g as unknown as Json) : null

export const getWeddingId = (): string | null => {
  const id = useGlobalStore.getState().weddingId
  if (!id) {
    console.warn("[sync] no wedding loaded; skipping mutation")
    return null
  }
  return id
}

// Surfaces sync failures to the user. There's no rollback layer, so optimistic
// state can diverge from the DB on error — the toast at least tells the user
// their change may not have saved. A fixed toast id collapses a burst of failed
// mutations (e.g. chained writes) into a single toast instead of spamming.
const log = (label: string, error: unknown) => {
  console.error(`[sync] ${label}`, error)
  toast.error(i18n.t("sync.save_failed"), { id: "sync-error" })
}

// Runs a Supabase write, logs + toasts on failure, and reports success as a
// boolean. Every mutation funnels through this so they share one contract:
// `true` = persisted, `false` = failed (or skipped). Callers can chain on `ok`.
// The try/catch matters: most callers do `void mutation(...)`, so a *rejected*
// promise (aborted fetch, network drop, thrown error) would otherwise become an
// unhandled rejection that never surfaces. Catching it keeps the contract — any
// failure, returned-as-error or thrown, becomes a toast + `false`.
export const run = async <T extends { error: unknown }>(
  label: string,
  query: PromiseLike<T>
): Promise<boolean> => {
  // Guests plan against a device-local wedding with no Supabase row behind
  // it. `query` is a lazy Postgrest thenable, so returning before it's
  // awaited means no request is ever sent — every mutation funnels through
  // here, so this single check covers row-scoped mutations that never call
  // getWeddingId() too (position/seat/soft-delete writes).
  if (isLocalWedding(useGlobalStore.getState().weddingId)) return false
  try {
    const { error } = await query
    if (error) {
      log(label, error)
      return false
    }
    return true
  } catch (error) {
    log(label, error)
    return false
  }
}

// Maps a store Table/Fixture to its DB row (sans wedding_id, which inserts add
// and the layout RPC supplies separately). Shared by the insert paths and the
// `replace_planner_layout` payload so the field mapping lives in one place.
export const tableRow = (t: Table) => ({
  id: t.id,
  name: t.name,
  shape: t.shape,
  capacity: t.capacity,
  width: t.size.width,
  height: t.size.height,
  rotation: t.rotation,
  pos_x: t.position.x,
  pos_y: t.position.y,
  geometry: toJsonOrNull(t.geometry),
  seats: (t.seats ?? []) as unknown as Json,
})

export const fixtureRow = (f: Fixture) => ({
  id: f.id,
  name: f.name,
  shape: f.shape,
  width: f.size.width,
  height: f.size.height,
  rotation: f.rotation,
  pos_x: f.position.x,
  pos_y: f.position.y,
  geometry: toJsonOrNull(f.geometry),
})

// Normalizes a partial update's `geometry`: omit it when undefined (leave the
// column untouched), otherwise cast through the Json escape hatch. Shared by the
// table and fixture row updates, which are otherwise identical.
export const withGeometry = <T extends { geometry?: Geometry | null }>(
  fields: T
) => {
  const { geometry, ...rest } = fields
  return geometry === undefined
    ? rest
    : { ...rest, geometry: toJsonOrNull(geometry) }
}

// Position-only and soft-delete writes are identical across tables/fixtures, so
// they're parameterized by table name; the named exports below are thin wrappers.
export const updatePos = (
  table: "tables" | "fixtures",
  id: string,
  x: number,
  y: number
): Promise<boolean> =>
  run(
    `updatePos:${table}`,
    supabase.from(table).update({ pos_x: x, pos_y: y }).eq("id", id)
  )

export const markDeleted = (
  table: "tables" | "fixtures",
  id: string
): Promise<boolean> =>
  run(
    `softDelete:${table}`,
    supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
  )
