import type { HallPreset } from "@/stores/planner.store"
import { supabase } from "@/lib/supabase"
import { getWeddingId, run } from "@/lib/sync/mutations/shared"

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
