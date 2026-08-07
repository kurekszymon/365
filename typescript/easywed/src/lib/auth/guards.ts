import { redirect } from "@tanstack/react-router"
import { useAuthStore } from "@/stores/auth.store"
import { useProfileStore } from "@/stores/profile.store"

export const sanitizeNextPath = (next: unknown): string | undefined => {
  if (typeof next !== "string") return undefined
  if (!next.startsWith("/") || next.startsWith("//")) return undefined
  return next
}

export const requireAuth = (nextPath: string) => {
  // When !isReady, auth hasn't settled yet - don't redirect. AuthGate renders
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

// Everything a user with an outstanding acceptance may still reach.
//
// The legal documents are the load-bearing entries: the acceptance screen links
// to /pl/terms and /en/terms in a new tab, and redirecting those away would ask
// someone to accept a document we then refuse to show them. /pl and /en cover
// the whole locale-pinned public site (landing, venues, both documents) - it is
// marketing, not the app, and trapping a half-signed-up user on the gate when
// they click the wordmark buys no enforcement. The app itself - /home, /wedding,
// /settings, /invite - is what this actually closes.
const TERMS_EXEMPT_PATHS = [
  "/",
  "/pl",
  "/en",
  "/login",
  "/signup",
  "/auth/callback",
  "/accept-terms",
]

const isTermsExempt = (pathname: string): boolean =>
  TERMS_EXEMPT_PATHS.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`))
  )

/**
 * Keeps a signed-in user out of the app until their acceptance is on record.
 *
 * Lives on the root route, so it covers address-bar navigation and not just the
 * sign-in flow that created the gap. Same not-settled-yet contract as
 * requireAuth: an unresolved session or an unresolved status is let through,
 * and AuthGate's router.invalidate() re-runs this once both are known.
 *
 * Signed-out visitors are none of this guard's business - guest mode plans a
 * wedding at /wedding/local without an account, and there is no contract to
 * accept until there is a user.
 */
export const requireAcceptedTerms = (pathname: string) => {
  const { isReady, session } = useAuthStore.getState()
  if (!isReady || !session) return

  if (useProfileStore.getState().termsStatus !== "outstanding") return
  if (isTermsExempt(pathname)) return

  throw redirect({
    to: "/accept-terms",
    search: pathname !== "/" ? { next: pathname } : {},
    replace: true,
  })
}

export const redirectAuthedAwayFromLogin = (next?: unknown) => {
  const { isReady, session } = useAuthStore.getState()
  if (!isReady || !session) return

  throw redirect({
    to: sanitizeNextPath(next) ?? "/home",
    replace: true,
  })
}
