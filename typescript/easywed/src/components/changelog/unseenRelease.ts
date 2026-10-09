import type { Release } from "./releases"

type SeenInput = {
  /** `session.user.last_sign_in_at` - absent for guests. */
  lastSignInAt: string | undefined
  /** Release id this user last opened the changelog at, on this device. */
  seenReleaseId: string | undefined
}

/**
 * Whether `latest` should be flagged as new to this user.
 *
 * Once they have opened the changelog, the explicit marker wins: anything but
 * the release they saw is new. Before that, their last sign-in is the
 * baseline - a release dated after it shipped while they were away, while one
 * dated before it was already live when they arrived, so a fresh account is
 * not greeted with a dot for history it never missed.
 *
 * Release dates are calendar days (UTC midnight), so a release shipped later
 * on the same day someone signed in counts as already seen. Guests have no
 * sign-in to measure from and are never flagged.
 */
export function hasUnseenRelease(
  latest: Release | undefined,
  { lastSignInAt, seenReleaseId }: SeenInput
): boolean {
  if (!latest) return false
  if (seenReleaseId !== undefined) return seenReleaseId !== latest.id
  if (!lastSignInAt) return false

  const released = Date.parse(latest.date)
  const signedIn = Date.parse(lastSignInAt)
  if (Number.isNaN(released) || Number.isNaN(signedIn)) return false

  return released > signedIn
}
