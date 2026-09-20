import { Pause, Play } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Lang } from "./LocaleLanding"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type LoopName = "swap" | "scale" | "shape"

// A rendered loop of the real planner (from the Remotion project next door),
// standing in for the CSS mock the hero used to draw. The picture is
// decorative - the caption beside it carries the meaning - so the media itself
// is aria-hidden and the pause control is the only thing a reader reaches.
//
// What keeps it cheap and quiet:
//   - `preload="none"` plus an IntersectionObserver, so the mp4 behind a loop
//     below the fold is not fetched until it is scrolled to, and the loop
//     pauses again on the way out. This does NOT cover the poster: a video's
//     poster is fetched as soon as the element is inserted, whatever `preload`
//     says, which is why the posters are WebP (~20 KB) and not PNG (~220 KB).
//     Three of them sit in the prerendered HTML of every landing page.
//   - `prefers-reduced-motion`, which swaps the mp4 for that same poster in an
//     <img>. It saves the mp4 only - `reduced` starts false for the SSR reason
//     below, so the <video> is in the prerendered HTML and in the first client
//     render, and its poster is already on the wire by the time the
//     post-hydration re-render puts the <img> in its place.
//   - SSR safety: `reduced` starts false and is only ever set from an effect,
//     so the server and the first client render agree, and the poster-only
//     branch appears after hydration rather than mismatching it.
//
// The pause control is WCAG 2.2.2 (Level A): these loops run 12-13 s, well past
// the 5 s that makes auto-starting motion something a reader must be able to
// stop. `prefers-reduced-motion` only serves people who have set that OS
// preference, so it does not discharge this on its own. `paused` outranks the
// observer - once stopped by hand, scrolling away and back leaves it stopped.
export function LandingLoop({
  name,
  lang,
  className,
}: {
  name: LoopName
  lang: Lang
  className?: string
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLVideoElement>(null)
  const [reduced, setReduced] = useState(false)
  const [paused, setPaused] = useState(false)

  const src = `/landing/${lang}/easywed-${name}.mp4`
  const poster = `/landing/${lang}/easywed-${name}-poster.webp`

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (reduced || paused || el === null) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Autoplay can still be refused (a data saver, a browser setting).
          // Nothing to recover here - the poster stays up.
          void el.play().catch(() => {})
        } else {
          el.pause()
        }
      },
      { threshold: 0.25 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [reduced, paused])

  const shell =
    "aspect-video w-full overflow-hidden rounded-2xl border bg-background object-cover shadow-xl"

  if (reduced) {
    return (
      <div className={cn("relative w-full", className)}>
        <img aria-hidden alt="" src={poster} className={shell} />
      </div>
    )
  }

  const toggle = () => {
    const next = !paused
    setPaused(next)
    if (next) ref.current?.pause()
    else void ref.current?.play().catch(() => {})
  }

  const label = t(paused ? "landing.loop.play" : "landing.loop.pause", {
    lng: lang,
  })

  return (
    <div className={cn("relative w-full", className)}>
      <video
        ref={ref}
        aria-hidden
        muted
        loop
        playsInline
        preload="none"
        poster={poster}
        src={src}
        className={shell}
      />
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={toggle}
        aria-label={label}
        title={label}
        className="absolute right-3 bottom-3 rounded-full opacity-80 shadow-md hover:opacity-100 focus-visible:opacity-100"
      >
        {paused ? <Play /> : <Pause />}
      </Button>
    </div>
  )
}
