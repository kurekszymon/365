import { useRef } from "react"
import type { PointerEvent } from "react"

export function useLongPress(delay = 300) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const posRef = useRef<{ clientX: number; clientY: number } | null>(null)
  const targetRef = useRef<HTMLElement | null>(null)

  function start(e: PointerEvent) {
    if (e.pointerType !== "touch") return

    posRef.current = { clientX: e.clientX, clientY: e.clientY }

    targetRef.current = e.currentTarget as HTMLElement

    timerRef.current = setTimeout(() => {
      if (!posRef.current || !targetRef.current) return

      const { clientX, clientY } = posRef.current
      targetRef.current.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          clientX,
          clientY,
          button: 2,
        })
      )
    }, delay)
  }

  function cancel() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    posRef.current = null
    targetRef.current = null
  }

  return { start, cancel }
}
