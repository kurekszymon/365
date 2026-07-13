import { useEffect, useRef } from "react"
import type { Position } from "@/stores/planner.store"

// Fallback px-per-unit for the rare wheel that reports deltas in lines (mode 1)
// or pages (mode 2) instead of pixels — mostly old mouse wheels. Trackpads
// report pixels (mode 0), so this is a no-op for the two-finger case.
const LINE_HEIGHT_PX = 16

// Two-finger trackpad panning (and plain mouse-wheel scroll). A trackpad swipe
// arrives as a `wheel` event carrying deltaX/deltaY, which we translate straight
// into a pan offset. Pinch-to-zoom on a trackpad arrives as ctrl+wheel, which
// `usePinch` already owns — we skip those so the two gestures don't fight.
export function useCanvasWheelPan(
  containerEl: HTMLElement | null,
  getPan: () => Position,
  setPan: (p: Position) => void
) {
  // Keep the latest callbacks in refs so the native listener (registered once
  // per container) always calls through to the current clamp/pan closures
  // without being torn down and re-added on every render.
  const getPanRef = useRef(getPan)
  const setPanRef = useRef(setPan)
  useEffect(() => {
    getPanRef.current = getPan
    setPanRef.current = setPan
  })

  useEffect(() => {
    if (!containerEl) return

    // Wheel events can outpace paint, so accumulate deltas and commit at most
    // one setPan per animation frame (mirrors the coalescing in useCanvasPan).
    let rafId = 0
    let accX = 0
    let accY = 0
    const flush = () => {
      rafId = 0
      const pan = getPanRef.current()
      setPanRef.current({ x: pan.x - accX, y: pan.y - accY })
      accX = 0
      accY = 0
    }

    const onWheel = (e: WheelEvent) => {
      // ctrl/meta wheel is pinch-zoom (owned by usePinch) — leave it alone.
      if (e.ctrlKey || e.metaKey) return
      e.preventDefault()
      const factor =
        e.deltaMode === 1
          ? LINE_HEIGHT_PX
          : e.deltaMode === 2
            ? containerEl.clientHeight
            : 1
      accX += e.deltaX * factor
      accY += e.deltaY * factor
      if (!rafId) rafId = requestAnimationFrame(flush)
    }

    // passive:false so preventDefault can stop the page from scrolling and, on
    // horizontal swipes, block the browser's back/forward navigation gesture.
    containerEl.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      containerEl.removeEventListener("wheel", onWheel)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [containerEl])
}
