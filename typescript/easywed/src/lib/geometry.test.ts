import { describe, expect, it } from "vitest"
import {
  clampRectIntoHall,
  nearestPolygonBoundaryPoint,
  pointInPolygon,
  rectInsidePolygon,
  scaleVertices,
  verticesForHallPreset,
} from "./geometry"
import type { Geometry, Position } from "@/stores/planner.store"

// 10x10 square with the top-right 5x5 quarter cut out.
const L_SHAPE: Array<Position> = [
  { x: 0, y: 0 },
  { x: 5, y: 0 },
  { x: 5, y: 5 },
  { x: 10, y: 5 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
]

const lGeometry: Geometry = { vertices: L_SHAPE, closed: true }

describe("pointInPolygon", () => {
  it("detects interior and exterior points", () => {
    expect(pointInPolygon({ x: 2, y: 2 }, L_SHAPE)).toBe(true)
    expect(pointInPolygon({ x: 8, y: 8 }, L_SHAPE)).toBe(true)
    // Inside the AABB but inside the cut-out notch.
    expect(pointInPolygon({ x: 8, y: 2 }, L_SHAPE)).toBe(false)
    expect(pointInPolygon({ x: -1, y: 2 }, L_SHAPE)).toBe(false)
  })

  it("counts boundary points as inside", () => {
    expect(pointInPolygon({ x: 0, y: 0 }, L_SHAPE)).toBe(true)
    expect(pointInPolygon({ x: 5, y: 2 }, L_SHAPE)).toBe(true)
    expect(pointInPolygon({ x: 3, y: 10 }, L_SHAPE)).toBe(true)
  })
})

describe("rectInsidePolygon", () => {
  it("accepts a rect fully inside the polygon", () => {
    expect(
      rectInsidePolygon({ x: 1, y: 6 }, { width: 8, height: 3 }, L_SHAPE)
    ).toBe(true)
  })

  it("accepts a rect flush against polygon walls", () => {
    expect(
      rectInsidePolygon({ x: 0, y: 0 }, { width: 5, height: 5 }, L_SHAPE)
    ).toBe(true)
  })

  it("rejects a rect overlapping the notch", () => {
    expect(
      rectInsidePolygon({ x: 4, y: 1 }, { width: 3, height: 2 }, L_SHAPE)
    ).toBe(false)
  })

  it("rejects the corners-inside-but-edge-crosses case", () => {
    // Both bottom corners in the wide part, both top corners in the tall
    // part... impossible for L; construct with a thin rect spanning the notch
    // bottom: corners at y=5 boundary are "inside" (boundary counts), but the
    // top edge at y=4 crosses into the notch.
    expect(
      rectInsidePolygon({ x: 3, y: 4 }, { width: 4, height: 1 }, L_SHAPE)
    ).toBe(false)
  })
})

describe("clampRectIntoHall", () => {
  const rectHall = { size: { width: 10, height: 10 } }
  const lHall = { size: { width: 10, height: 10 }, geometry: lGeometry }

  it("plain AABB clamp when the hall has no geometry", () => {
    expect(
      clampRectIntoHall({ x: 11, y: -2 }, { width: 2, height: 2 }, rectHall)
    ).toEqual({ x: 8, y: 0 })
  })

  it("returns an already-valid position unchanged", () => {
    expect(
      clampRectIntoHall({ x: 1, y: 6 }, { width: 2, height: 2 }, lHall)
    ).toEqual({ x: 1, y: 6 })
  })

  it("pushes a rect out of the notch to the nearest valid spot", () => {
    const pos = clampRectIntoHall(
      { x: 7, y: 1 },
      { width: 2, height: 2 },
      lHall
    )
    expect(rectInsidePolygon(pos, { width: 2, height: 2 }, L_SHAPE)).toBe(true)
    // Both escape routes (left leg at (3,1), below the notch at (7,5)) are
    // distance 4 from the candidate - the result must not be farther.
    const d = Math.hypot(pos.x - 7, pos.y - 1)
    expect(d).toBeLessThanOrEqual(4)
  })

  it("falls back to the AABB clamp when nothing fits", () => {
    // 9x9 can't fit in either leg of the L.
    expect(
      clampRectIntoHall({ x: 0, y: 0 }, { width: 9, height: 9 }, lHall)
    ).toEqual({ x: 0, y: 0 })
  })

  it("respects the caller's snap step", () => {
    const pos = clampRectIntoHall(
      { x: 7, y: 1 },
      { width: 2, height: 2 },
      lHall,
      0.5
    )
    expect(pos.x % 0.5).toBe(0)
    expect(pos.y % 0.5).toBe(0)
  })
})

describe("nearestPolygonBoundaryPoint", () => {
  it("projects onto the closest edge", () => {
    expect(nearestPolygonBoundaryPoint({ x: 2, y: 9 }, L_SHAPE)).toEqual({
      x: 2,
      y: 10,
    })
    // Inside the notch: nearest wall is the notch's left edge at x=5.
    expect(nearestPolygonBoundaryPoint({ x: 5.5, y: 2 }, L_SHAPE)).toEqual({
      x: 5,
      y: 2,
    })
  })
})

describe("scaleVertices", () => {
  it("rescales so the AABB matches the new size exactly", () => {
    const scaled = scaleVertices(
      L_SHAPE,
      { width: 10, height: 10 },
      {
        width: 20,
        height: 5,
      }
    )
    expect(Math.max(...scaled.map((v) => v.x))).toBe(20)
    expect(Math.max(...scaled.map((v) => v.y))).toBe(5)
    expect(scaled[1]).toEqual({ x: 10, y: 0 })
    expect(scaled[2]).toEqual({ x: 10, y: 2.5 })
  })
})

describe("verticesForHallPreset", () => {
  const size = { width: 20, height: 12 }

  it("rectangle has no geometry", () => {
    expect(verticesForHallPreset("rectangle", size)).toBeNull()
  })

  it.each([
    ["l-shape", 6],
    ["u-shape", 8],
    ["custom", 4],
  ] as const)("%s spans the AABB with %i vertices", (preset, count) => {
    const verts = verticesForHallPreset(preset, size)!
    expect(verts).toHaveLength(count)
    expect(Math.min(...verts.map((v) => v.x))).toBe(0)
    expect(Math.min(...verts.map((v) => v.y))).toBe(0)
    expect(Math.max(...verts.map((v) => v.x))).toBe(size.width)
    expect(Math.max(...verts.map((v) => v.y))).toBe(size.height)
  })
})
