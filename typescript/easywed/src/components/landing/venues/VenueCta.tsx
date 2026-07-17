import { useTranslation } from "react-i18next"
import { salesMailto } from "./salesMailto"
import type { Lang } from "@/components/landing/LocaleLanding"
import { Button } from "@/components/ui/button"

export function VenueCta({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-24">
      <div className="flex flex-col items-center gap-6 rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground">
        <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">
          {t("venues.cta_band.title", { lng: lang })}
        </h2>
        <p className="max-w-prose text-primary-foreground/80">
          {t("venues.cta_band.subtitle", { lng: lang })}
        </p>
        <Button asChild size="lg" variant="secondary">
          <a href={salesMailto(lang)}>
            {t("venues.contact_sales", { lng: lang })}
          </a>
        </Button>
      </div>
    </section>
  )
}
