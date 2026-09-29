import { useTranslation } from "react-i18next"
import type { Lang } from "./LocaleLanding"
import { FAQ_ITEMS } from "@/lib/seo/landingJsonLd"

// Laid out as a two-column table - question, answer - with every answer always
// visible. A <dl> rather than a <table>, because a list of questions and
// answers isn't tabular data, and it lets the rows stack on a phone.
export function LandingFaq({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16 lg:pb-24">
      <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">
        {t("landing.faq.title", { lng: lang })}
      </h2>
      <dl className="mt-10 divide-y border-y">
        {FAQ_ITEMS.map((key) => (
          <div
            key={key}
            className="grid gap-2 py-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-10"
          >
            <dt className="font-medium">
              {t(`landing.faq.${key}.q`, { lng: lang })}
            </dt>
            <dd className="text-sm leading-relaxed text-muted-foreground">
              {t(`landing.faq.${key}.a`, { lng: lang })}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
