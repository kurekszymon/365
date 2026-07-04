import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import type { Lang } from "./LocaleLanding"
import { Button } from "@/components/ui/button"

export function LandingCta({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16 lg:pb-24">
      <div className="flex flex-col items-center gap-6 rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground">
        <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">
          {t("landing.cta_band.title", { lng: lang })}
        </h2>
        <p className="max-w-prose text-primary-foreground/80">
          {t("landing.cta_band.subtitle", { lng: lang })}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="secondary">
            <Link to="/">{t("landing.cta", { lng: lang })}</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <Link to="/wedding/local">
              {t("landing.hero.try_local", { lng: lang })}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
