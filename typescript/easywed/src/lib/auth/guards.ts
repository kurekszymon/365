import { redirect } from "@tanstack/react-router"
import { useAuthStore } from "@/stores/auth.store"
import { useProfileStore } from "@/stores/profile.store"
import { useTenantStore } from "@/stores/tenant.store"
import { armVenueLanding } from "@/lib/auth/venueLanding"
import { isTenantHost } from "@/lib/tenant/host"

/**
 * A `?next=` value, reduced to something that can only ever be a path here.
 *
 * The single chokepoint for attacker-controllable navigation targets, so it
 * validates what the *browser* will see rather than what the string looks like:
 *
 *   - tab, newline and carriage return are stripped from anywhere in a URL
 *     before it is parsed, so "/\tevil.example" is not the path it resembles;
 *   - a backslash in the authority position is normalised to a slash, so
 *     "/\evil.example" resolves as "//evil.example" - protocol-relative, i.e.
 *     somebody else's origin, on this browser's current scheme.
 *
 * Every consumer today feeds TanStack's `redirect({ to })`, which builds against
 * the current origin, so the second rule is hardening rather than a live hole.
 * Keep it: this is the function the next cross-origin caller will trust.
 */
export const sanitizeNextPath = (next: unknown): string | undefined => {
  if (typeof next !== "string") return undefined

  // Normalise to what a browser would resolve, then validate *that*. The
  // stripped value is what gets returned, so no consumer re-introduces the
  // characters this just decided about.
  const path = next.replace(/[\t\n\r]/g, "")

  if (!path.startsWith("/") || /^\/[/\\]/.test(path)) return undefined

  return path
}

/**
 * Where an authenticated caller belongs when nothing asked for a page by name.
 * The one answer to "signed in - now what?", shared by the /login and /signup
 * guards, the OAuth callback and the terms gate. **Do not hardcode "/home" at an
 * auth terminus**; that is right for a couple and wrong for venue staff.
 *
 * Three answers, in order:
 *
 *   - an explicit `next`, someone's interrupted destination, which beats any
 *     guess made here;
 *   - "/crm" on a venue host, since a tenant origin has no couple-facing surface
 *     and /home is apex-only - the old default sent staff through
 *     `redirectApexOnlyPathToApex` to an origin where their session does not
 *     exist. The role is not consulted: it is a round trip away, and the CRM
 *     shell renders a named 403 for a customer who arrives;
 *   - "/home" on the apex, with the venue check armed. The hostname says nothing
 *     there, so the answer costs a query - see venueLanding.ts for why it is
 *     spent once here rather than on every render of the wedding list.
 */
export const authLandingPath = (next?: unknown): string => {
  const explicit = sanitizeNextPath(next)
  if (explicit) return explicit

  if (isTenantHost()) return "/crm"

  armVenueLanding()
  return "/home"
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

// Everything a user with an outstanding acceptance may still reach. Load-bearing
// - read this before trimming an entry.
//
// The legal documents: the acceptance screen links to /pl/terms and /en/terms in
// a new tab, so redirecting those away asks someone to accept a document we then
// refuse to show them. /pl and /en cover the whole locale-pinned public site,
// which is marketing rather than the app. What this closes is /home, /wedding,
// /settings and /invite.
//
// /reset-password: a recovery link creates a real session, so this guard sees a
// signed-in user and bounces them to /accept-terms, which sends them on to
// /home - and the password they came to change never is. Only reachable by
// someone predating enforcedSince or mid-signup, but the failure is a locked-out
// user.
const TERMS_EXEMPT_PATHS = [
  "/",
  "/pl",
  "/en",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/accept-terms",
]

const isTermsExempt = (pathname: string): boolean =>
  TERMS_EXEMPT_PATHS.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`))
  )

/**
 * Keeps a signed-in user out of the app until their acceptance is on record.
 * Lives on the root route, so it covers address-bar navigation and not just the
 * sign-in flow. Same not-settled-yet contract as requireAuth: an unresolved
 * session or status passes through, and AuthGate's router.invalidate() re-runs
 * this once both are known.
 *
 * Signed-out visitors are none of its business - guest mode plans a wedding at
 * /wedding/local without an account.
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

/**
 * Keeps the CRM on a tenant host, and behind a session.
 *
 * Deliberately narrow. A guard cannot render, so it owns only the two cases
 * whose answer is "you are in the wrong place entirely": the apex, where /crm is
 * meaningless, and no session.
 *
 * Everything else is a *render* decision belonging to the /crm layout, which can
 * show it in the venue's own shell - an unknown slug becomes "no such venue", a
 * signed-in non-member a 403. Bouncing a customer to /home would read as "that
 * page does not exist" when the honest answer is "it does, and it is not yours".
 *
 * Same not-settled-yet contract as the guards above. `tenantRole` is not
 * consulted: it settles later than `status`, and waiting on it would hold every
 * navigation for a round trip the layout makes anyway.
 */
export const requireTenantMember = (pathname: string) => {
  const { isReady, session } = useAuthStore.getState()
  const { status } = useTenantStore.getState()

  if (!isReady || status === "unknown") return

  // The apex has no CRM, and cross-origin is not involved, so an ordinary in-app
  // redirect is right. Armed rather than bare because whoever typed this asked
  // for a CRM by name: if the account is venue staff, /home forwards them to the
  // one they meant instead of a wedding list.
  if (status === "none") {
    throw redirect({ to: authLandingPath(), replace: true })
  }

  if (session) return

  // `sanitizeNextPath` rejects anything not starting with "/", so `next` cannot
  // carry a cross-origin destination - correct rather than limiting, since
  // sessions are per-origin and staff signing in here come back here.
  throw redirect({
    to: "/login",
    search: pathname !== "/" ? { next: pathname } : {},
    replace: true,
  })
}

export const redirectAuthedAwayFromLogin = (next?: unknown) => {
  const { isReady, session } = useAuthStore.getState()
  if (!isReady || !session) return

  throw redirect({
    to: authLandingPath(next),
    replace: true,
  })
}
