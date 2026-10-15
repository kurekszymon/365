import { useCallback, useEffect, useRef } from "react"
import { springStep } from "./momentum"
import type { Axis } from "./momentum"
import type { Position } from "@/stores/planner.store"
import { steppedZoom, useViewStore } from "@/stores/view.store"

// Slightly snappier than the overscroll spring: a button press wants the view
// to answer quickly, not drift there.
const CAMERA_RESPONSE_S = 0.35
const MAX_FRAME_MS = 32
// Rest thresholds per unit: pan in px, zoom in log space (0.001 ≈ 0.1%).
const REST_PAN_PX = 0.5
const REST_LOG_ZOOM = 0.001

type Camera = { zoom: number; pan: Position }

type Flight = {
  target: Camera
  logZoom: Axis
  x: Axis
  y: Axis
  written: Camera
  last: number | null
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * Springs the canvas camera (zoom + pan) to a target instead of jumping, so
 * the view keeps its spatial context through a zoom step, reset or fit.
 *
 * - Zoom springs in log space, so zooming 0.5→1 feels like 1→2.
 * - A new target mid-flight re-targets from the live position and velocity
 *   (rapid +/+/+ clicks accumulate smoothly), rather than restarting.
 * - Any other camera write (pinch, wheel, pan, minimap) takes over: the flight
 *   notices the store no longer holds what it last wrote and stops.
 * - Under `prefers-reduced-motion` the camera jumps, as it used to.
 */
export function useCameraAnimation(
  clampPanAt: (p: Position, zoom: number) => Position,
  /** Stops other camera motion (the pan glide) so the two don't trade frames. */
  onStart: () => void
) {
  const clampRef = useRef(clampPanAt)
  const onStartRef = useRef(onStart)
  useEffect(() => {
    clampRef.current = clampPanAt
    onStartRef.current = onStart
  })
  const flightRef = useRef<Flight | null>(null)
  const rafRef = useRef(0)

  const cancel = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    flightRef.current = null
  }, [])

  const animateTo = useCallback(
    (target: Camera) => {
      onStartRef.current()
      const { zoom, pan, setZoom, setPan } = useViewStore.getState()
      if (prefersReducedMotion()) {
        cancel()
        setZoom(target.zoom)
        setPan(clampRef.current(target.pan, target.zoom))
        return
      }

      // Re-target an existing flight in place: its velocity carries over.
      const flight = flightRef.current
      if (flight) {
        flight.target = target
        return
      }

      flightRef.current = {
        target,
        logZoom: { value: Math.log(zoom), velocity: 0 },
        x: { value: pan.x, velocity: 0 },
        y: { value: pan.y, velocity: 0 },
        written: { zoom, pan },
        last: null,
      }

      const tick = (now: number) => {
        const f = flightRef.current
        if (!f) return
        const state = useViewStore.getState()
        if (
          state.zoom !== f.written.zoom ||
          state.pan.x !== f.written.pan.x ||
          state.pan.y !== f.written.pan.y
        ) {
          // Someone else moved the camera - theirs is the newer intent.
          rafRef.current = 0
          flightRef.current = null
          return
        }
        const dt = f.last === null ? 16 : Math.min(now - f.last, MAX_FRAME_MS)
        f.last = now

        const logTarget = Math.log(f.target.zoom)
        f.logZoom = springStep(f.logZoom, dt, logTarget, CAMERA_RESPONSE_S)
        f.x = springStep(f.x, dt, f.target.pan.x, CAMERA_RESPONSE_S)
        f.y = springStep(f.y, dt, f.target.pan.y, CAMERA_RESPONSE_S)

        const done =
          Math.abs(f.logZoom.value - logTarget) < REST_LOG_ZOOM &&
          Math.abs(f.x.value - f.target.pan.x) < REST_PAN_PX &&
          Math.abs(f.y.value - f.target.pan.y) < REST_PAN_PX

        const zoomNow = done ? f.target.zoom : Math.exp(f.logZoom.value)
        const panNow = clampRef.current(
          done ? f.target.pan : { x: f.x.value, y: f.y.value },
          zoomNow
        )
        state.setZoom(zoomNow)
        state.setPan(panNow)
        // Read back what the store kept (setZoom clamps), so the takeover
        // check above compares like with like.
        const kept = useViewStore.getState()
        f.written = { zoom: kept.zoom, pan: kept.pan }

        if (done) {
          rafRef.current = 0
          flightRef.current = null
          return
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    [cancel]
  )

  /** Zoom one button step, from where an in-flight zoom is heading. */
  const stepZoom = useCallback(
    (direction: 1 | -1) => {
      const { zoom, pan } = useViewStore.getState()
      const from = flightRef.current?.target ?? { zoom, pan }
      animateTo({ zoom: steppedZoom(from.zoom, direction), pan: from.pan })
    },
    [animateTo]
  )

  useEffect(() => cancel, [cancel])

  return { animateTo, stepZoom, cancel }
}
