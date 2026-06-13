import { useRef, useState } from "react"
import type React from "react"
import type { Position } from "@/stores/planner.store"

// Pointer travel (px) before a press-and-hold on the background turns into a
// pan. Below this, it's a click (e.g. selecting/deselecting an element) —
// without the threshold, the natural sub-pixel jitter of a "still" click would
// start (and instantly end) a pan, swallowing the click.
const PAN_START_THRESHOLD_PX = 4

export function useCanvasPan(pan: Position, setPan: (p: Position) => void) {
  const [isPanning, setIsPanning] = useState(false)
  const startRef = useRef<{
    clientX: number
    clientY: number
    pan: Position
  } | null>(null)
  // Track concurrent pointers so a two-finger pinch (handled by usePinchZoom)
  // doesn't also drag the canvas around.
  const activePointers = useRef(new Set<number>())

  function onPointerDown(e: React.PointerEvent) {
    activePointers.current.add(e.pointerId)
    // A second pointer means a pinch is starting — abort any nascent pan.
    if (activePointers.current.size > 1) {
      startRef.current = null
      setIsPanning(false)
      return
    }
    if (e.button !== 0 || !e.isPrimary) return
    if (
      (e.target as HTMLElement).closest(
        '[data-no-pan], [data-canvas-element-kind="table"], [data-canvas-element-kind="fixture"]'
      )
    )
      return

    startRef.current = { clientX: e.clientX, clientY: e.clientY, pan }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (activePointers.current.size > 1) return
    const start = startRef.current
    if (!start) return

    const dx = e.clientX - start.clientX
    const dy = e.clientY - start.clientY

    if (!isPanning) {
      if (Math.hypot(dx, dy) <= PAN_START_THRESHOLD_PX) return
      setIsPanning(true)
    }

    setPan({ x: start.pan.x + dx, y: start.pan.y + dy })
  }

  function onPointerUp(e?: React.PointerEvent) {
    if (e) activePointers.current.delete(e.pointerId)
    if (!startRef.current) return

    startRef.current = null
    setIsPanning(false)
  }

  return { isPanning, onPointerDown, onPointerMove, onPointerUp }
}
