import { supabase } from "@/lib/supabase"

/**
 * The signed-in user's own profile. Co-members' names are fetched in bulk by
 * loadWedding instead - this is only ever the current user.
 */
export const fetchDisplayName = async (
  userId: string,
  signal?: AbortSignal
): Promise<string | null> => {
  const filter = supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)

  const { data, error } = await (
    signal ? filter.abortSignal(signal) : filter
  ).maybeSingle()

  if (error) {
    console.error("[profile] fetchDisplayName failed", error)
    return null
  }

  return data?.display_name ?? null
}

/**
 * Display names for a set of members, keyed by user id.
 *
 * Every user has a profiles row, so the normal shape for someone who has not
 * chosen a name is a present key mapped to `null`. Callers should treat a
 * missing key the same and fall back to the role label - it is still possible: a
 * row this user cannot read under the SELECT policy, or a partial result.
 *
 * Failure is non-fatal: a member list rendering roles instead of names is still
 * useful, so this logs and returns what it has.
 */
export const fetchDisplayNames = async (
  userIds: Array<string>,
  signal?: AbortSignal
): Promise<Map<string, string | null>> => {
  const names = new Map<string, string | null>()
  if (userIds.length === 0) return names

  const query = supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds)

  const { data, error } = await (signal ? query.abortSignal(signal) : query)

  if (error) {
    console.error("[profile] fetchDisplayNames failed", error)
    return names
  }

  for (const profile of data) {
    names.set(profile.id, profile.display_name)
  }

  return names
}

/**
 * Update first, insert only if there was no row.
 *
 * Deliberately not an upsert: PostgREST builds `on conflict (id) do update set`
 * from every key in the payload, `id` included, so an upsert writing `id` has to
 * satisfy the UPDATE policy's `with check (id = auth.uid())` on top of the
 * insert path. Updating one named column sidesteps the question. (Not because of
 * the migration's `revoke update (id)`, which is a no-op - see docs/supabase.md.)
 *
 * `.select("id")` makes the "no such row" case observable instead of a silent
 * no-op. It should never fire, but a user created outside the signup trigger's
 * watch self-heals through the insert policy.
 *
 * `name` is stored trimmed, or null to clear it - the DB CHECK rejects untrimmed
 * and empty strings, so normalizing here keeps the two in step.
 */
export const saveDisplayName = async (
  userId: string,
  name: string | null
): Promise<{ value: string | null; error: string | null }> => {
  const trimmed = name?.trim()
  const value = trimmed ? trimmed : null

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: value })
    .eq("id", userId)
    .select("id")

  if (error) {
    console.error("[profile] saveDisplayName failed", error)
    return { value: null, error: error.message }
  }

  if (data.length === 0) {
    const { error: insertError } = await supabase
      .from("profiles")
      .insert({ id: userId, display_name: value })

    if (insertError) {
      console.error("[profile] saveDisplayName insert failed", insertError)
      return { value: null, error: insertError.message }
    }
  }

  return { value, error: null }
}
