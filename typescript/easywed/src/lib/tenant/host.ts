// Which tenant, if any, the current host addresses.
//
// Pure string parsing, zero network, zero store reads. That is the whole point:
// `TenantGate` and the root `beforeLoad` both need the answer *synchronously*,
// before any await, so that the apex - which is every existing user - pays
// nothing at all for v2. On `easywed.app` this returns null after a few string
// comparisons and no request is ever issued.
//
// This is not a security boundary. A slug that survives this function is still
// looked up through `tenant_public()`, and every row it could reach is guarded
// by RLS. The reserved list and the regex here exist to avoid *issuing* a
// pointless RPC for `www.easywed.app`, not to protect anything - the database
// carries its own CHECK constraint with the same content, and that one is the
// guarantee.

import { SITE_HOST } from "@/lib/site"

/**
 * Labels that must never resolve to a tenant, because something else already
 * answers on them or will.
 *
 * Mirrors the CHECK constraint on `tenants.slug`. Kept in sync by hand, which
 * is acceptable precisely because this copy is an optimisation: if the two
 * drift, the database still refuses to hand out the reserved slug, and the
 * worst case is one wasted RPC.
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
 * starting or ending with a hyphen.
 *
 * The bounds are not arbitrary. Two characters is too short to be a venue name
 * and too close to a country code; 32 keeps `<slug>.easywed.app` well under the
 * 63-octet DNS label limit with room for the wildcard certificate. Consecutive
 * hyphens are permitted but `xn--` punycode is not meaningful here - a tenant
 * picks an ASCII slug, and the venue's real name lives in `tenants.name`.
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
 * Suffixes under which a subdomain addresses a tenant.
 *
 * `.localhost` is in the list because every current browser resolves
 * `anything.localhost` to loopback without touching DNS or /etc/hosts, which
 * makes `bagatelka.localhost:3000` a complete local reproduction of a tenant
 * host - no tunnel, no hosts-file edit, no wildcard certificate.
 */
const TENANT_SUFFIXES = [`.${SITE_HOST}`, ".localhost"] as const

/**
 * The Cloudflare Pages preview domain. Deploy previews land on
 * `<hash>.easywed.pages.dev`, where the leading label is a build hash and not a
 * tenant, so tenant resolution has to be switched on explicitly there - see the
 * `?tenant=` escape hatch below.
 */
const PREVIEW_SUFFIX = ".pages.dev"

/**
 * The tenant slug this hostname addresses, or null for the apex.
 *
 * @param hostname `window.location.hostname` - no port, no scheme. A value
 *   carrying either is rejected rather than guessed at.
 * @param search `window.location.search`, only consulted on `*.pages.dev`,
 *   where `?tenant=<slug>` stands in for a subdomain that cannot exist. It is
 *   deliberately *not* honoured on real hosts: on the apex it would let any
 *   link put a visitor into a tenant context, and on a tenant host it would let
 *   a link claim to be a different tenant. Neither would grant access - RLS
 *   decides that - but both would be confusing, and the second reads as a
 *   spoof.
 */
export function tenantSlugFromHost(
  hostname: string,
  search?: string
): string | null {
  if (!hostname) return null

  const host = hostname.toLowerCase()

  // A trailing dot is a fully-qualified name and addresses the same host.
  const normalized = host.endsWith(".") ? host.slice(0, -1) : host

  if (APEX_HOSTS.has(normalized)) return null

  if (normalized.endsWith(PREVIEW_SUFFIX)) {
    return search ? slugFromSearch(search) : null
  }

  const suffix = TENANT_SUFFIXES.find((s) => normalized.endsWith(s))
  if (!suffix) return null

  const label = normalized.slice(0, -suffix.length)

  // Nested subdomains are not tenants. `a.b.easywed.app` leaves "a.b" here,
  // which the regex would reject anyway - but rejecting it explicitly keeps the
  // reason readable, and stops a future regex change from quietly admitting it.
  if (label.includes(".")) return null

  return isTenantSlug(label) ? label : null
}

/** Whether a bare string is shaped like, and permitted to be, a tenant slug. */
export function isTenantSlug(value: string): boolean {
  return TENANT_SLUG_RE.test(value) && !RESERVED_SUBDOMAINS.has(value)
}

function slugFromSearch(search: string): string | null {
  // `search` may or may not carry its leading "?"; URLSearchParams handles both.
  const value = new URLSearchParams(search).get("tenant")
  if (!value) return null
  const slug = value.toLowerCase()
  return isTenantSlug(slug) ? slug : null
}
