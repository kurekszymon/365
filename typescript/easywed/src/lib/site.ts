// The apex host, in one place.
//
// It was three: `SITE` in vite.config.ts (sitemap + hreflang), `BASE` in
// lib/seo/localeHead.ts (canonical + og:url) and three string literals in
// __root.tsx's head. Consolidated now rather than later because v2 introduces
// tenant hosts (`<slug>.easywed.app`), and the first thing a reader asks on
// seeing one is whether canonical URLs follow the subdomain. They must not -
// see the note on SITE_ORIGIN - and that answer needs somewhere to live.
//
// **Keep this file dependency-free.** vite.config.ts imports it by relative
// path (`./src/lib/site`) rather than `@/lib/site`: vite-tsconfig-paths
// resolves the alias for the app build, not for the config file itself, so an
// aliased import here - or in anything this file imports - breaks `vite build`
// with a bare-specifier resolution error before a single route is rendered.

/** Bare hostname, no scheme, no port. The registrable site. */
export const SITE_HOST = "easywed.app"

/**
 * Canonical origin for every public URL the app emits: canonical links,
 * hreflang alternates, og:url, the sitemap.
 *
 * Deliberately apex even when the page is served from a tenant host. A venue
 * subdomain serves the same marketing copy as the apex, so pointing its
 * canonical at itself would fork one indexable page into as many duplicates as
 * there are tenants - and the tenant surfaces themselves are noindex, so they
 * have nothing to gain from claiming their own URLs. Search consolidates on
 * the apex; that is the intended shape, not an oversight to "fix" later.
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
 * routes, not one route with a detector - so every link into them has to choose,
 * and six files were choosing with their own copy of the same ternary. Two of
 * them read a `lang` prop and four read `i18n.language`, which is why this takes
 * the language as a plain string rather than reaching for i18next: keeping this
 * file dependency-free is load-bearing (see the note at the top), and
 * `startsWith` answers both callers.
 *
 * The return type stays a union of two literals so `<Link to>` still type-checks
 * against the generated route tree - a widened `string` would silently give up
 * that check at every call site this replaces.
 */
export const localeDocPath = <TDoc extends LocaleDoc>(
  doc: TDoc,
  language: string
): `/pl/${TDoc}` | `/en/${TDoc}` =>
  language.startsWith("pl") ? `/pl/${doc}` : `/en/${doc}`
