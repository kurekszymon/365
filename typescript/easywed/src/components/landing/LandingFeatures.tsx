import {
  BellRing,
  FileSpreadsheet,
  HeartHandshake,
  Layers,
  Printer,
  Sparkles,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import type { LucideIcon } from "lucide-react"
import type { Lang } from "./LocaleLanding"

// The rest of the app, as one-liners. This used to be a six-card grid of the
// headline features; the hero and the two story rows now carry those, so what
// is left is the things a couple finds once they are inside - deliberately a
// plain list rather than cards, so it reads as "also in there" and not as a
// second pitch.
const FEATURES: Array<{ key: string; icon: LucideIcon }> = [
  { key: "import", icon: FileSpreadsheet },
  { key: "print", icon: Printer },
  { key: "invite", icon: HeartHandshake },
  { key: "reminders", icon: BellRing },
  { key: "assistant", icon: Sparkles },
  { key: "halls", icon: Layers },
]

export function LandingFeatures({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  return (
    <section className="border-y bg-card/50">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
        <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">
          {t("landing.features.title", { lng: lang })}
        </h2>
        <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {FEATURES.map(({ key, icon: Icon }) => (
            <li key={key} className="flex items-start gap-4">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-4.5" />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-medium">
                  {t(`landing.features.${key}.title`, { lng: lang })}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(`landing.features.${key}.desc`, { lng: lang })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
