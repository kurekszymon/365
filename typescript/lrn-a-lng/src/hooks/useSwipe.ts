import { useRef, useCallback, type RefObject } from "react"

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

const MIN_DISTANCE = 50
const MAX_VERTICAL = 100

export function useSwipe<T extends HTMLElement>(
  handlers: SwipeHandlers,
): {
  ref: RefObject<T | null>
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
} {
  const ref = useRef<T | null>(null)
  const startX = useRef(0)
  const startY = useRef(0)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX.current
      const dy = Math.abs(e.changedTouches[0].clientY - startY.current)

      if (Math.abs(dx) < MIN_DISTANCE || dy > MAX_VERTICAL) return

      if (dx > 0) {
        handlers.onSwipeRight?.()
      } else {
        handlers.onSwipeLeft?.()
      }
    },
    [handlers],
  )

  return { ref, onTouchStart, onTouchEnd }
}
