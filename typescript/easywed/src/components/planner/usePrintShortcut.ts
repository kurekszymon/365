import { useEffect } from "react"
import { flushSync } from "react-dom"
import { usePrintStore } from "@/stores/print.store"
import { useViewStore } from "@/stores/view.store"

// Intercept the native Cmd/Ctrl+P quick print so the printed hall layout includes
// seats iff they're currently enabled in the planner (view.store.showSeats). There
// is no prompt on this path, so empty seats are shown (seatsShowEmpty: true).
export const usePrintShortcut = () => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "p"
      ) {
        e.preventDefault()
        flushSync(() => {
          const view = useViewStore.getState()
          usePrintStore.getState().setSeatOptions({
            includeSeats: view.showSeats,
            seatsShowEmpty: true,
          })
          usePrintStore.getState().setLayoutOptions({
            includeGrid: view.gridStyle !== "off",
            showHallOutline: true,
            fitToContent: false,
          })
        })
        window.print()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
}
