import { useTranslation } from "react-i18next"
import { MapPin, Package, Truck } from "lucide-react"
import { TRANSPORT_EMAIL, transportMailto } from "./transportMailto"
import type { Lang } from "@/components/landing/LocaleLanding"
import { Button } from "@/components/ui/button"

export function TransportHero({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
      <div className="flex flex-col items-start gap-6">
        <p className="flex items-center gap-2 text-sm font-medium tracking-widest text-primary uppercase">
          <MapPin className="size-4" />
          {t("transport.hero.eyebrow", { lng: lang })}
        </p>
        <h1 className="font-heading text-4xl leading-tight font-semibold text-balance sm:text-5xl lg:text-6xl">
          {t("transport.hero.title", { lng: lang })}
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          {t("transport.hero.subtitle", { lng: lang })}
        </p>
        <div className="flex flex-col items-start gap-2">
          <Button asChild size="lg">
            <a href={transportMailto(lang)}>
              {t("transport.contact", { lng: lang })}
            </a>
          </Button>
          <p className="text-sm text-muted-foreground">{TRANSPORT_EMAIL}</p>
        </div>
      </div>
      <div
        aria-hidden
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl border bg-card/50"
      >
        <div className="absolute inset-x-8 top-1/2 h-px border-t border-dashed border-primary/40" />
        <div className="relative flex w-full items-center justify-between px-8">
          <span className="flex size-16 items-center justify-center rounded-full border bg-background text-primary shadow-sm">
            <Package className="size-7" />
          </span>
          <span className="flex size-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
            <Truck className="size-11" />
          </span>
          <span className="flex size-16 items-center justify-center rounded-full border bg-background font-heading text-lg font-semibold shadow-sm">
            ew.
          </span>
        </div>
      </div>
    </section>
  )
}
