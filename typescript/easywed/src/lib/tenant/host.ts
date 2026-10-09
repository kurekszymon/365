// Which tenant, if any, the current host addresses.
//
// Pure string parsing, zero network, zero store reads: `TenantGate` and the root
// `beforeLoad` both need the answer *synchronously*, before any await, so the
// apex pays nothing for v2.
//
// **Not a security boundary.** A slug that survives this is still looked up
// through `tenant_public()` and guarded by RLS. The reserved list and the regex
// exist to avoid *issuing* a pointless RPC for `www.easywed.app`; the database's
// own CHECK constraint is the guarantee.

import { SITE_HOST } from "@/lib/site"

/**
 * Labels that must never resolve to a tenant. Mirrors the CHECK constraint on
 * `tenants.slug`, kept in sync by hand: if the two drift the database still
 * refuses the reserved slug, and the worst case is one wasted RPC.
 */
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  // Serve, or will serve, the apex site itself.
  "www",
  "app",
  "api",
  "cdn",
  "static",
  "assets",
  "media",
  // Infrastructure that would be shadowed by a tenant of the same name.
  "mail",
  "smtp",
  "imap",
  "pop",
  "ns",
  "ns1",
  "ns2",
  "mx",
  "dns",
  "vpn",
  "ftp",
  "webmail",
  "autodiscover",
  "autoconfig",
  // Environments and internal surfaces.
  "dev",
  "staging",
  "stage",
  "test",
  "preview",
  "demo",
  "local",
  "localhost",
  "admin",
  "internal",
  "status",
  "monitor",
  "metrics",
  // Product surfaces that must keep meaning the same thing everywhere.
  "auth",
  "login",
  "signup",
  "account",
  "settings",
  "billing",
  "pay",
  "checkout",
  "support",
  "help",
  "docs",
  "blog",
  "changelog",
  "legal",
  "privacy",
  "terms",
  "crm",
  "venue",
  "venues",
  "wedding",
  "weddings",
  "easywed",
])

/**
 * A tenant slug: lowercase alphanumerics and hyphens, 3-32 characters, never
 * starting or ending with a hyphen. Two characters is too close to a country
 * code; 32 keeps `<slug>.easywed.app` under the 63-octet DNS label limit.
 * Punycode is not meaningful here - the venue's real name lives in `tenants.name`.
 */
export const TENANT_SLUG_RE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/

/**
 * Hosts that are the apex itself rather than a tenant of it. `localhost` and
 * the loopback addresses are here so `pnpm dev` on the bare host behaves
 * exactly like production on `easywed.app`.
 */
const APEX_HOSTS: ReadonlySet<string> = new Set([
  SITE_HOST,
  `www.${SITE_HOST}`,
  "localhost",
  "127.0.0.1",
  "[::1]",
  "0.0.0.0",
])

/**
 * Suffixes under which a subdomain addresses a tenant. `.localhost` is here
 * because browsers resolve `anything.localhost` to loopback without DNS, making
 * `bagatelka.localhost:3000` a complete local reproduction of a tenant host.
 */
const TENANT_SUFFIXES = [`.${SITE_HOST}`, ".localhost"] as const

/**
 * The Cloudflare Pages preview domain. Previews land on
 * `<hash>.easywed.pages.dev`, where the leading label is a build hash and not a
 * tenant, so tenant resolution is switched on with `?tenant=` instead.
 */
const PREVIEW_SUFFIX = ".pages.dev"

/**
 * The tenant slug this hostname addresses, or null for the apex.
 *
 * @param hostname `window.location.hostname` - no port, no scheme. A value
 *   carrying either is rejected rather than guessed at.
 * @param search `window.location.search`, only consulted on `*.pages.dev`, where
 *   `?tenant=<slug>` stands in for a subdomain that cannot exist. Deliberately
 *   *not* honoured on real hosts: it would let any link put a visitor into a
 *   tenant context, or claim to be a different tenant. Neither grants access -
 *   RLS decides that - but the second reads as a spoof.
 */
export function tenantSlugFromHost(
  hostname: string,
  search?: string
): string | null {
  if (!hostname) return null

  // A trailing dot is a fully-qualified name and addresses the same host.
  const normalized = normalizeHost(hostname)

  if (APEX_HOSTS.has(normalized)) return null

  if (normalized.endsWith(PREVIEW_SUFFIX)) {
    return search ? slugFromSearch(search) : null
  }

  const suffix = TENANT_SUFFIXES.find((s) => normalized.endsWith(s))
  if (!suffix) return null

  const label = normalized.slice(0, -suffix.length)

  // Nested subdomains are not tenants. `a.b.easywed.app` leaves "a.b", which the
  // regex would reject anyway - explicit so a future regex change cannot quietly
  // admit it.
  if (label.includes(".")) return null

  return isTenantSlug(label) ? label : null
}

