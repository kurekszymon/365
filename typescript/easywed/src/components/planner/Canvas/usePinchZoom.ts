import { usePinch } from "@use-gesture/react"
import { useViewStore } from "@/stores/view.store"

const ZOOM_MIN = 0.2
const ZOOM_MAX = 8

/**
 * Owns all canvas zoom: two-finger pinch on touch devices, and trackpad pinch /
 * Ctrl+Cmd + wheel on desktop (`@use-gesture` maps those to the same pinch
 * gesture). Builds from the current store zoom (`from`) so a gesture scales
 * relative to where it started, and writes the absolute zoom via `setZoom`.
 */
export function usePinchZoom(containerEl: HTMLElement | null) {
  const setZoom = useViewStore((state) => state.setZoom)

  usePinch(
    ({ offset: [scale] }) => {
      setZoom(scale)
    },
    {
      target: containerEl ?? undefined,
      eventOptions: { passive: false },
      scaleBounds: { min: ZOOM_MIN, max: ZOOM_MAX },
      // Desktop wheel-zoom requires a modifier so plain scrolling isn't hijacked.
      modifierKey: ["ctrlKey", "metaKey"],
      // Read the live zoom at gesture start so the pinch is relative to it.
      from: () => [useViewStore.getState().zoom, 0],
    }
  )
}
