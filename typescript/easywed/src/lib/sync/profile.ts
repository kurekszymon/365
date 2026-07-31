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
 * Display names for a set of members, keyed by user id. A member who never
 * set one has no row here - callers fall back to their role label.
 *
 * Failure is non-fatal by design: a member list that renders roles instead of
 * names is still useful, so this logs and returns what it has.
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
 * Upsert rather than update: the signup trigger creates the row, but a user
 * who predates it (or was created outside its watch) would otherwise have
 * nothing to update and save silently into the void.
 *
 * `name` is stored trimmed, or null to clear it - the DB CHECK rejects
 * untrimmed and empty strings, so normalizing here keeps the two in step.
 */
export const saveDisplayName = async (
  userId: string,
  name: string | null
): Promise<{ value: string | null; error: string | null }> => {
  const trimmed = name?.trim()
  const value = trimmed ? trimmed : null

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, display_name: value })

  if (error) {
    console.error("[profile] saveDisplayName failed", error)
    return { value: null, error: error.message }
  }

  return { value, error: null }
}
