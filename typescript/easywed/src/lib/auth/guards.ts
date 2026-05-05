import { redirect } from "@tanstack/react-router"
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"

export const sanitizeNextPath = (next: unknown): string | undefined => {
  if (typeof next !== "string") return undefined
  if (!next.startsWith("/") || next.startsWith("//")) return undefined
  return next
}

export const requireAuth = (nextPath: string) => {
  // When !isReady, auth hasn't settled yet — don't redirect. AuthGate renders
  // null during this window and calls router.invalidate() once ready, which
  // re-runs beforeLoad. Both pieces must stay in sync: don't remove the
  // invalidate call in AuthGate without updating this guard.
  const { isReady, session } = useAuthStore.getState()
  if (!isReady || session) return

  // Only set ?next= if not root
  throw redirect({
    to: "/login",
    search: nextPath !== "/" ? { next: nextPath } : {},
    replace: true,
  })
}

// Redirects to /onboarding if the user hasn't selected an account type yet.
// Call after requireAuth so session is guaranteed.
export const requireOnboarded = () => {
  const { isReady } = useAuthStore.getState()
  if (!isReady) return

  const { userType } = useGlobalStore.getState()
  if (userType === null) {
    throw redirect({ to: "/onboarding", replace: true })
  }
}

export const redirectAuthedAwayFromLogin = (next?: unknown) => {
  const { isReady, session } = useAuthStore.getState()
  if (!isReady || !session) return

  throw redirect({
    to: sanitizeNextPath(next) ?? "/",
    replace: true,
  })
}
