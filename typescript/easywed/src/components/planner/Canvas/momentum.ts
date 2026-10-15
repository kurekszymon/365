// Pan physics for the canvas: rubber-banding past the edge while dragging, and
// a per-axis integrator for the post-release glide. X and Y run as independent
// axes so a diagonal flick doesn't desync when one axis hits its bound first.

// Per-millisecond velocity retention for the glide - the scroll-view value.
export const DECELERATION_RATE = 0.998

// Critically damped (no overshoot) return spring for the overscroll. Response
// is the spring's period in seconds: lower is snappier.
const SPRING_RESPONSE_S = 0.4
const SPRING_OMEGA = (2 * Math.PI) / SPRING_RESPONSE_S

// Below this the glide is imperceptible, so the axis is treated as at rest.
const REST_VELOCITY = 10 // px/s
const REST_DISTANCE = 0.5 // px
// Spring integration substep; semi-implicit Euler stays stable well past this.
const MAX_SUBSTEP_MS = 4

/**
 * Progressive resistance past a bound: the further the overshoot, the less the
 * content follows. `dimension` is the viewport size on that axis, which caps
 * how far the content can ever be pulled.
 */
export function rubberband(
  overshoot: number,
  dimension: number,
  constant = 0.55
): number {
  if (dimension <= 0) return 0
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  )
}

/** Applies `rubberband` to whatever part of `value` lies outside [min, max]. */
export function rubberbandClamp(
  value: number,
  min: number,
  max: number,
  dimension: number
): number {
  if (value < min) return min + rubberband(value - min, dimension)
  if (value > max) return max + rubberband(value - max, dimension)
  return value
}

export type Axis = {
  value: number
  /** px/s */
  velocity: number
}

/**
 * Advances one axis by `dtMs`. Inside [min, max] it glides with exponential
 * decay; outside, a critically damped spring pulls it back to the bound it
 * crossed, carrying whatever velocity it had - so a glide that runs into the
 * edge bounces softly instead of stopping dead.
 */
export function stepAxis(
  axis: Axis,
  dtMs: number,
  min: number,
  max: number
): Axis & { atRest: boolean } {
  let { value, velocity } = axis

  if (value >= min && value <= max) {
    velocity *= Math.pow(DECELERATION_RATE, dtMs)
    value += (velocity * dtMs) / 1000
    const inside = value >= min && value <= max
    return {
      value,
      velocity,
      atRest: inside && Math.abs(velocity) < REST_VELOCITY,
    }
  }

  const target = value < min ? min : max
  let remaining = dtMs
  while (remaining > 0) {
    const h = Math.min(remaining, MAX_SUBSTEP_MS) / 1000
    const accel =
      -SPRING_OMEGA * SPRING_OMEGA * (value - target) -
      2 * SPRING_OMEGA * velocity
    velocity += accel * h
    value += velocity * h
    remaining -= MAX_SUBSTEP_MS
  }
  if (
    Math.abs(value - target) < REST_DISTANCE &&
    Math.abs(velocity) < REST_VELOCITY
  ) {
    return { value: target, velocity: 0, atRest: true }
  }
  return { value, velocity, atRest: false }
}

type Sample = { t: number; x: number; y: number }

// Only the most recent stretch of movement says where the finger was heading.
const VELOCITY_WINDOW_MS = 100

/**
 * Rolling pointer history for the release velocity. A finger that stopped
 * before lifting reports zero, so a deliberate "drag, hold, lift" doesn't fling.
 */
export function createVelocityTracker() {
  let samples: Array<Sample> = []
  return {
    add(t: number, x: number, y: number) {
      samples.push({ t, x, y })
      samples = samples.filter((s) => t - s.t <= VELOCITY_WINDOW_MS)
    },
    /** px/s at time `now`. */
    velocity(now: number): { x: number; y: number } {
      const last = samples.at(-1)
      const first = samples.at(0)
      if (!last || !first || now - last.t > VELOCITY_WINDOW_MS / 2)
        return { x: 0, y: 0 }
      const dt = last.t - first.t
      if (dt <= 0) return { x: 0, y: 0 }
      return {
        x: ((last.x - first.x) / dt) * 1000,
        y: ((last.y - first.y) / dt) * 1000,
      }
    },
  }
}
