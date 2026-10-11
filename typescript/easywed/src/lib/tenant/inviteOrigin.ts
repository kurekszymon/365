import { apexOrigin, tenantSlugFromHost, tenantUrl } from "@/lib/tenant/host"

/**
 * Whether an invitation is open on the wrong origin for the person it is for.
 *
 * Sessions are per-origin. A couple's account lives on the apex, where their
 * weddings are; staff sign in on the venue's own host, where the CRM is. The
 * invitation route answers on both, so a link opened on the other one would
 * sign the visitor in - or accept - somewhere their next screen is not, and the
 * hop to it would land them on a sign-in form for an account they just used.
 *
 * So the page moves first and asks second:
 *
 *   - a customer invite belongs on the apex (any tenant host is wrong);
 *   - a staff invite belongs on *its* venue's host (the apex, and every other
 *     venue's host, are wrong).
 *
 * Pure, with the current slug passed in, so the rule is testable without a
 * window; `inviteHopUrl` below is the window-reading wrapper.
 */
export const inviteOnWrongOrigin = (
  role: "staff" | "customer",
  inviteSlug: string,
  currentSlug: string | null
): boolean =>
  role === "customer" ? currentSlug !== null : currentSlug !== inviteSlug

/**
 * The URL this invitation should be opened at instead, or null if the browser
 * is already there. Null during prerender, where there is no origin to be on.
 */
export const inviteHopUrl = (
  role: "staff" | "customer",
  inviteSlug: string,
  token: string
): string | null => {
  if (typeof window === "undefined") return null

  const currentSlug = tenantSlugFromHost(
    window.location.hostname,
    window.location.search
  )
  if (!inviteOnWrongOrigin(role, inviteSlug, currentSlug)) return null

  const path = `/venue/invite/${token}`
  return role === "customer"
    ? `${apexOrigin()}${path}`
    : tenantUrl(inviteSlug, path)
}
