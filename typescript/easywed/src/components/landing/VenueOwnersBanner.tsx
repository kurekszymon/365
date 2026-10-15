import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { Lang } from "./LocaleLanding"
import { Button } from "@/components/ui/button"
import { localeDocPath } from "@/lib/site"

// Cross-sell strip on the couples landing pointing venue owners at the B2B
// page (/pl/venues, /en/venues).
export function VenueOwnersBanner({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16 lg:pb-20">
      <div className="flex flex-col items-start gap-6 rounded-2xl border bg-card p-8 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-2xl font-semibold text-balance">
            {t("landing.venues_banner.title", { lng: lang })}
          </h2>
          <p className="max-w-prose text-muted-foreground">
            {t("landing.venues_banner.subtitle", { lng: lang })}
          </p>
        </div>
        <Button asChild size="lg" variant="outline" className="shrink-0">
          <Link to={localeDocPath("venues", lang)}>
            {t("landing.venues_banner.cta", { lng: lang })}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
