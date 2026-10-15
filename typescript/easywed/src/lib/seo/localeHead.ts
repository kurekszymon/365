import i18n from "@/i18n"
import { SITE_ORIGIN } from "@/lib/site"

// Per-locale <head> for the shareable language-pinned routes (/pl, /en and
// their subpages). Language is pinned by the route (not detected), so og tags
// are correct in the server-rendered HTML that social crawlers read - they
// never run client JS. Overrides the language-specific tags from the root
// route and adds canonical + hreflang.
// Apex even on a tenant host - see the note on SITE_ORIGIN.
const BASE = SITE_ORIGIN
const OG_LOCALE = { pl: "pl_PL", en: "en_US" } as const

type Lang = keyof typeof OG_LOCALE

type Page = {
  // Subpath under the locale segment, e.g. "privacy" → /pl/privacy. Omitted for
  // the locale landing itself, which only overrides the copy keys.
  path?: string
  titleKey: string
  descriptionKey: string
}

// Polish is the primary market, so the Polish URL is x-default throughout. "/"
// is deliberately not the x-default target: it is a duplicate of /pl that
// canonicals into it (see rootHead), and an hreflang cluster must point at
// canonical URLs or Google drops the annotations.
const xDefaultFor = (suffix: string) => `${BASE}/pl${suffix}`

export function localeHead(lang: Lang, page?: Page) {
  const title = i18n.t(page?.titleKey ?? "seo.title", { lng: lang })
  const description = i18n.t(page?.descriptionKey ?? "seo.description", {
    lng: lang,
  })
  const alt: Lang = lang === "pl" ? "en" : "pl"
  const path = page?.path?.replace(/^\/+/, "") ?? ""
  const suffix = path ? `/${path}` : ""

  return {
    meta: [
      { title },
      { name: "description", content: description },
      // Explicit, because the root route defaults every route to noindex - the
      // app shell is the common case and indexable marketing is the exception.
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: `${BASE}/${lang}${suffix}` },
      { property: "og:locale", content: OG_LOCALE[lang] },
      { property: "og:locale:alternate", content: OG_LOCALE[alt] },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [
      { rel: "canonical", href: `${BASE}/${lang}${suffix}` },
      { rel: "alternate", hrefLang: "pl", href: `${BASE}/pl${suffix}` },
      { rel: "alternate", hrefLang: "en", href: `${BASE}/en${suffix}` },
      { rel: "alternate", hrefLang: "x-default", href: xDefaultFor(suffix) },
    ],
  }
}

// Head for the bare "/". Search Console has it out-impressing /pl ~30x, so it
// gets prerendered with the full Polish landing rather than left empty - but it
// canonicals into /pl rather than claiming itself, because the two serve
// identical bytes and only one of them can be the indexed Polish URL. The
// impressions transfer with the canonical; the alternative is two self-
// canonical duplicates and Google picking for us.
//
// Polish at build time is not a guess: there is no browser to detect a language
// from during prerender, and i18n's fallbackLng is "pl".
export function rootHead() {
  const title = i18n.t("landing.seo_title", { lng: "pl" })
  const description = i18n.t("seo.description", { lng: "pl" })

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: `${BASE}/pl` },
      { property: "og:locale", content: OG_LOCALE.pl },
      { property: "og:locale:alternate", content: OG_LOCALE.en },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [
      { rel: "canonical", href: `${BASE}/pl` },
      { rel: "alternate", hrefLang: "pl", href: `${BASE}/pl` },
      { rel: "alternate", hrefLang: "en", href: `${BASE}/en` },
      { rel: "alternate", hrefLang: "x-default", href: `${BASE}/pl` },
    ],
  }
}
