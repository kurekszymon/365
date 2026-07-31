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
  const { error } = await supabase.from("weddings").delete().eq("id", weddingId)

  if (error) {
    console.error("[weddings] deleteWedding failed", error)
    return { error: error.message }
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
  const { error } = await supabase
    .from("wedding_members")
    .delete()
    .eq("wedding_id", weddingId)
    .eq("user_id", userId)

  if (error) {
    console.error("[weddings] leaveWedding failed", error)
    return { error: error.message }
  }

  forgetIfCurrent(weddingId)
  return { error: null }
}
