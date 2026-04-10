import { useCallback, useEffect } from "react"

export function useCanvasZoom(
  containerEl: HTMLElement | null,
  stepZoom: (direction: 1 | -1) => void
) {
  const onWheel = useCallback(
    (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return

      e.preventDefault()
      e.stopPropagation()

      stepZoom(e.deltaY > 0 ? -1 : 1)
    },
    [stepZoom]
  )

  useEffect(() => {
    if (!containerEl) return

    containerEl.addEventListener("wheel", onWheel, { passive: false })

    return () => containerEl.removeEventListener("wheel", onWheel)
  }, [containerEl, onWheel])
}
