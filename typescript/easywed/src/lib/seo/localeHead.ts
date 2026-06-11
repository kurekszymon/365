import i18n from "@/i18n"

// Per-locale <head> for the shareable /pl and /en routes. Language is pinned
// by the route (not detected), so og tags are correct in the server-rendered
// HTML that social crawlers read — they never run client JS. Overrides the
// language-specific tags from the root route and adds canonical + hreflang.
const BASE = "https://easywed.app"
const OG_LOCALE = { pl: "pl_PL", en: "en_US" } as const

type Lang = keyof typeof OG_LOCALE

export function localeHead(lang: Lang) {
  const title = i18n.t("seo.title", { lng: lang })
  const description = i18n.t("seo.description", { lng: lang })
  const alt: Lang = lang === "pl" ? "en" : "pl"

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: `${BASE}/${lang}` },
      { property: "og:locale", content: OG_LOCALE[lang] },
      { property: "og:locale:alternate", content: OG_LOCALE[alt] },
      { name: "twitter:description", content: description },
    ],
    links: [
      { rel: "canonical", href: `${BASE}/${lang}` },
      { rel: "alternate", hrefLang: "pl", href: `${BASE}/pl` },
      { rel: "alternate", hrefLang: "en", href: `${BASE}/en` },
      { rel: "alternate", hrefLang: "x-default", href: `${BASE}/pl` },
    ],
  }
}
