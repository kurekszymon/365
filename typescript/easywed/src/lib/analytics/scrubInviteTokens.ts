import type { BeforeSendFn, CaptureResult } from "posthog-js"

// The claim URL carries the invite token as a path segment (/invite/<token>),
// and that token is a bearer credential: claim_wedding_invitation grants
// wedding membership to whoever presents it, with no email binding and no
// second factor. PostHog captures the current URL on every pageview, so without
// this the live token lands in the analytics event store - and again in
// $referrer on the very next navigation.
//
// The segment is replaced rather than the event dropped, so an invite open
// stays countable while the recorded URL is worthless to anyone reading events.
const INVITE_TOKEN = /(\/invite\/)[^/?#]+/g

export const redactInviteToken = (value: string): string =>
  value.replace(INVITE_TOKEN, "$1<redacted>")

// The other credential that arrives in a URL: Supabase hands the session back
// through the address bar on the pages it redirects to. The client runs the
// implicit flow, so /reset-password lands as
// #access_token=...&refresh_token=...&type=recovery, and /auth/callback the
// same after a Google sign-in; the ?code= form is covered too in case flowType
// ever moves to PKCE. A recovery token is an account takeover for whoever can
// read it, and it would otherwise sit in $current_url, then in $referrer on the
// navigation to /home straight after.
//
// Matched on the delimiter so a query key that merely ends in "code" doesn't
// hit, and stopped at & or # so only the value is replaced.
const AUTH_CREDENTIAL = /([?#&](?:code|access_token|refresh_token)=)[^&#]*/g

export const redactAuthCredential = (value: string): string =>
  value.replace(AUTH_CREDENTIAL, "$1<redacted>")

const redactSecrets = (value: string): string =>
  redactAuthCredential(redactInviteToken(value))

// Deliberately keyed on the value rather than a list of property names.
// PostHog derives its person properties by prefixing - $initial_current_url is
// built from $current_url at runtime, not declared anywhere - so the set of
// keys that can hold a URL isn't fixed, and an allowlist would quietly miss the
// next one it invents.
const carriesSecret = (value: string): boolean =>
  value.includes("/invite/") ||
  value.includes("code=") ||
  value.includes("token=")

// Properties are a mostly-flat bag, but $set/$set_once can arrive nested inside
// them, so a shallow pass isn't enough. The cap keeps this from turning into a
// deep walk of a payload that happens to be large.
const MAX_DEPTH = 3

const redactIn = (bag: unknown, maxDepth: number, depth = 0): void => {
  if (depth > maxDepth || bag === null || typeof bag !== "object") return

  const record = bag as Record<string, unknown>
  // Object.entries covers arrays too (index keys), which is what reaches
  // URL-bearing entries in list-valued properties.
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") {
      if (carriesSecret(value)) record[key] = redactSecrets(value)
    } else if (typeof value === "object") {
      redactIn(value, maxDepth, depth + 1)
    }
  }
}

// Session replay snapshots get their top-level properties scrubbed but are not
// descended into: rrweb nests recorded hrefs far deeper than MAX_DEPTH, and the
// payloads are big enough that walking them on every snapshot would be real
// overhead. Replay is therefore NOT covered by this - if it's enabled on the
// project, /invite/* needs excluding in the PostHog session-recording settings,
// or the token needs moving out of the path entirely.
const depthFor = (event: CaptureResult): number =>
  event.event === "$snapshot" ? 0 : MAX_DEPTH

/**
 * Strips URL-borne credentials - invite tokens and Supabase auth tokens - out
 * of every captured event before it leaves the browser. Mutates and returns the
 * event, which is the contract `before_send` expects (returning null would drop
 * the event instead).
 *
 * Named for the invite case it was written for; it covers both.
 */
export const scrubInviteTokens: BeforeSendFn = (event) => {
  if (!event) return event

  const maxDepth = depthFor(event)
  redactIn(event.properties, maxDepth)
  redactIn(event.$set, maxDepth)
  redactIn(event.$set_once, maxDepth)

  return event
}
