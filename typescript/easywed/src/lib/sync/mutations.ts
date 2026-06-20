import { toast } from "sonner"
import type {
  Fixture,
  FixtureShape,
  Geometry,
  Guest,
  HallPreset,
  Seat,
  Table,
  TableRotation,
  TableShape,
} from "@/stores/planner.store"
import type { Reminder } from "@/stores/reminders.store"
import type { Json } from "@/lib/supabase.types"
import { supabase } from "@/lib/supabase"
import i18n from "@/i18n"
import { useGlobalStore } from "@/stores/global.store"

// Geometry's typed shape (object with `vertices` and `closed`) is structurally
// compatible with `Json` at runtime, but TS rejects the assignment because the
// supabase-generated `Json` type requires an index signature. This helper
// localizes the cast so every mutation site doesn't repeat `as unknown as Json`.
const toJsonOrNull = (g: Geometry | null | undefined): Json | null =>
  g ? (g as unknown as Json) : null

const getWeddingId = (): string | null => {
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
const run = async <T extends { error: unknown }>(
  label: string,
  query: PromiseLike<T>
): Promise<boolean> => {
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
const tableRow = (t: Table) => ({
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

const fixtureRow = (f: Fixture) => ({
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
const withGeometry = <T extends { geometry?: Geometry | null }>(fields: T) => {
  const { geometry, ...rest } = fields
  return geometry === undefined
    ? rest
    : { ...rest, geometry: toJsonOrNull(geometry) }
}

// Position-only and soft-delete writes are identical across tables/fixtures, so
// they're parameterized by table name; the named exports below are thin wrappers.
const updatePos = (
  table: "tables" | "fixtures",
  id: string,
  x: number,
  y: number
): Promise<boolean> =>
  run(
    `updatePos:${table}`,
    supabase.from(table).update({ pos_x: x, pos_y: y }).eq("id", id)
  )

const markDeleted = (
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

export const updateWedding = (updates: {
  name?: string
  date?: string | null
}): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "updateWedding",
    supabase.from("weddings").update(updates).eq("id", weddingId)
  )
}

export const upsertHall = (
  preset: HallPreset,
  width: number,
  height: number
): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "upsertHall",
    supabase
      .from("halls")
      .upsert(
        { wedding_id: weddingId, preset, width, height },
        { onConflict: "wedding_id" }
      )
  )
}

export const insertTable = (table: Table): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "insertTable",
    supabase
      .from("tables")
      .insert({ ...tableRow(table), wedding_id: weddingId })
  )
}

export const insertTables = (tables: Array<Table>): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId || tables.length === 0) return Promise.resolve(false)
  const rows = tables.map((t) => ({ ...tableRow(t), wedding_id: weddingId }))
  return run("insertTables", supabase.from("tables").insert(rows))
}

export const updateTableRow = (
  id: string,
  fields: {
    name?: string
    shape?: TableShape
    capacity?: number
    width?: number
    height?: number
    rotation?: TableRotation
    geometry?: Geometry | null
  }
): Promise<boolean> =>
  run(
    "updateTableRow",
    supabase.from("tables").update(withGeometry(fields)).eq("id", id)
  )

export const updateTablePos = (
  id: string,
  x: number,
  y: number
): Promise<boolean> => updatePos("tables", id, x, y)

export const updateTableSeats = (
  id: string,
  seats: Array<Seat>
): Promise<boolean> =>
  run(
    "updateTableSeats",
    supabase
      .from("tables")
      .update({ seats: seats as unknown as Json })
      .eq("id", id)
  )

export const softDeleteTable = async (id: string): Promise<boolean> => {
  // Unassign this table's guests first (best-effort), then mark it deleted.
  await run(
    "softDeleteTable unassign",
    supabase.from("guests").update({ table_id: null }).eq("table_id", id)
  )
  return markDeleted("tables", id)
}

export const insertGuest = (guest: Guest): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "insertGuest",
    supabase.from("guests").insert({
      id: guest.id,
      wedding_id: weddingId,
      name: guest.name,
      dietary: guest.dietary,
      note: guest.note ?? null,
      table_id: guest.tableId,
    })
  )
}

