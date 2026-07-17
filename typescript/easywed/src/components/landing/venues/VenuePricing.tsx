import { Check } from "lucide-react"
import { useTranslation } from "react-i18next"
import { salesMailto } from "./salesMailto"
import type { Lang } from "@/components/landing/LocaleLanding"
import { Button } from "@/components/ui/button"

const PLAN_FEATURES = ["f1", "f2", "f3", "f4", "f5"] as const

export function VenuePricing({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  return (
    <section className="border-y bg-card/50">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">
            {t("venues.pricing.title", { lng: lang })}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {t("venues.pricing.subtitle", { lng: lang })}
          </p>
        </div>
        <div className="mx-auto mt-12 flex max-w-md flex-col rounded-2xl border bg-card p-8 shadow-sm">
          <p className="text-sm font-medium tracking-widest text-primary uppercase">
            {t("venues.pricing.plan", { lng: lang })}
          </p>
          <p className="mt-3 font-heading text-4xl font-semibold">
            {t("venues.pricing.price", { lng: lang })}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("venues.pricing.note", { lng: lang })}
          </p>
          <ul className="mt-8 flex flex-col gap-3">
            {PLAN_FEATURES.map((key) => (
              <li key={key} className="flex items-start gap-3 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                {t(`venues.pricing.${key}`, { lng: lang })}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-8 w-full">
            <a href={salesMailto(lang)}>
              {t("venues.contact_sales", { lng: lang })}
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
