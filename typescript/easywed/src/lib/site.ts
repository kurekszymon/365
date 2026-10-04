// The apex host, in one place: the sitemap and hreflang in vite.config.ts, the
// canonical and og:url in lib/seo/localeHead.ts, and __root.tsx's head. Tenant
// hosts (`<slug>.easywed.app`) do *not* get their own canonical - see
// SITE_ORIGIN below.
//
// **Keep this file dependency-free.** vite.config.ts imports it by relative
// path (`./src/lib/site`), not `@/lib/site`: vite-tsconfig-paths resolves the
// alias for the app build and not for the config file, so an aliased import here
// - or in anything this file imports - breaks `vite build` with a
// bare-specifier resolution error before a single route is rendered.

/** Bare hostname, no scheme, no port. The registrable site. */
export const SITE_HOST = "easywed.app"

/**
 * Canonical origin for every public URL the app emits: canonical links,
 * hreflang alternates, og:url, the sitemap.
 *
 * Deliberately apex even when the page is served from a tenant host: a venue
 * subdomain serves the same marketing copy, so a self-canonical would fork one
 * indexable page into as many duplicates as there are tenants - and the tenant
 * surfaces are noindex anyway. Search consolidating on the apex is the intended
 * shape, not an oversight to "fix" later.
 */
export const SITE_ORIGIN = `https://${SITE_HOST}`

/** The 1200x630 social card, referenced absolutely because crawlers require it. */
export const OG_IMAGE = `${SITE_ORIGIN}/og-image.png`

/** The marketing pages that exist once per locale, as real prerendered routes. */
type LocaleDoc = "terms" | "privacy" | "changelog" | "venues"

/**
 * The path to one of those pages, in the language the caller is rendering in.
 *
 * These pages are **language-pinned** - `/pl/terms` and `/en/terms` are two
 * routes, not one with a detector - so every link into them has to choose. Takes
 * the language as a plain string rather than reaching for i18next, because some
 * callers hold a `lang` prop and others `i18n.language`, and keeping this file
 * dependency-free is load-bearing (see the note at the top).
 *
 * The return type stays a union of two literals so `<Link to>` type-checks
 * against the generated route tree; a widened `string` would give that up.
 */
export const localeDocPath = <TDoc extends LocaleDoc>(
  doc: TDoc,
  language: string
): `/pl/${TDoc}` | `/en/${TDoc}` =>
  language.startsWith("pl") ? `/pl/${doc}` : `/en/${doc}`
