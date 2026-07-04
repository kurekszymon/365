import i18n from "@/i18n"

// Per-locale <head> for the shareable language-pinned routes (/pl, /en and
// their subpages). Language is pinned by the route (not detected), so og tags
// are correct in the server-rendered HTML that social crawlers read — they
// never run client JS. Overrides the language-specific tags from the root
// route and adds canonical + hreflang.
const BASE = "https://easywed.app"
const OG_LOCALE = { pl: "pl_PL", en: "en_US" } as const

type Lang = keyof typeof OG_LOCALE

type Page = {
  // Subpath under the locale segment, e.g. "privacy" → /pl/privacy.
  path: string
  titleKey: string
  descriptionKey: string
}

export function localeHead(lang: Lang, page?: Page) {
  const title = i18n.t(page?.titleKey ?? "seo.title", { lng: lang })
  const description = i18n.t(page?.descriptionKey ?? "seo.description", {
    lng: lang,
  })
  const alt: Lang = lang === "pl" ? "en" : "pl"
  const suffix = page ? `/${page.path}` : ""

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: `${BASE}/${lang}${suffix}` },
      { property: "og:locale", content: OG_LOCALE[lang] },
      { property: "og:locale:alternate", content: OG_LOCALE[alt] },
      { name: "twitter:description", content: description },
    ],
    links: [
      { rel: "canonical", href: `${BASE}/${lang}${suffix}` },
      { rel: "alternate", hrefLang: "pl", href: `${BASE}/pl${suffix}` },
      { rel: "alternate", hrefLang: "en", href: `${BASE}/en${suffix}` },
      { rel: "alternate", hrefLang: "x-default", href: `${BASE}/pl${suffix}` },
    ],
  }
}
