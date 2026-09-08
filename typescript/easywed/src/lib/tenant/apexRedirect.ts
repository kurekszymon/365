import { apexOrigin, tenantSlugFromHost } from "@/lib/tenant/host"

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
 * The destination is `apexOrigin()` and not `SITE_ORIGIN`: the constant is the
 * canonical origin, right for a link a crawler reads and wrong for one this
 * browser is about to follow. On `bagatelka.localhost:3000` it sends a developer
 * to production, which is a different database.
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
  window.location.replace(
    `${apexOrigin()}${path}${withoutTenantParam(search)}${hash}`
  )
}

/**
 * The query string with `?tenant=` removed, and untouched if it carries none.
 *
 * On a preview deploy the tenant comes from the query rather than a label, so
 * `apexOrigin()` is the origin we are already on and carrying the parameter
 * across would land on the same tenant context that triggered the redirect -
 * a loop, one navigation at a time. Dropping it is right on real hosts too,
 * where `tenantSlugFromHost` ignores the parameter and it means nothing.
 *
 * The untouched path is not an optimisation: `URLSearchParams` re-serializes,
 * turning `?a` into `?a=`, and this runs on every navigation.
 */
const withoutTenantParam = (search: string): string => {
  if (!search) return search

  const params = new URLSearchParams(search)
  if (!params.has("tenant")) return search

  params.delete("tenant")
  const rest = params.toString()
  return rest ? `?${rest}` : ""
}
