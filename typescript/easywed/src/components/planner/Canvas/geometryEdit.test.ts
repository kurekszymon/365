import { describe, expect, it } from "vitest"
import {
  MIN_EXTENT_M,
  defaultPolygonVertices,
  insertMidpoint,
  normalizeGeometry,
  verticesForFootprint,
} from "./geometryEdit"

describe("normalizeGeometry", () => {
  it("re-anchors vertices so the bbox min sits at (0,0)", () => {
    const { geometry, size, offset } = normalizeGeometry([
      { x: 1, y: 2 },
      { x: 4, y: 2 },
      { x: 4, y: 5 },
    ])
    expect(geometry.vertices).toEqual([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 3 },
    ])
    expect(size).toEqual({ width: 3, height: 3 })
    expect(offset).toEqual({ x: 1, y: 2 })
  })

  it("handles negative coordinates from dragging past the origin", () => {
    const { geometry, offset } = normalizeGeometry([
      { x: -1, y: -0.5 },
      { x: 2, y: -0.5 },
      { x: 2, y: 1 },
    ])
    expect(offset).toEqual({ x: -1, y: -0.5 })
    expect(geometry.vertices[0]).toEqual({ x: 0, y: 0 })
  })

  it("clamps a collapsed axis to the minimum extent", () => {
    const { size } = normalizeGeometry([
      { x: 0, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 1 },
    ])
    expect(size).toEqual({ width: 2, height: MIN_EXTENT_M })
  })

  it("rounds stored coordinates and the offset to millimeters", () => {
    const { geometry, offset } = normalizeGeometry([
      { x: 0.123456, y: 0 },
      { x: 1.000004, y: 0 },
      { x: 1.000004, y: 0.999996 },
    ])
    expect(offset.x).toBe(0.123)
    expect(geometry.vertices[1].x).toBe(0.877)
    expect(geometry.vertices[2].y).toBe(1)
  })

  it("preserves the closed flag", () => {
    expect(normalizeGeometry([{ x: 0, y: 0 }], false).geometry.closed).toBe(
      false
    )
  })
})

describe("verticesForFootprint", () => {
  it("returns the four corners for rectangle-family shapes", () => {
    expect(verticesForFootprint("rectangle", { width: 3, height: 1 })).toEqual([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 1 },
      { x: 0, y: 1 },
    ])
  })

  it("returns a 12-gon inscribed in the circle's bbox", () => {
    const verts = verticesForFootprint("circle", { width: 2, height: 2 })
    expect(verts).toHaveLength(12)
    // Every vertex sits on the radius-1 circle centered at (1, 1).
    for (const v of verts) {
      expect(Math.hypot(v.x - 1, v.y - 1)).toBeCloseTo(1, 2)
    }
    // First vertex is the top of the circle.
    expect(verts[0]).toEqual({ x: 1, y: 0 })
  })
})

describe("insertMidpoint", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
  ]

  it("inserts the midpoint after the edge's start vertex", () => {
    const next = insertMidpoint(square, 0)
    expect(next).toHaveLength(5)
    expect(next[1]).toEqual({ x: 1, y: 0 })
  })

  it("wraps around for the closing edge", () => {
    const next = insertMidpoint(square, 3)
    expect(next).toHaveLength(5)
    expect(next[4]).toEqual({ x: 0, y: 1 })
  })
})

describe("defaultPolygonVertices", () => {
  it("clips the top-left corner of the footprint", () => {
    const verts = defaultPolygonVertices({ width: 2, height: 1 })
    expect(verts).toHaveLength(5)
    expect(verts).not.toContainEqual({ x: 0, y: 0 })
  })
})
