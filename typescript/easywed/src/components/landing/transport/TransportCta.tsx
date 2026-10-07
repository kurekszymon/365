import { useTranslation } from "react-i18next"
import { TRANSPORT_EMAIL, transportMailto } from "./transportMailto"
import type { Lang } from "@/components/landing/LocaleLanding"
import { Button } from "@/components/ui/button"

export function TransportCta({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-24">
      <div className="flex flex-col items-center gap-6 rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground">
        <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">
          {t("transport.cta_band.title", { lng: lang })}
        </h2>
        <p className="max-w-prose text-primary-foreground/80">
          {t("transport.cta_band.subtitle", { lng: lang })}
        </p>
        <Button asChild size="lg" variant="secondary">
          <a href={transportMailto(lang)}>{TRANSPORT_EMAIL}</a>
        </Button>
        <p className="max-w-prose text-xs text-primary-foreground/70">
          {t("transport.cta_band.note", { lng: lang })}
        </p>
      </div>
    </section>
  )
}
