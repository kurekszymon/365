import type {
  Geometry,
  Seat,
  Table,
  TableRotation,
  TableShape,
} from "@/stores/planner.store"
import type { Json } from "@/lib/supabase.types"
import { supabase } from "@/lib/supabase"
import {
  getWeddingId,
  markDeleted,
  run,
  tableRow,
  updatePos,
  withGeometry,
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
