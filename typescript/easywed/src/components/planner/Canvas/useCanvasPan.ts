import { useEffect, useRef, useState } from "react"
import type React from "react"
import type { Position } from "@/stores/planner.store"

// Pointer travel (px) before a press-and-hold on the background turns into a
// pan. Below this it's a click (selecting/deselecting an element) — without the
// threshold the sub-pixel jitter of a "still" click would start (and instantly
// end) a pan and swallow the click.
const PAN_START_THRESHOLD_PX = 4

export function useCanvasPan(pan: Position, setPan: (p: Position) => void) {
  const [isPanning, setIsPanning] = useState(false)
  // Pointers currently down, so a two-finger pinch (handled by usePinchZoom)
  // doesn't also pan.
  const pointers = useRef(new Set<number>())
  // The in-flight drag's controller; aborting it tears the whole drag down.
  const abortRef = useRef<AbortController | null>(null)

  function onPointerDown(e: React.PointerEvent) {
    pointers.current.add(e.pointerId)
    // A second pointer means a pinch is starting — cancel any nascent pan.
    if (pointers.current.size > 1) {
      abortRef.current?.abort()
      return
    }
    if (e.button !== 0 || !e.isPrimary) return
    if (
      (e.target as HTMLElement).closest(
        '[data-no-pan], [data-canvas-element-kind="table"], [data-canvas-element-kind="fixture"]'
      )
    )
      return

    // The listeners below live for exactly this drag, so they just close over
    // these locals — no refs needed to reach the start point, setPan, or the
    // crossed-threshold flag.
    const startX = e.clientX
    const startY = e.clientY
    const startPan = pan
    let moved = false

    const controller = new AbortController()
    const { signal } = controller
    abortRef.current = controller

    const onMove = (ev: PointerEvent) => {
      // A mouse released outside the window never delivers pointerup here, so
      // the drag would otherwise stay live (and leak its listener on the next
      // press). A move with no buttons held means the release was missed —
      // tear the drag down. Touch always reports buttons while in contact.
      if (ev.pointerType === "mouse" && ev.buttons === 0) {
        controller.abort()
        return
      }
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (!moved) {
        if (Math.hypot(dx, dy) <= PAN_START_THRESHOLD_PX) return
        moved = true
        setIsPanning(true)
        // Force the grabbing cursor everywhere for the rest of the drag (see
        // body.is-panning in styles.css) so it doesn't flip over the toolbar.
        document.body.classList.add("is-panning")
      }
      // Tracking from the start keeps the offset absolute, so dragging past the
      // clamp limit and back follows the cursor without drift.
      setPan({ x: startPan.x + dx, y: startPan.y + dy })
    }
    const release = (ev: PointerEvent) => {
      pointers.current.delete(ev.pointerId)
      if (pointers.current.size === 0) controller.abort()
    }

    // Listen on window (not the canvas element) so the pan keeps tracking once
    // the pointer crosses the overlay toolbar or leaves the canvas — a mouse
    // gets no implicit pointer capture there. setPan clamps, so the hall just
    // pins to its last valid spot instead of freezing and jumping back.
    window.addEventListener("pointermove", onMove, { signal })
    window.addEventListener("pointerup", release, { signal })
    window.addEventListener("pointercancel", release, { signal })
    document.body.style.userSelect = "none"

    // One teardown for every way the drag can end (release, pinch, unmount):
    // aborting the controller removes the listeners and runs this.
    signal.addEventListener("abort", () => {
      abortRef.current = null
      document.body.style.userSelect = ""
      document.body.classList.remove("is-panning")
      setIsPanning(false)
    })
  }

  // Pointers that never started a pan (a tap on a table/fixture/toolbar) get no
  // window listeners — clear them here so the pinch guard doesn't get stuck.
  function onPointerUp(e: { pointerId: number }) {
    pointers.current.delete(e.pointerId)
  }

  // Abandon a drag in progress if the canvas unmounts.
  useEffect(() => () => abortRef.current?.abort(), [])

  return { isPanning, onPointerDown, onPointerUp }
}
