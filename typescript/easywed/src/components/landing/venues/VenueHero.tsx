import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { salesMailto } from "./salesMailto"
import type { Lang } from "@/components/landing/LocaleLanding"
import { PlannerPreview } from "@/components/landing/PlannerPreview"
import { Button } from "@/components/ui/button"

export function VenueHero({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
      <div className="flex flex-col items-start gap-6">
        <p className="text-sm font-medium tracking-widest text-primary uppercase">
          {t("venues.hero.eyebrow", { lng: lang })}
        </p>
        <h1 className="font-heading text-4xl leading-tight font-semibold text-balance sm:text-5xl lg:text-6xl">
          {t("venues.hero.title", { lng: lang })}
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          {t("venues.hero.subtitle", { lng: lang })}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href={salesMailto(lang)}>
              {t("venues.contact_sales", { lng: lang })}
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/wedding/local">
              {t("venues.hero.demo", { lng: lang })}
            </Link>
          </Button>
        </div>
      </div>
      <PlannerPreview lang={lang} />
    </section>
  )
}
