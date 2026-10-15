// Camera physics for the canvas: a per-axis integrator for the post-release
// glide, and the spring the animated zoom/fit (useCameraAnimation) runs on. X
// and Y run as independent axes so a diagonal flick doesn't desync when one
// axis hits its bound first.

// Per-millisecond velocity retention for the glide - the scroll-view value.
export const DECELERATION_RATE = 0.998

// Below this the glide is imperceptible, so the axis is treated as at rest.
const REST_VELOCITY = 10 // px/s
// Spring integration substep; semi-implicit Euler stays stable well past this.
const MAX_SUBSTEP_MS = 4

export type Axis = {
  value: number
  /** units/s */
  velocity: number
}

/**
 * Advances a critically damped spring (no overshoot) toward `target` by
 * `dtMs`, carrying the axis's velocity - so re-targeting mid-flight bends the
 * motion instead of restarting it. `responseS` is the spring's period in
 * seconds: lower is snappier.
 */
export function springStep(
  axis: Axis,
  dtMs: number,
  target: number,
  responseS: number
): Axis {
  const omega = (2 * Math.PI) / responseS
  let { value, velocity } = axis
  let remaining = dtMs
  while (remaining > 0) {
    const h = Math.min(remaining, MAX_SUBSTEP_MS) / 1000
    const accel = -omega * omega * (value - target) - 2 * omega * velocity
    velocity += accel * h
    value += velocity * h
    remaining -= MAX_SUBSTEP_MS
  }
  return { value, velocity }
}

/**
 * Advances one axis by `dtMs`: glides with exponential decay and stops dead at
 * whichever bound it runs into.
 */
export function stepAxis(
  axis: Axis,
  dtMs: number,
  min: number,
  max: number
): Axis & { atRest: boolean } {
  const velocity = axis.velocity * Math.pow(DECELERATION_RATE, dtMs)
  const value = axis.value + (velocity * dtMs) / 1000
  if (value <= min || value >= max) {
    return {
      value: Math.min(max, Math.max(min, value)),
      velocity: 0,
      atRest: true,
    }
  }
  return { value, velocity, atRest: Math.abs(velocity) < REST_VELOCITY }
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
