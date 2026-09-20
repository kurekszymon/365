import { useTranslation } from "react-i18next"
import { LandingLoop } from "./LandingLoop"
import type { LoopName } from "./LandingLoop"
import type { Lang } from "./LocaleLanding"

// Two rows that each show one thing the planner does, as a rendered loop of
// the real app beside the sentence that says what you are watching. The rows
// alternate sides on desktop; on mobile the loop always comes first, because
// the video is what stops the scroll.
const STORIES: Array<{ key: string; loop: LoopName }> = [
  { key: "scale", loop: "scale" },
  { key: "shape", loop: "shape" },
]

export function LandingStories({ lang }: { lang: Lang }) {
  const { t } = useTranslation()

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
      <div className="flex flex-col gap-16 lg:gap-24">
        {STORIES.map(({ key, loop }, i) => (
          <div
            key={key}
            className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
          >
            <LandingLoop
              name={loop}
              lang={lang}
              className={i % 2 === 1 ? "lg:order-2" : undefined}
            />
            <div className="flex flex-col gap-4">
              <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">
                {t(`landing.stories.${key}.title`, { lng: lang })}
              </h2>
              <p className="max-w-prose leading-relaxed text-muted-foreground">
                {t(`landing.stories.${key}.desc`, { lng: lang })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
