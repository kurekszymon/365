import { supabase } from "@/lib/supabase"
import { seedDefaultHall } from "@/lib/sync/mutations"

/**
 * Creates a cloud wedding owned by the caller and seeds its default hall.
 * Returns the new id, or null if the insert failed (already logged - the
 * caller decides what to tell the user).
 *
 * Shared by the wedding list and the venue invitation page, which both end by
 * navigating into the new wedding. The hall seed is awaited, not
 * fire-and-forget: navigating first would race `loadWedding` against this
 * insert and land the user on the blank canvas the seed exists to prevent. A
 * failed seed is not a failed create - see `seedDefaultHall`.
 *
 * Outside `run()` for `seedDefaultHall`'s reason: global.store has not switched
 * to this wedding yet, so `run()` would read a stale role and drop the write.
 */
export const createWedding = async (
  ownerId: string,
  name: string
): Promise<string | null> => {
  const { data, error } = await supabase
    .from("weddings")
    .insert({ owner_id: ownerId, name, date: null })
    .select("id")
    .single()

  if (error) {
    console.error("[wedding] createWedding failed", error)
    return null
  }

  await seedDefaultHall(data.id)
  return data.id
}
