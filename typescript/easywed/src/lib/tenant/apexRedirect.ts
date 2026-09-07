import { SITE_ORIGIN } from "@/lib/site"
import { tenantSlugFromHost } from "@/lib/tenant/host"

/**
 * Paths that only mean something on the apex, and must never be served from a
 * venue host.
 *
 * Serving the planner from bagatelka.easywed.app would *work* - same bundle,
 * same RLS - and that is the problem: sessions are per-origin, so a couple who
 * signed up on one host and returns to the other is signed out with no
 * explanation.
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
 * crosses an origin and TanStack's redirect builds against the current one, so
 * returning it here would loop. `replace` keeps the venue host out of history.
 *
 * Server-safe: bails during prerender, where there is no `window`. Not a
 * limitation - a tenant host is a client-side fact and the prerendered HTML is
 * host-independent by design.
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
