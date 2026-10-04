import posthog from "posthog-js"
import type { PostHog } from "posthog-js"

// Same `__loaded` guard as `track`: these run from a store that also exists
// during SSR/prerender and under vitest, where init never happened.

export const readConsent = ():
  | ReturnType<PostHog["get_explicit_consent_status"]>
  | undefined => {
  if (!posthog.__loaded) return undefined
  return posthog.get_explicit_consent_status()
}

/**
 * Opts in: cookies, persistence and session replay. Returns whether PostHog
 * was there to take the answer.
 */
export const grantConsent = (): boolean => {
  if (!posthog.__loaded) return false
  posthog.opt_in_capturing()
  return true
}

/**
 * Opts out, which under `on_reject` drops back to cookieless capture. That
 * path also disposes the recorder, discards buffered snapshots and clears the
 * persisted `ph_*` entries when the visitor had previously opted in - so
 * withdrawing consent removes what granting it wrote, with nothing extra to do
 * here.
 */
export const denyConsent = (): boolean => {
  if (!posthog.__loaded) return false
  posthog.opt_out_capturing()
  return true
}
