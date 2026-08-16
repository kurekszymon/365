import { SITE_ORIGIN } from "@/lib/site"
import { tenantSlugFromHost } from "@/lib/tenant/host"

/**
 * Paths that only mean something on the apex, and must never be served from a
 * venue host.
 *
 * Couples plan at easywed.app. Serving the same planner from
 * bagatelka.easywed.app would work - it is the same bundle and the same RLS -
 * and that is exactly the problem: sessions are per-origin, so a couple who
 * signed up on one host and returns to the other finds themselves signed out
 * with no explanation. "Which address did I sign up at?" is a support question
 * we can decline to have.
 *
 * Prefix-matched, so `/wedding` covers `/wedding/$id` and `/wedding/local`.
 */
const APEX_ONLY_PREFIXES = ["/home", "/wedding"]

const isApexOnly = (pathname: string): boolean =>
  APEX_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))

/**
 * Sends an apex-only path on a venue host back to the apex, preserving the
 * path, query and hash.
 *
 * `window.location.replace` rather than the router's `redirect()`, because this
 * crosses an origin and TanStack's redirect cannot express one - it builds a
 * path against the current origin, so returning it here would loop.
 * `replace` rather than `assign` keeps the venue host out of history, so Back
 * from the apex goes wherever the user actually came from.
 *
 * Server-safe: bails during prerender, where there is no `window` and no host
 * to read. That is not a limitation - a tenant host is a client-side fact, and
 * the prerendered HTML is host-independent by design.
 */
export const redirectApexOnlyPathToApex = (pathname: string): void => {
  if (typeof window === "undefined") return
  if (!isApexOnly(pathname)) return
  if (!tenantSlugFromHost(window.location.hostname, window.location.search)) {
    return
  }

  const { pathname: path, search, hash } = window.location
  window.location.replace(`${SITE_ORIGIN}${path}${search}${hash}`)
}
