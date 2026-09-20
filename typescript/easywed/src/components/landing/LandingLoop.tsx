import { useEffect, useRef, useState } from "react"
import type { Lang } from "./LocaleLanding"

export type LoopName = "swap" | "scale" | "shape"

// A rendered loop of the real planner (from the Remotion project next door),
// standing in for the CSS mock the hero used to draw. It is decorative: the
// caption beside it carries the meaning, so the element is aria-hidden and
// there are no controls.
//
// Three things keep it cheap and quiet:
//   - `preload="none"` plus an IntersectionObserver, so a loop below the fold
//     costs nothing until it is actually scrolled to, and pauses again on the
//     way out;
//   - `prefers-reduced-motion`, which swaps the video out for its poster
//     entirely - the <video> is never mounted, so nothing decodes;
//   - SSR safety: `reduced` starts false and is only ever set from an effect,
//     so the server and the first client render agree, and the poster-only
//     branch appears after hydration rather than mismatching it.
export function LandingLoop({
  name,
  lang,
  className,
}: {
  name: LoopName
  lang: Lang
  className?: string
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [reduced, setReduced] = useState(false)

  const src = `/landing/${lang}/easywed-${name}.mp4`
  const poster = `/landing/${lang}/easywed-${name}-poster.png`

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (reduced || el === null) return

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
  }, [reduced])

  const shell =
    "aspect-video w-full overflow-hidden rounded-2xl border bg-background object-cover shadow-xl"

  if (reduced) {
    return (
      <img
        aria-hidden
        alt=""
        src={poster}
        className={shell + (className ? " " + className : "")}
      />
    )
  }

  return (
    <video
      ref={ref}
      aria-hidden
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      src={src}
      className={shell + (className ? " " + className : "")}
    />
  )
}
