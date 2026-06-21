import { supabase } from "@/lib/supabase"
import { getWeddingId, run } from "@/lib/sync/mutations/shared"

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