/**
 * Whether the browser is currently on a venue host. The window read is here
 * rather than at each call site so every caller survives prerender, where there
 * is no host and the apex is the right answer - the HTML is host-independent.
 */
export function isTenantHost(): boolean {
  if (typeof window === "undefined") return false

  return (
    tenantSlugFromHost(window.location.hostname, window.location.search) !==
    null
  )
}

/** Whether a bare string is shaped like, and permitted to be, a tenant slug. */
export function isTenantSlug(value: string): boolean {
  return TENANT_SLUG_RE.test(value) && !RESERVED_SUBDOMAINS.has(value)
}

/**
 * The apex origin *as this browser can reach it*, and a URL on one tenant's.
 *
 * `SITE_ORIGIN` is a constant, right for canonical URLs and wrong for a link the
 * user is about to click: an invitation copied out of the CRM has to point at
 * whichever origin the *recipient* needs - the apex for a couple, the venue's
 * own host for staff - and hardcoding either breaks `pnpm dev`. So the rule is
 * "keep the scheme and port you are on, change only the label".
 *
 * Both fall back to the production origin with no `window`, for prerender
 * safety rather than a real code path.
 */
export function apexOrigin(): string {
  if (typeof window === "undefined") return `https://${SITE_HOST}`

  const { protocol, hostname, port, origin } = window.location
  const slug = tenantSlugFromHost(hostname, window.location.search)
  const host = normalizeHost(hostname)

  // Not on a tenant host: already the apex, whatever it is called locally.
  //
  // The second half of the condition is load-bearing. On *.pages.dev the slug
  // comes from `?tenant=` rather than a label, so it is non-null on a hostname
  // that never carried it, and stripping `slug.length + 1` characters off
  // `x.easywed.pages.dev` yields `pages.dev` - a third party's origin, which a
  // copied invitation URL and its bearer token would then be built on. Guarding
  // on the label keeps this correct for any slug source that is not the hostname.
  if (!slug || !host.startsWith(`${slug}.`)) return origin

  return `${protocol}//${host.slice(slug.length + 1)}${port ? `:${port}` : ""}`
}

/**
 * A URL in one tenant's context, for a path this browser can actually reach.
 *
 * It takes the path rather than handing back an origin to concatenate, and the
 * signature is the fix: on a preview deploy the tenant is carried by `?tenant=`,
 * so a caller appending `/venue/invite/<token>` to a string ending in
 * `?tenant=bagatelka` buries the token in the query value and lands on `/`.
 *
 * @param path an absolute path beginning with `/`, optionally with its own
 *   query string - `?tenant=` is appended with the right separator.
 */
export function tenantUrl(slug: string, path: string): string {
  if (typeof window === "undefined") {
    return `https://${slug}.${SITE_HOST}${path}`
  }

  const { protocol, hostname, port, origin } = window.location

  // A preview deploy cannot have a tenant subdomain, so `?tenant=` stands in -
  // the same escape hatch tenantSlugFromHost honours there and nowhere else.
  if (normalizeHost(hostname).endsWith(PREVIEW_SUFFIX)) {
    const sep = path.includes("?") ? "&" : "?"
    return `${origin}${path}${sep}tenant=${encodeURIComponent(slug)}`
  }

  const apex = new URL(apexOrigin())

  // `www` is an apex host but not a usable base - bagatelka.www.easywed.app is
  // nobody's certificate. Everything else passes through, `localhost` included.
  const base = apex.hostname === `www.${SITE_HOST}` ? SITE_HOST : apex.hostname

  return `${protocol}//${slug}.${base}${port ? `:${port}` : ""}${path}`
}

/** Lowercased, with the trailing dot of a fully-qualified name removed. */
function normalizeHost(hostname: string): string {
  const host = hostname.toLowerCase()
  return host.endsWith(".") ? host.slice(0, -1) : host
}

function slugFromSearch(search: string): string | null {
  // `search` may or may not carry its leading "?"; URLSearchParams handles both.
  const value = new URLSearchParams(search).get("tenant")
  if (!value) return null
  const slug = value.toLowerCase()
  return isTenantSlug(slug) ? slug : null
}
