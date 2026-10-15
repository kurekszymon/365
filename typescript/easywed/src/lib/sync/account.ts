import { supabase } from "@/lib/supabase"

export type SharedWedding = {
  id: string
  name: string
  otherMembers: number
}

export type OwnedWeddingRow = {
  id: string
  name: string
  wedding_members: Array<{ user_id: string }>
}

/**
 * Which of the user's owned weddings block deletion, and by how many people.
 *
 * Split out from the query because it is the whole decision: get the "who else
 * is here" count wrong and we either refuse a deletion we owe the user, or
 * cascade someone else's wedding out from under them. The owner is always a
 * member of their own wedding, so they come out of the count - a solo wedding
 * has one member, not zero.
 */
export const toBlockingWeddings = (
  rows: Array<OwnedWeddingRow>,
  userId: string
): Array<SharedWedding> =>
  rows
    .map((wedding) => ({
      id: wedding.id,
      name: wedding.name,
      otherMembers: wedding.wedding_members.filter(
        (member) => member.user_id !== userId
      ).length,
    }))
    .filter((wedding) => wedding.otherMembers > 0)

/**
 * Weddings the user owns that someone else can also reach. These block account
 * deletion: weddings.owner_id cascades, so deleting the account would take the
 * whole plan - halls, tables, guests - away from the co-members too.
 *
 * The RPC enforces this server-side; this query exists so the UI can say
 * *which* weddings are in the way instead of just refusing.
 */
export const fetchSharedOwnedWeddings = async (
  userId: string,
  signal?: AbortSignal
): Promise<Array<SharedWedding>> => {
  const filter = supabase
    .from("weddings")
    .select("id, name, wedding_members(user_id)")
    .eq("owner_id", userId)

  const { data, error } = await (signal ? filter.abortSignal(signal) : filter)

  if (error) {
    console.error("[account] fetchSharedOwnedWeddings failed", error)
    throw error
  }

  return toBlockingWeddings(data, userId)
}

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; reason: "shared_weddings" | "unknown" }

/**
 * Irreversible. Cascades away the user's profile, memberships and any wedding
 * they solely own; invitations they claimed keep their audit row with
 * claimed_by nulled.
 */
export const deleteOwnAccount = async (): Promise<DeleteAccountResult> => {
  const { error } = await supabase.rpc("delete_own_account")

  if (!error) return { ok: true }

  console.error("[account] deleteOwnAccount failed", error)

  // `account_has_shared_weddings` is the server's copy of the check the UI ran
  // before offering the button, and the only failure the dialog can do anything
  // useful about. The other sentinels stay `unknown` on purpose - they leave the
  // user nothing to act on, and what matters is that they land here rather than
  // on the success path, which signs the user out claiming the account is gone.
  //
  // Both halves of the match are load-bearing. P0001 is the generic
  // `raise_exception` code all of those carry, so the code alone cannot tell
  // them apart; and the sentinel is matched with `includes` because PostgREST
  // owns the framing of `message`, so a prefix it adds later would break `===`.
  return {
    ok: false,
    reason:
      error.code === "P0001" &&
      error.message.includes("account_has_shared_weddings")
        ? "shared_weddings"
        : "unknown",
  }
}