// Batch-inserts many guests in a single round-trip. Used by the CSV/XLSX
// import, which builds the whole list locally before persisting it at once.
export const insertGuests = (guests: Array<Guest>): Promise<boolean> => {
  if (guests.length === 0) return Promise.resolve(true)
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "insertGuests",
    supabase.from("guests").insert(
      guests.map((guest) => ({
        id: guest.id,
        wedding_id: weddingId,
        name: guest.name,
        dietary: guest.dietary,
        note: guest.note ?? null,
        table_id: guest.tableId,
      }))
    )
  )
}

// Pins (or clears) a guest's specific seat. Writes table_id alongside seat_id so
// seating and unseating stay consistent in one round-trip. Also the single path
// for plain table (re)assignment — seat_id must move with table_id, since the
// index-based seat ids aren't table-specific and a stale value would mis-pin.
export const updateGuestSeat = (
  guestId: string,
  tableId: string | null,
  seatId: string | null
): Promise<boolean> =>
  run(
    "updateGuestSeat",
    supabase
      .from("guests")
      .update({ table_id: tableId, seat_id: seatId })
      .eq("id", guestId)
  )

export const reassignTableGuests = async (
  tableId: string,
  guestIds: Array<string>
): Promise<boolean> => {
  // Clear seat_id alongside table_id in both steps: seat ids are index-based and
  // not table-specific, so a guest removed from (or moved into) this table must
  // not keep a stale pin that would re-seat them at the wrong table on reload.
  // Callers that want to preserve specific pins (saveTable) re-persist seatIds
  // per guest after this resolves.
  const cleared = await run(
    "reassignTableGuests unassign",
    supabase
      .from("guests")
      .update({ table_id: null, seat_id: null })
      .eq("table_id", tableId)
  )
  if (guestIds.length === 0) return cleared
  const assigned = await run(
    "reassignTableGuests assign",
    supabase
      .from("guests")
      .update({ table_id: tableId, seat_id: null })
      .in("id", guestIds)
  )
  return cleared && assigned
}

export const insertReminder = (reminder: Reminder): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "insertReminder",
    supabase.from("reminders").insert({
      id: reminder.uuid,
      wedding_id: weddingId,
      text: reminder.text,
      due: reminder.due ? reminder.due.toISOString() : null,
      status: reminder.status,
    })
  )
}

export const updateReminderStatus = (
  uuid: string,
  status: Reminder["status"]
): Promise<boolean> =>
  run(
    "updateReminderStatus",
    supabase.from("reminders").update({ status }).eq("id", uuid)
  )

// Atomic counterpart to per-row inserts: replaces the entire planner layout
// for a wedding in a single transaction via the `replace_planner_layout` RPC.
// Used by the DXF import wizard once the user confirms the preview.
export const replacePlannerLayout = (
  hall: { preset: HallPreset; width: number; height: number },
  tables: Array<Table>,
  fixtures: Array<Fixture>
): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "replacePlannerLayout",
    supabase.rpc("replace_planner_layout", {
      p_wedding_id: weddingId,
      p_hall_preset: hall.preset,
      p_hall_width: hall.width,
      p_hall_height: hall.height,
      p_tables: tables.map(tableRow) as unknown as Json,
      p_fixtures: fixtures.map(fixtureRow) as unknown as Json,
    })
  )
}

export const insertFixture = (fixture: Fixture): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "insertFixture",
    supabase
      .from("fixtures")
      .insert({ ...fixtureRow(fixture), wedding_id: weddingId })
  )
}

export const updateFixtureRow = (
  id: string,
  fields: {
    name?: string
    shape?: FixtureShape
    width?: number
    height?: number
    rotation?: TableRotation
    geometry?: Geometry | null
  }
): Promise<boolean> =>
  run(
    "updateFixtureRow",
    supabase.from("fixtures").update(withGeometry(fields)).eq("id", id)
  )

export const updateFixturePos = (
  id: string,
  x: number,
  y: number
): Promise<boolean> => updatePos("fixtures", id, x, y)

export const softDeleteFixture = (id: string): Promise<boolean> =>
  markDeleted("fixtures", id)
