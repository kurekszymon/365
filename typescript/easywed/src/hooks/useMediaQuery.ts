import { useSyncExternalStore } from "react"

/**
 * Subscribe to a CSS media query. SSR-safe: returns `false` on the server (no
 * `window`), then hydrates to the real match on the client.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}

// Tailwind's `md` breakpoint is 768px, so "mobile" is everything below it.
export const useIsMobile = () => useMediaQuery("(max-width: 767px)")
