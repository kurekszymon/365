import {
  isAuthRetryableFetchError,
  isAuthWeakPasswordError,
} from "@supabase/supabase-js"

/**
 * Maps a Supabase auth failure to a translation key.
 *
 * Supabase returns its messages in English only, so rendering `error.message`
 * puts "Invalid login credentials" in front of a Polish user on the busiest
 * screen we have. Every branch here returns a key instead; the raw message is
 * never shown, only logged by the caller.
 *
 * Only codes the four auth screens (login, signup, forgot-password,
 * reset-password) can actually produce are mapped - anything else falls back to
 * `auth.error.unknown` rather than leaking English through.
 *
 * Codes and their meanings are from
 * https://supabase.com/docs/guides/auth/debugging/error-codes, which is also
 * where the rule to branch on `error.code` rather than match on the message
 * text comes from - the messages are explicitly not stable.
 */
export const authErrorKey = (err: unknown): string => {
  // Thrown before any response came back - offline, DNS, CORS, aborted fetch.
  // Checked first: these carry no code at all.
  if (isAuthRetryableFetchError(err)) return "auth.error.network"

  // Reasons come from the server's own password policy, so we phrase them
  // without repeating the numbers in config.toml - those would drift.
  if (isAuthWeakPasswordError(err)) {
    if (err.reasons.includes("pwned")) return "auth.error.weak_password_pwned"
    if (err.reasons.includes("length")) return "auth.error.weak_password_length"
    if (err.reasons.includes("characters"))
      return "auth.error.weak_password_characters"
    return "auth.error.weak_password"
  }

  const code = errorCode(err)

  switch (code) {
    // Sign in
    case "invalid_credentials":
      return "auth.error.invalid_credentials"
    case "email_not_confirmed":
      return "auth.error.email_not_confirmed"
    case "user_banned":
      return "auth.error.user_banned"
    // Deliberately no `user_not_found` branch. Supabase answers a wrong
    // password with `invalid_credentials` and an unknown reset address with
    // success, both to avoid account enumeration; translating "no such user"
    // here would hand that back on /forgot-password. It falls through to the
    // generic message below.

    // Sign up
    case "user_already_exists":
    case "email_exists":
      return "auth.error.email_exists"
    case "signup_disabled":
    case "email_provider_disabled":
      return "auth.error.signup_disabled"
    case "email_address_invalid":
      return "auth.error.email_invalid"
    case "email_address_not_authorized":
      return "auth.error.email_not_authorized"
    // "Parameters are not in the expected format" - the docs scope this to no
    // particular field, and on /reset-password the offending parameter is the
    // password, not the email. Hence a field-neutral message.
    case "validation_failed":
      return "auth.error.validation_failed"

    // Set a new password
    case "same_password":
      return "auth.error.same_password"
    case "weak_password":
      // The dedicated error class above carries `reasons`; this is the same
      // failure arriving as a plain AuthApiError, with nothing to narrow on.
      return "auth.error.weak_password"

    // The recovery session died between landing on the page and submitting.
    case "session_expired":
    case "session_not_found":
    case "bad_jwt":
      return "auth.error.session_expired"
    // Not an expired session: the server wants the password change confirmed
    // out of band ("secure password change"). A recovery session normally
    // satisfies that, so this is a corner - but "your session expired" would
    // misdescribe it, and the fix is a fresh link either way.
    case "reauthentication_needed":
      return "auth.error.reauthentication_needed"

    // Rate limits. Split, because "wait a minute" and "we already emailed you"
    // are different things to do next.
    case "over_email_send_rate_limit":
      return "auth.error.over_email_send_rate_limit"
    case "over_request_rate_limit":
      return "auth.error.over_request_rate_limit"

    // Google sign-in
    case "provider_disabled":
    case "oauth_provider_not_supported":
      return "auth.error.provider_disabled"
    case "bad_oauth_state":
    case "bad_oauth_callback":
    case "flow_state_not_found":
    case "flow_state_expired":
      return "auth.error.oauth_failed"
    case "provider_email_needs_verification":
      return "auth.error.email_not_confirmed"

    case "request_timeout":
      return "auth.error.network"

    default:
      return "auth.error.unknown"
  }
}

/**
 * `isAuthError` only recognises errors built by auth-js itself. Supabase also
 * hands back plain objects with a `code` in some paths (and our own callers may
 * pass anything through), so read the field structurally instead.
 */
const errorCode = (err: unknown): string | undefined => {
  if (typeof err !== "object" || err === null) return undefined
  const code = (err as { code?: unknown }).code
  return typeof code === "string" ? code : undefined
}
