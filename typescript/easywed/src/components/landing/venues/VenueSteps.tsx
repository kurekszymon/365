import { useTranslation } from "react-i18next"
import type { Lang } from "@/components/landing/LocaleLanding"

const STEPS = ["one", "two", "three"] as const

export function VenueSteps({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
      <h2 className="text-center font-heading text-3xl font-semibold text-balance sm:text-4xl">
        {t("venues.steps.title", { lng: lang })}
      </h2>
      <ol className="mt-12 grid gap-10 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className="flex flex-col items-center gap-3 text-center"
          >
            <span className="font-heading text-5xl font-semibold text-primary/40">
              {i + 1}
            </span>
            <h3 className="font-medium">
              {t(`venues.steps.${step}.title`, { lng: lang })}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t(`venues.steps.${step}.desc`, { lng: lang })}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
