import type { Seat, Table } from "@/stores/planner.store"
import type { Json } from "@/lib/supabase.types"
import { supabase } from "@/lib/supabase"
import {
  getWeddingId,
  markDeleted,
  markDeletedMany,
  run,
  tableRow,
  toJsonOrNull,
  updatePos,
} from "@/lib/sync/mutations/shared"

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

// Empty list is a no-op success, matching insertGuests/insertReminders/
// markDeletedMany: `false` is this module's "the write failed" signal, and
// callers that branch on it must not read "nothing to insert" as a failure.
export const insertTables = (tables: Array<Table>): Promise<boolean> => {
  if (tables.length === 0) return Promise.resolve(true)
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  const rows = tables.map((t) => ({ ...tableRow(t), wedding_id: weddingId }))
  return run("insertTables", supabase.from("tables").insert(rows))
}

/**
 * Persists a whole table edit - attributes, seat overrides, and the roster with
 * each guest's pin - as one transaction.
 *
 * Deliberately not a sequence of separate writes, which is what this replaced.
 * The two capacity triggers want opposite orderings: `enforce_table_capacity`
 * checks an arriving guest against the capacity already in the DB, so a growth
 * has to write capacity first, while `enforce_table_capacity_floor` checks a
 * shrink against the roster already in the DB, so a shrink has to write the
 * departures first. No fixed client-side order satisfies both, and the old one
 * also left a window where the guests had been cleared off the table but the
 * re-assign hadn't landed - a failure there unseated the whole table while the
 * store still showed everyone in place. See the save_table migration.
 */
export const saveTableRow = (
  table: Table,
  roster: Array<{ id: string; seatId: string | null }>
): Promise<boolean> =>
  run(
    "saveTableRow",
    supabase.rpc("save_table", {
      p_table_id: table.id,
      p_name: table.name,
      p_shape: table.shape,
      p_capacity: table.capacity,
      p_width: table.size.width,
      p_height: table.size.height,
      p_rotation: table.rotation,
      p_geometry: toJsonOrNull(table.geometry),
      p_seats: (table.seats ?? []) as unknown as Json,
      p_guests: roster.map((g) => ({
        id: g.id,
        seat_id: g.seatId,
      })) as unknown as Json,
    })
  )

export const updateTablePos = (
  id: string,
  x: number,
  y: number,
  hallId?: string
): Promise<boolean> => updatePos("tables", id, x, y, hallId)

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
  // Clear seat_id alongside table_id: the guests_seat_requires_table CHECK
  // forbids a non-null seat_id without a table_id, so dropping table_id while
  // leaving a pin would make the whole update fail once seats are assigned.
  await run(
    "softDeleteTable unassign",
    supabase
      .from("guests")
      .update({ table_id: null, seat_id: null })
      .eq("table_id", id)
  )
  return markDeleted("tables", id)
}

// Bulk counterpart to softDeleteTable for wiping a hall's tables (deleteHall):
// one guest-unassign and one soft-delete covering every id, instead of two
// writes per table. Same seat_id/table_id clearing rationale as above.
export const softDeleteTables = async (
  ids: Array<string>
): Promise<boolean> => {
  if (ids.length === 0) return true
  await run(
    "softDeleteTables unassign",
    supabase
      .from("guests")
      .update({ table_id: null, seat_id: null })
      .in("table_id", ids)
  )
  return markDeletedMany("tables", ids)
}
