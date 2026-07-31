import { supabase } from "@/lib/supabase"

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

  return { error: null }
}

/**
 * Give up your own access to someone else's wedding. Removes only the
 * membership row - the plan itself and everyone else's access are untouched.
 * Owners can't use this (see migration 20260731000003); they delete the
 * wedding instead.
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

  return { error: null }
}
