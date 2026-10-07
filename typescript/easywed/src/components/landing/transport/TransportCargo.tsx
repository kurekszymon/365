import { Flower2, Gift, Mail, Wine } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { LucideIcon } from "lucide-react"
import type { Lang } from "@/components/landing/LocaleLanding"

const CARGO: Array<{ key: string; icon: LucideIcon }> = [
  { key: "decor", icon: Flower2 },
  { key: "drinks", icon: Wine },
  { key: "stationery", icon: Mail },
  { key: "gifts", icon: Gift },
]

export function TransportCargo({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  return (
    <section className="border-y bg-card/50">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">
            {t("transport.cargo.title", { lng: lang })}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {t("transport.cargo.subtitle", { lng: lang })}
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CARGO.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <h3 className="font-medium">
                {t(`transport.cargo.${key}.title`, { lng: lang })}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`transport.cargo.${key}.desc`, { lng: lang })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
