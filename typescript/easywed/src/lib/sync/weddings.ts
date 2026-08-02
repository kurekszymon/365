import { supabase } from "@/lib/supabase"
import { useGlobalStore } from "@/stores/global.store"

/**
 * Drop the loaded wedding from the global store if it's the one that just went
 * away. Mutations scope their inserts with getWeddingId(), so an id that
 * outlives its row would have them writing at a wedding that no longer exists.
 */
const forgetIfCurrent = (weddingId: string) => {
  useGlobalStore.setState((state) =>
    state.weddingId === weddingId
      ? {
          weddingId: undefined,
          name: undefined,
          date: undefined,
          role: undefined,
          members: [],
        }
      : state
  )
}

/**
 * Hard delete, unlike the soft-deleted tables and guests inside it. Cascades
 * through halls, tables, guests, reminders, invitations and memberships - for
 * everyone who had access, not just the owner. Owner-only at the DB level
 * ("owners can delete weddings").
 */
export const deleteWedding = async (
  weddingId: string
): Promise<{ error: string | null }> => {
  // `.select()` is load-bearing, not decoration. A DELETE whose rows are all
  // filtered out by RLS is not an error to PostgREST - it answers 204 with no
  // body, which supabase-js reports as { data: null, error: null }. Without
  // asking for the deleted rows back we'd read "you aren't the owner" as
  // success and tell the user their wedding is gone while it sits there.
  const { data, error } = await supabase
    .from("weddings")
    .delete()
    .eq("id", weddingId)
    .select("id")

  if (error) {
    console.error("[weddings] deleteWedding failed", error)
    return { error: error.message }
  }

  if (data.length === 0) {
    console.error("[weddings] deleteWedding matched no rows", { weddingId })
    return { error: "not_deleted" }
  }

  forgetIfCurrent(weddingId)
  return { error: null }
}

/**
 * Give up your own access to someone else's wedding. Removes only the
 * membership row - the plan itself and everyone else's access are untouched.
 * Owners can't use this (see migration 20260731000003); they delete the
 * wedding instead.
 *
 * Deliberately leaves the wedding_invitations row that brought them in: DELETE
 * on that table is owner-only ("owners delete invites"), so a leaving member
 * has no way to clear it, and the owner keeps an accurate record that the link
 * was used. Consequence: after someone leaves, the owner's invitation list
 * still shows a claimed invite naming them. Re-inviting means issuing a new
 * link - the old one is spent either way. Cleaning this up properly needs a DB
 * change (a trigger on membership delete), not a client-side one.
 */
export const leaveWedding = async (
  weddingId: string,
  userId: string
): Promise<{ error: string | null }> => {
  const { data, error } = await supabase
    .from("wedding_members")
    .delete()
    .eq("wedding_id", weddingId)
    .eq("user_id", userId)
    .select("user_id")

  if (error) {
    console.error("[weddings] leaveWedding failed", error)
    return { error: error.message }
  }

  // Same 0-rows-is-not-an-error trap as deleteWedding. The policy here is
  // `user_id = auth.uid() and role <> 'owner'`, so an owner who somehow
  // reached this would silently delete nothing and be told they'd left.
  if (data.length === 0) {
    console.error("[weddings] leaveWedding matched no rows", {
      weddingId,
      userId,
    })
    return { error: "not_left" }
  }

  forgetIfCurrent(weddingId)
  return { error: null }
}
