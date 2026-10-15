import { describe, expect, it } from "vitest"
import { createVelocityTracker, springStep, stepAxis } from "./momentum"
import type { Axis } from "./momentum"

// Slack for float error in the spring's no-overshoot check.
const REST = 0.5

function settle(axis: Axis, min: number, max: number, maxMs = 10_000) {
  let a = axis
  let peak = axis.value
  let low = axis.value
  for (let t = 0; t < maxMs; t += 16) {
    const next = stepAxis(a, 16, min, max)
    peak = Math.max(peak, next.value)
    low = Math.min(low, next.value)
    a = next
    if (next.atRest) return { ...next, peak, low, ms: t + 16 }
  }
  throw new Error("did not settle")
}

describe("stepAxis", () => {
  it("glides forward and comes to rest inside the bounds", () => {
    const end = settle({ value: 0, velocity: 1000 }, -10_000, 10_000)
    // Scroll-view projection: (v/1000) * d / (1 - d) = 499px for 1000px/s.
    expect(end.value).toBeGreaterThan(450)
    expect(end.value).toBeLessThan(510)
  })

  it("stops dead at the bound it runs into", () => {
    const end = settle({ value: -20, velocity: 2000 }, -100, 0)
    expect(end.value).toBe(0)
    expect(end.peak).toBe(0)
  })
})

describe("springStep", () => {
  it("reaches the target without overshooting it", () => {
    let a: Axis = { value: 0, velocity: 0 }
    let peak = 0
    for (let t = 0; t < 1000; t += 16) {
      a = springStep(a, 16, 100, 0.35)
      peak = Math.max(peak, a.value)
    }
    expect(a.value).toBeCloseTo(100, 1)
    expect(peak).toBeLessThanOrEqual(100 + REST)
  })

  it("keeps its velocity when re-targeted mid-flight", () => {
    let a: Axis = { value: 0, velocity: 0 }
    for (let t = 0; t < 80; t += 16) a = springStep(a, 16, 100, 0.35)
    const before = a.velocity
    a = springStep(a, 16, 200, 0.35)
    expect(before).toBeGreaterThan(0)
    // Bends toward the new target from the motion it had, no restart from 0.
    expect(a.velocity).toBeGreaterThan(before)
  })
})

describe("createVelocityTracker", () => {
  it("reports the recent velocity in px/s", () => {
    const v = createVelocityTracker()
    v.add(0, 0, 0)
    v.add(50, 25, -50)
    expect(v.velocity(50)).toEqual({ x: 500, y: -1000 })
  })

  it("reports zero when the pointer held still before release", () => {
    const v = createVelocityTracker()
    v.add(0, 0, 0)
    v.add(20, 40, 0)
    expect(v.velocity(200)).toEqual({ x: 0, y: 0 })
  })
})
