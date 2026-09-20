import { useTranslation } from "react-i18next"
import { LandingLoop } from "./LandingLoop"
import type { LoopName } from "./LandingLoop"
import type { Lang } from "./LocaleLanding"

// Two rows that each show one thing the planner does, as a rendered loop of
// the real app beside the sentence that says what you are watching.
//
// The rows alternate sides on desktop, which is what the `lg:order-first` on
// every other loop is for. In DOM order the caption comes first, so on mobile
// - one column, no ordering - each loop is introduced by the heading that says
// what it is. The loop used to come first there, on the theory that the video
// is what stops the scroll; what it actually produced was the hero loop and
// this one stacked back to back, two silent videos deep before any heading
// explains either.
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
            <div className="flex flex-col gap-4">
              <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">
                {t(`landing.stories.${key}.title`, { lng: lang })}
              </h2>
              <p className="max-w-prose leading-relaxed text-muted-foreground">
                {t(`landing.stories.${key}.desc`, { lng: lang })}
              </p>
            </div>
            <LandingLoop
              name={loop}
              lang={lang}
              className={i % 2 === 0 ? "lg:order-first" : undefined}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
