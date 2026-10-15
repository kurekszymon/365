import { useCallback, useEffect, useLayoutEffect, useRef } from "react"
import { springStep } from "./momentum"
import type { Axis } from "./momentum"

// Short and critically damped: the gap being closed is at most about half a
// snap step (or a clamp back inside the hall), so it should read as "clicked
// into place", not as the table drifting.
const SETTLE_RESPONSE_S = 0.25
const REST_PX = 0.25
const MAX_FRAME_MS = 32
// A recorded drop the element never picked up (deleted mid-drop, say) must
// not ambush a later, unrelated drag of the same id.
const PENDING_TTL_MS = 200

type Offset = { x: number; y: number }

const pending = new Map<string, { offset: Offset; at: number }>()
const flights = new Map<
  string,
  { el: HTMLElement; x: Axis; y: Axis; raf: number }
>()

/**
 * Records, at drop time, the px gap between where the user let go (the drag
 * delta) and where the entity was actually committed (snapped and clamped).
 * The entity's next layout effect picks it up and closes the gap with a
 * spring instead of jumping.
 */
export function markDropSettle(key: string, offset: Offset) {
  if (Math.abs(offset.x) < REST_PX && Math.abs(offset.y) < REST_PX) return
  pending.set(key, { offset, at: performance.now() })
}

function stopFlight(key: string, el?: HTMLElement | null) {
  const flight = flights.get(key)
  if (!flight || (el && flight.el !== el)) return
  cancelAnimationFrame(flight.raf)
  flight.el.style.translate = ""
  flights.delete(key)
}

function startFlight(key: string, el: HTMLElement, offset: Offset) {
  stopFlight(key)
  const flight = {
    el,
    x: { value: offset.x, velocity: 0 },
    y: { value: offset.y, velocity: 0 },
    raf: 0,
  }
  flights.set(key, flight)
  // Painted before the browser shows the committed position, so the first
  // frame the user sees is the entity still where they let go of it.
  el.style.translate = `${offset.x}px ${offset.y}px`

  let last: number | null = null
  const tick = (now: number) => {
    const dt = last === null ? 16 : Math.min(now - last, MAX_FRAME_MS)
    last = now
    flight.x = springStep(flight.x, dt, 0, SETTLE_RESPONSE_S)
    flight.y = springStep(flight.y, dt, 0, SETTLE_RESPONSE_S)
    if (
      Math.abs(flight.x.value) < REST_PX &&
      Math.abs(flight.y.value) < REST_PX
    ) {
      el.style.translate = ""
      flights.delete(key)
      return
    }
    el.style.translate = `${flight.x.value}px ${flight.y.value}px`
    flight.raf = requestAnimationFrame(tick)
  }
  flight.raf = requestAnimationFrame(tick)
}

/**
 * Springs a dropped canvas entity from its release point into its committed
 * position. Returns a ref callback for the element that moves (composed with
 * dnd-kit's `setNodeRef` when given).
 *
 * Uses the CSS `translate` property, which composes with - and is separate
 * from - the `transform` dnd-kit drives during the drag, so the two never
 * fight over one style. Runs in a layout effect so the offset is in place
 * before the committed position paints; it also runs on mount, which covers a
 * drop into another hall (the entity remounts under its new hall).
 */
export function useDropSettle(
  key: string,
  isDragging: boolean,
  setNodeRef?: (node: HTMLElement | null) => void
) {
  const elRef = useRef<HTMLElement | null>(null)
  const ref = useCallback(
    (node: HTMLElement | null) => {
      elRef.current = node
      setNodeRef?.(node)
    },
    [setNodeRef]
  )

  useLayoutEffect(() => {
    const el = elRef.current
    if (!el) return
    if (isDragging) {
      // Grabbed again mid-settle: the drag owns the position now.
      stopFlight(key, el)
      return
    }
    const drop = pending.get(key)
    if (!drop) return
    pending.delete(key)
    if (performance.now() - drop.at > PENDING_TTL_MS) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    startFlight(key, el, drop.offset)
  }, [key, isDragging])

  useEffect(() => {
    const el = elRef.current
    return () => stopFlight(key, el)
  }, [key])

  return ref
}
