import type { Geometry, Hall, HallPreset } from "@/stores/planner.store"
import { supabase } from "@/lib/supabase"
import { DEFAULT_HALL } from "@/stores/planner.store"
import {
  getWeddingId,
  hallRow,
  run,
  withGeometry,
} from "@/lib/sync/mutations/shared"

/**
 * Gives a brand-new wedding the hall it opens with, so the planner is never a
 * blank canvas on first run - the user lands on a room they can drop a table
 * into instead of an empty grid.
 *
 * Deliberately outside `run()`, the one exception in this folder: it fires
 * from the wedding list, *before* global.store has switched to the new
 * wedding, so `run()` would read a stale (or undefined) role, fail closed on
 * selectCanEdit and silently drop the write. It also takes `weddingId`
 * explicitly for the same reason - `getWeddingId()` isn't pointing here yet.
 *
 * Failure is non-fatal: the canvas empty state still offers the very same
 * default hall on click, so this logs instead of toasting.
 */
export const seedDefaultHall = async (weddingId: string): Promise<boolean> => {
  const hall: Hall = {
    ...DEFAULT_HALL,
    id: crypto.randomUUID(),
    position: { x: 0, y: 0 },
  }
  const { error } = await supabase
    .from("halls")
    .insert({ ...hallRow(hall), wedding_id: weddingId })
  if (error) {
    console.error("seedDefaultHall", error)
    return false
  }
  return true
}

export const insertHall = (hall: Hall): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "insertHall",
    supabase.from("halls").insert({ ...hallRow(hall), wedding_id: weddingId })
  )
}

export const updateHallRow = (
  id: string,
  fields: {
    name?: string
    floor?: number | null
    preset?: HallPreset
    width?: number
    height?: number
    pos_x?: number
    pos_y?: number
    geometry?: Geometry | null
  }
): Promise<boolean> =>
  run(
    "updateHallRow",
    supabase.from("halls").update(withGeometry(fields)).eq("id", id)
  )

export const updateHallPos = (
  id: string,
  x: number,
  y: number
): Promise<boolean> =>
  run(
    "updateHallPos",
    supabase.from("halls").update({ pos_x: x, pos_y: y }).eq("id", id)
  )

export const deleteHallRow = (id: string): Promise<boolean> =>
  run("deleteHallRow", supabase.from("halls").delete().eq("id", id))
