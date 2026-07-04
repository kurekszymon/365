import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { PlannerPreview } from "./PlannerPreview"
import type { Lang } from "./LocaleLanding"
import { Button } from "@/components/ui/button"

export function LandingHero({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
      <div className="flex flex-col items-start gap-6">
        <p className="text-sm font-medium tracking-widest text-primary uppercase">
          {t("landing.hero.eyebrow", { lng: lang })}
        </p>
        <h1 className="font-heading text-4xl leading-tight font-semibold text-balance sm:text-5xl lg:text-6xl">
          {t("landing.hero.title", { lng: lang })}
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          {t("landing.hero.subtitle", { lng: lang })}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/">{t("landing.cta", { lng: lang })}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/wedding/local">
              {t("landing.hero.try_local", { lng: lang })}
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("landing.hero.local_hint", { lng: lang })}
        </p>
      </div>
      <PlannerPreview lang={lang} />
    </section>
  )
}
