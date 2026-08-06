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
