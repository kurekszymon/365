import type { Hall, HallPreset } from "@/stores/planner.store"
import { supabase } from "@/lib/supabase"
import { getWeddingId, hallRow, run } from "@/lib/sync/mutations/shared"

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
  }
): Promise<boolean> =>
  run("updateHallRow", supabase.from("halls").update(fields).eq("id", id))

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
