import i18n from "@/i18n"

const BASE = "https://easywed.app"

type Lang = "pl" | "en"

// Shared by the visible FAQ (LandingFaq) and the FAQPage below, so the markup
// can never describe questions the page doesn't show - Google treats a
// mismatch as spam.
export const FAQ_ITEMS = ["seat", "free", "import", "print", "share"] as const

// Structured data for the locale landings, as a head() `scripts` entry - the
// router renders it as <script type="application/ld+json"> in the prerendered
// <head>. Every string in it is our own copy, never user input.
export function landingJsonLd(lang: Lang) {
  const url = `${BASE}/${lang}`

  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebApplication",
          name: "easywed.",
          url,
          inLanguage: lang,
          description: i18n.t("seo.description", { lng: lang }),
          applicationCategory: "LifestyleApplication",
          operatingSystem: "Web",
          browserRequirements: "Requires JavaScript",
          offers: { "@type": "Offer", price: "0", priceCurrency: "PLN" },
        },
        {
          "@type": "FAQPage",
          url,
          inLanguage: lang,
          mainEntity: FAQ_ITEMS.map((key) => ({
            "@type": "Question",
            name: i18n.t(`landing.faq.${key}.q`, { lng: lang }),
            acceptedAnswer: {
              "@type": "Answer",
              text: i18n.t(`landing.faq.${key}.a`, { lng: lang }),
            },
          })),
        },
      ],
    }),
  }
}
