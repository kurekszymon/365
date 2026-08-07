import { supabase } from "@/lib/supabase"
import { TERMS_VERSION } from "@/lib/legal/dates"

// Which version of the Regulamin the user ticked the box for, held across an
// OAuth round trip. Email sign-up doesn't need this - it passes the version in
// the signUp() metadata and handle_new_user writes it server-side - but
// signInWithOAuth takes no user metadata, so for Google the acceptance has to
// survive a redirect to a different origin and back.
const PENDING_KEY = "easywed.terms.pending"

// Same treatment as guest-mode storage: unavailable or throwing localStorage
// (SSR, privacy mode, blocked storage) degrades to a no-op.
const safeGetItem = (key: string): string | null => {
  if (typeof localStorage === "undefined") return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const safeSetItem = (key: string, value: string): void => {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage blocked/full. The acceptance still happened - it just won't be
    // recorded for an OAuth user whose browser refuses to hold it.
  }
}

const safeRemoveItem = (key: string): void => {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.removeItem(key)
  } catch {
    // see safeSetItem
  }
}

/** Called when the sign-up form is submitted, before either provider takes over. */
export const rememberAcceptedTerms = (): void => {
  safeSetItem(PENDING_KEY, TERMS_VERSION)
}

/**
 * Writes a pending acceptance to the user's profile, once they have a session.
 *
 * Only ever fills a blank: an existing `terms_version` is left alone, so this
 * cannot overwrite what handle_new_user already recorded at sign-up, and a
 * returning user signing in on a device that still holds a pending marker
 * doesn't get a fresh (and wrong) acceptance timestamp. The timestamp itself is
 * the trigger's to set - the client never sends one.
 *
 * Failure is non-fatal and deliberately not surfaced: the user is signed in and
 * mid-flow, and there is nothing useful for them to do about it. The marker is
 * kept on failure so the next authenticated render retries.
 */
export const recordPendingTermsAcceptance = async (
  userId: string
): Promise<void> => {
  const pending = safeGetItem(PENDING_KEY)
  if (!pending) return

  const { data, error } = await supabase
    .from("profiles")
    .select("terms_version")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    console.error("[terms] reading acceptance failed", error)
    return
  }

  if (data?.terms_version) {
    safeRemoveItem(PENDING_KEY)
    return
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ terms_version: pending })
    .eq("id", userId)

  if (updateError) {
    console.error("[terms] recording acceptance failed", updateError)
    return
  }

  safeRemoveItem(PENDING_KEY)
}

/**
 * Whether this user still owes us an acceptance before they can use the app.
 *
 * "outstanding" is deliberately narrower than "terms_version is null". Accounts
 * that predate the Regulamin accepted nothing *because there was nothing to
 * accept*, and 20260806000002 records the decision not to backfill them: § 16
 * ust. 2 (notify by email, 14 days to object) is their route, not a wall in
 * front of the app. So the cut-off is the document's own effective date - a
 * profile created on or after it was created under a regime that required
 * acceptance, and a blank column there means the acceptance genuinely went
 * missing (a Google sign-in from the login form, or a blocked localStorage on
 * the sign-up one).
 *
 * Fails open, logged. A read that errors - or the anomalous missing profile
 * row - locks the user out of their own account if treated as outstanding, and
 * that is a worse failure than one unrecorded acceptance: the row is not
 * client-deletable (profiles has no DELETE policy), so this is never something
 * a user can arrange for themselves.
 */
export const fetchTermsStatus = async (
  userId: string
): Promise<"accepted" | "outstanding"> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("terms_version, created_at")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    console.error("[terms] reading status failed", error)
    return "accepted"
  }

  if (!data) return "accepted"
  if (data.terms_version) return "accepted"

  const termsEffective = Date.parse(`${TERMS_VERSION}T00:00:00Z`)
  const profileCreated = Date.parse(data.created_at)

  if (Number.isNaN(profileCreated)) return "accepted"

  return profileCreated < termsEffective ? "accepted" : "outstanding"
}

/**
 * Records an acceptance made at the gate, for a user who arrived without one.
 *
 * Unlike recordPendingTermsAcceptance this is an explicit act happening right
 * now, so it writes unconditionally rather than only filling a blank - the
 * caller has already established the column is empty. The timestamp still
 * belongs to stamp_terms_acceptance(); the client never sends one.
 */
export const acceptTerms = async (
  userId: string
): Promise<{ error: string | null }> => {
  const { error } = await supabase
    .from("profiles")
    .update({ terms_version: TERMS_VERSION })
    .eq("id", userId)

  if (error) {
    console.error("[terms] accepting at gate failed", error)
    return { error: error.message }
  }

  safeRemoveItem(PENDING_KEY)
  return { error: null }
}
