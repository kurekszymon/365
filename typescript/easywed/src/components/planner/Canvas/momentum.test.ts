import { describe, expect, it } from "vitest"
import {
  createVelocityTracker,
  rubberband,
  rubberbandClamp,
  stepAxis,
} from "./momentum"
import type { Axis } from "./momentum"

// stepAxis snaps to the bound inside this distance.
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

describe("rubberband", () => {
  it("follows less the further it is pulled, and never exceeds the dimension", () => {
    const near = rubberband(10, 400)
    const far = rubberband(1000, 400)
    expect(near).toBeGreaterThan(0)
    expect(near).toBeLessThan(10)
    expect(far / 1000).toBeLessThan(near / 10)
    expect(rubberband(1e9, 400)).toBeLessThan(400)
  })

  it("is symmetric", () => {
    expect(rubberband(-50, 400)).toBeCloseTo(-rubberband(50, 400))
  })

  it("leaves in-bounds values alone", () => {
    expect(rubberbandClamp(5, 0, 10, 400)).toBe(5)
    expect(rubberbandClamp(15, 0, 10, 400)).toBeLessThan(15)
    expect(rubberbandClamp(15, 0, 10, 400)).toBeGreaterThan(10)
  })
})

describe("stepAxis", () => {
  it("glides forward and comes to rest inside the bounds", () => {
    const end = settle({ value: 0, velocity: 1000 }, -10_000, 10_000)
    // Scroll-view projection: (v/1000) * d / (1 - d) = 499px for 1000px/s.
    expect(end.value).toBeGreaterThan(450)
    expect(end.value).toBeLessThan(510)
  })

  it("springs back to the bound from an overscroll without crossing it", () => {
    const end = settle({ value: 80, velocity: 0 }, -100, 0)
    expect(end.value).toBe(0)
    expect(end.low).toBeGreaterThanOrEqual(-REST)
  })

  it("bounces softly off the edge instead of stopping dead", () => {
    const end = settle({ value: -20, velocity: 2000 }, -100, 0)
    expect(end.value).toBe(0)
    // Ran past the bound, then came back.
    expect(end.peak).toBeGreaterThan(0)
    expect(end.peak).toBeLessThan(200)
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
