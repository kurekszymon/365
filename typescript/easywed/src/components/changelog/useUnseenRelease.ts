import { useCallback } from "react"
import { RELEASES } from "./releases"
import { hasUnseenRelease } from "./unseenRelease"
import { useAuthStore } from "@/stores/auth.store"
import { useChangelogSeenStore } from "@/stores/changelogSeen.store"

/**
 * Whether the signed-in user has a release they haven't looked at, and the
 * callback that clears it. Call `markSeen` from whatever opens the changelog.
 */
export function useUnseenRelease() {
  const user = useAuthStore((state) => state.session?.user)
  const seenReleaseId = useChangelogSeenStore((state) =>
    user ? state.seen[user.id] : undefined
  )
  const setSeen = useChangelogSeenStore((state) => state.markSeen)

  // RELEASES is newest first.
  const latest = RELEASES.at(0)

  const unseen = hasUnseenRelease(latest, {
    lastSignInAt: user?.last_sign_in_at,
    seenReleaseId,
  })

  const userId = user?.id
  const markSeen = useCallback(() => {
    if (userId && latest) setSeen(userId, latest.id)
  }, [userId, latest, setSeen])

  return { unseen, markSeen }
}
