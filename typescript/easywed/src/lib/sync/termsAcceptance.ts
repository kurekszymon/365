import { supabase } from "@/lib/supabase"
import { TERMS_ENFORCED_SINCE, TERMS_VERSION } from "@/lib/legal/dates"

// Which version of the Regulamin the user ticked the box for, held across an
// OAuth round trip. Email sign-up doesn't need this - it passes the version in
// the signUp() metadata and handle_new_user writes it server-side - but
// signInWithOAuth takes no user metadata, so for Google the acceptance has to
// survive a redirect to a different origin and back.
const PENDING_KEY = "easywed.terms.pending"

// A marker is only good for the redirect it was written for.
//
// Without this it outlives the sign-up that created it, and localStorage is per
// browser, not per person: someone ticks the box, abandons the sign-up (never
// confirms the email), and the next person to use that browser signs in with
// Google from /login - a form with no checkbox, which happily creates a brand
// new account. That account has a blank terms_version, so the stale marker
// fills it in, and the app records an acceptance from someone who was never
// shown the document. A Google round trip takes seconds; ten minutes is slack
// for a slow consent screen, not for a different user on another day.
const PENDING_TTL_MS = 10 * 60 * 1000

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

export const rememberAcceptedTerms = (): void => {
  safeSetItem(PENDING_KEY, `${TERMS_VERSION}|${Date.now()}`)
}

/**
 * Drops a pending marker without acting on it.
 *
 * Called when the login form mounts: arriving there means whatever sign-up
 * wrote the marker was abandoned rather than completed, and the OAuth round
 * trip that legitimately needs one never passes through /login.
 */
export const forgetPendingTermsAcceptance = (): void => {
  safeRemoveItem(PENDING_KEY)
}

/**
 * The pending version, or null if there isn't one or it has gone stale.
 *
 * Anything unreadable is treated as stale and dropped - including a marker in
 * the pre-TTL format, which carries no timestamp to judge. Failing towards "no
 * pending acceptance" costs at worst a trip through the gate, where the user
 * ticks the box again; failing the other way records a consent nobody gave.
 */
const readPendingTermsAcceptance = (): string | null => {
  const raw = safeGetItem(PENDING_KEY)
  if (!raw) return null

  const separator = raw.lastIndexOf("|")
  const version = raw.slice(0, separator)
  const storedAt = Number(raw.slice(separator + 1))

  const isUsable =
    separator > 0 &&
    Number.isFinite(storedAt) &&
    Date.now() - storedAt <= PENDING_TTL_MS

  if (!isUsable) {
    safeRemoveItem(PENDING_KEY)
    return null
  }

  return version
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
  const pending = readPendingTermsAcceptance()
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
 * front of the app. So the cut-off is the date the gate started running - a
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

  const enforcedSince = Date.parse(`${TERMS_ENFORCED_SINCE}T00:00:00Z`)
  const profileCreated = Date.parse(data.created_at)

  if (Number.isNaN(profileCreated)) return "accepted"

  return profileCreated < enforcedSince ? "accepted" : "outstanding"
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
