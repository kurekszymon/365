import { useCallback, useEffect, useRef, useState } from "react"
import { createVelocityTracker, stepAxis } from "./momentum"
import type React from "react"
import type { Position } from "@/stores/planner.store"

// Pointer travel (px) before a press-and-hold on the background turns into a
// pan. Below this it's a click (selecting/deselecting an element) - without the
// threshold the sub-pixel jitter of a "still" click would start (and instantly
// end) a pan and swallow the click.
const PAN_START_THRESHOLD_PX = 4

// A release slower than this (px/s) just stops, rather than gliding a hair.
const MIN_FLING_VELOCITY = 50

// A rAF gap longer than this (tab switch, long task) is treated as one frame,
// so the glide resumes where it was instead of leaping ahead.
const MAX_FRAME_MS = 32

type CanvasPanOptions = {
  /** Live pan from the store - read at gesture start and on every glide frame. */
  getPan: () => Position
  /** Writes the pan as given - this hook clamps before writing. */
  setPan: (p: Position) => void
  clampPan: (p: Position) => Position
}

export function useCanvasPan(options: CanvasPanOptions) {
  const [isPanning, setIsPanning] = useState(false)
  // The canvas re-renders every frame of a pan, so the latest clamp closures are read through a ref instead of being captured at press time.
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })
  // Pointers currently down, so a two-finger pinch (handled by Canvas's usePinch)
  // doesn't also pan.
  const pointers = useRef(new Set<number>())
  // The in-flight drag's controller; aborting it tears the whole drag down.
  const abortRef = useRef<AbortController | null>(null)
  const glideRef = useRef(0)

  const stopGlide = useCallback(() => {
    if (glideRef.current) cancelAnimationFrame(glideRef.current)
    glideRef.current = 0
  }, [])

  function bounds() {
    const { clampPan } = optionsRef.current
    // clampPan of ±Infinity is exactly the per-axis min/max.
    return {
      min: clampPan({ x: -Infinity, y: -Infinity }),
      max: clampPan({ x: Infinity, y: Infinity }),
    }
  }

  // Carries the release velocity into a decaying glide that stops at the edge.
  // Yields as soon as anything else writes the
  // pan (wheel, pinch, minimap, zoom reset) - the newest input always wins.
  function startGlide(velocity: Position) {
    const start = optionsRef.current.getPan()
    let x = { value: start.x, velocity: velocity.x }
    let y = { value: start.y, velocity: velocity.y }
    let written = start
    let last: number | null = null

    const tick = (now: number) => {
      const { getPan, setPan } = optionsRef.current
      const current = getPan()
      if (current.x !== written.x || current.y !== written.y) {
        glideRef.current = 0
        return
      }
      const dt = last === null ? 16 : Math.min(now - last, MAX_FRAME_MS)
      last = now
      const { min, max } = bounds()
      const nx = stepAxis(x, dt, min.x, max.x)
      const ny = stepAxis(y, dt, min.y, max.y)
      x = nx
      y = ny
      written = { x: nx.value, y: ny.value }
      setPan(written)
      if (nx.atRest && ny.atRest) {
        glideRef.current = 0
        return
      }
      glideRef.current = requestAnimationFrame(tick)
    }
    glideRef.current = requestAnimationFrame(tick)
  }

  /**
   * Returns true when the press caught a glide in flight. That press is a
   * "stop", not a tap, so the caller should not treat its click as a selection.
   */
  function onPointerDown(e: React.PointerEvent): boolean {
    const caughtGlide = glideRef.current !== 0
    // Any touch on the canvas stops the glide where it is - the content is
    // grabbed from its on-screen position, not from where it was heading.
    stopGlide()

    pointers.current.add(e.pointerId)
    // A second pointer means a pinch is starting - cancel any nascent pan.
    if (pointers.current.size > 1) {
      abortRef.current?.abort()
      return caughtGlide
    }
    if (e.button !== 0 || !e.isPrimary) return caughtGlide
    if (
      (e.target as HTMLElement).closest(
        '[data-no-pan], [data-canvas-element-kind="table"], [data-canvas-element-kind="fixture"]'
      )
    )
      return caughtGlide

    // The listeners below live for exactly this drag, so they just close over
    // these locals - no refs needed to reach the start point or the
    // crossed-threshold flag.
    const startX = e.clientX
    const startY = e.clientY
    const startPan = optionsRef.current.getPan()
    const pointerType = e.pointerType
    let moved = false
    let released = false
    const tracker = createVelocityTracker()
    tracker.add(e.timeStamp, startX, startY)

    const controller = new AbortController()
    const { signal } = controller
    abortRef.current = controller

    // pointermove fires at the device rate (500+Hz on some mice) while React
    // paints once per frame, so committing every event queues wasted renders.
    // Coalesce: keep the latest position, flush one setPan per animation frame.
    let rafId = 0
    let pending: Position | null = null
    const flush = () => {
      rafId = 0
      if (pending) optionsRef.current.setPan(pending)
      pending = null
    }

    const onMove = (ev: PointerEvent) => {
      // A mouse released outside the window never delivers pointerup here, so
      // the drag would stay live and leak its listener on the next press. A move
      // with no buttons held means the release was missed; touch always reports
      // buttons while in contact.
      if (ev.pointerType === "mouse" && ev.buttons === 0) {
        released = true
        controller.abort()
        return
      }
      tracker.add(ev.timeStamp, ev.clientX, ev.clientY)
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
      // clamp limit and back follows the pointer without drift.
      pending = optionsRef.current.clampPan({
        x: startPan.x + dx,
        y: startPan.y + dy,
      })
      if (!rafId) rafId = requestAnimationFrame(flush)
    }
    const release = (ev: PointerEvent) => {
      pointers.current.delete(ev.pointerId)
      if (pointers.current.size === 0) {
        released = true
        tracker.add(ev.timeStamp, ev.clientX, ev.clientY)
        controller.abort()
      }
    }

    // Listen on window, not the canvas element, so the pan keeps tracking when
    // the pointer crosses the overlay toolbar or leaves the canvas - a mouse
    // gets no implicit pointer capture there.
    window.addEventListener("pointermove", onMove, { signal })
    window.addEventListener("pointerup", release, { signal })
    window.addEventListener("pointercancel", release, { signal })
    document.body.style.userSelect = "none"

    // One teardown for every way the drag can end (release, pinch, unmount):
    // aborting the controller removes the listeners and runs this.
    signal.addEventListener("abort", () => {
      // Land on the exact release position instead of dropping the last
      // coalesced move on the floor.
      if (rafId) cancelAnimationFrame(rafId)
      flush()
      abortRef.current = null
      document.body.style.userSelect = ""
      document.body.classList.remove("is-panning")
      setIsPanning(false)
      // Pinch or unmount: no glide.
      if (!moved || !released) return
      // A mouse drag is precise placement, so it stops where it is let go;
      // touch and pen carry their momentum, like any scroll view.
      const v =
        pointerType === "mouse"
          ? { x: 0, y: 0 }
          : tracker.velocity(performance.now())
      if (Math.hypot(v.x, v.y) >= MIN_FLING_VELOCITY) startGlide(v)
    })
    return caughtGlide
  }

  // Pointers that never started a pan (a tap on a table/fixture/toolbar) get no
  // window listeners - clear them here so the pinch guard doesn't get stuck.
  function onPointerUp(e: { pointerId: number }) {
    pointers.current.delete(e.pointerId)
  }

  // Abandon a drag or glide in progress if the canvas unmounts.
  useEffect(
    () => () => {
      abortRef.current?.abort()
      stopGlide()
    },
    [stopGlide]
  )

  return {
    isPanning,
    stopGlide,
    onPointerDown,
    onPointerUp,
  }
}
