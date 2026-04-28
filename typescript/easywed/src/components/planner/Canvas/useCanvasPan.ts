import { useRef, useState } from "react"
import type React from "react"
import type { Position } from "@/stores/planner.store"

export function useCanvasPan(pan: Position, setPan: (p: Position) => void) {
  const [isPanning, setIsPanning] = useState(false)
  const offsetRef = useRef<Position | null>(null)

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0 || !e.isPrimary) return
    if (
      (e.target as HTMLElement).closest(
        '[data-no-pan], [data-canvas-element-kind="table"], [data-canvas-element-kind="fixture"]'
      )
    )
      return

    offsetRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    setIsPanning(true)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!offsetRef.current) return

    setPan({
      x: e.clientX - offsetRef.current.x,
      y: e.clientY - offsetRef.current.y,
    })
  }

  function onPointerUp() {
    if (!offsetRef.current) return

    offsetRef.current = null
    setIsPanning(false)
  }

  return { isPanning, onPointerDown, onPointerMove, onPointerUp }
}
