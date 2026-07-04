import {
  Armchair,
  BellRing,
  FileSpreadsheet,
  HeartHandshake,
  Sparkles,
  Users,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import type { LucideIcon } from "lucide-react"
import type { Lang } from "./LocaleLanding"

const FEATURES: Array<{ key: string; icon: LucideIcon }> = [
  { key: "planner", icon: Armchair },
  { key: "guests", icon: Users },
  { key: "import", icon: FileSpreadsheet },
  { key: "collab", icon: HeartHandshake },
  { key: "reminders", icon: BellRing },
  { key: "assistant", icon: Sparkles },
]

export function LandingFeatures({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  return (
    <section className="border-y bg-card/50">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">
            {t("landing.features.title", { lng: lang })}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {t("landing.features.subtitle", { lng: lang })}
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <h3 className="font-medium">
                {t(`landing.features.${key}.title`, { lng: lang })}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`landing.features.${key}.desc`, { lng: lang })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
