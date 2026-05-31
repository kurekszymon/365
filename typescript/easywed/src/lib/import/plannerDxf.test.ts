import { describe, expect, it } from "vitest"
import type { Fixture, Table } from "@/stores/planner.store"
import { buildPlannerDxf } from "@/lib/export/plannerDxf"
import { parsePlannerDxf } from "@/lib/import/plannerDxf"

const HALL = { width: 20, height: 12 }

const ROUND_TABLE: Table = {
  id: "t-round",
  name: "Head",
  shape: "round",
  capacity: 8,
  size: { width: 1.6, height: 1.6 },
  rotation: 0,
  position: { x: 1, y: 2 },
}

const RECT_TABLE: Table = {
  id: "t-rect",
  name: "Long",
  shape: "rectangular",
  capacity: 10,
  size: { width: 3, height: 1 },
  rotation: 0,
  position: { x: 3, y: 5 },
}

const TRIANGLE_TABLE: Table = {
  id: "t-tri",
  name: "Tri",
  shape: "custom",
  capacity: 4,
  size: { width: 2, height: 1 },
  rotation: 0,
  position: { x: 8, y: 6 },
  geometry: {
    vertices: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
    ],
    closed: true,
  },
}

const CIRCLE_FIXTURE: Fixture = {
  id: "f-circle",
  name: "Column",
  shape: "circle",
  size: { width: 1, height: 1 },
  rotation: 0,
  position: { x: 10, y: 4 },
}

describe("parsePlannerDxf round-trip", () => {
  it("reconstructs hall + rect table + circle fixture from an EasyWed export", () => {
    const dxf = buildPlannerDxf({
      hall: HALL,
      tables: [RECT_TABLE],
      fixtures: [CIRCLE_FIXTURE],
      guests: [],
      options: {
        includeLabels: true,
        includeDimensions: false,
        includeCapacity: true,
      },
    })

    const { preview, warnings } = parsePlannerDxf(dxf)
    expect(preview).not.toBeNull()
    if (!preview) throw new Error("preview missing")

    expect(preview.detectedAsEasywed).toBe(true)
    expect(preview.hall.width).toBeCloseTo(HALL.width, 3)
    expect(preview.hall.height).toBeCloseTo(HALL.height, 3)

    expect(preview.tables).toHaveLength(1)
    const reTable = preview.tables[0]
    expect(reTable.shape).toBe("rectangular")
    expect(reTable.size.width).toBeCloseTo(RECT_TABLE.size.width, 3)
    expect(reTable.size.height).toBeCloseTo(RECT_TABLE.size.height, 3)
    expect(reTable.position.x).toBeCloseTo(RECT_TABLE.position.x, 3)
    expect(reTable.position.y).toBeCloseTo(RECT_TABLE.position.y, 3)
    expect(reTable.name).toBe("Long")
    expect(reTable.capacity).toBe(10)

    expect(preview.fixtures).toHaveLength(1)
    const reFix = preview.fixtures[0]
    expect(reFix.shape).toBe("circle")
    expect(reFix.size.width).toBeCloseTo(1, 3)
    expect(reFix.position.x).toBeCloseTo(CIRCLE_FIXTURE.position.x, 3)
    expect(reFix.position.y).toBeCloseTo(CIRCLE_FIXTURE.position.y, 3)
    expect(reFix.name).toBe("Column")

    expect(warnings).toEqual([])
  })

  it("reconstructs a round table from an EasyWed export", () => {
    const dxf = buildPlannerDxf({
      hall: HALL,
      tables: [ROUND_TABLE],
      fixtures: [],
      guests: [],
      options: {
        includeLabels: false,
        includeDimensions: false,
        includeCapacity: false,
      },
    })
    const { preview } = parsePlannerDxf(dxf)
    expect(preview).not.toBeNull()
    if (!preview) throw new Error("preview missing")
    expect(preview.tables).toHaveLength(1)
    const reTable = preview.tables[0]
    expect(reTable.shape).toBe("round")
    expect(reTable.size.width).toBeCloseTo(1.6, 3)
    expect(reTable.position.x).toBeCloseTo(ROUND_TABLE.position.x, 3)
    expect(reTable.position.y).toBeCloseTo(ROUND_TABLE.position.y, 3)
  })

  it("preserves a triangle as a custom shape with local-coord vertices", () => {
    const dxf = buildPlannerDxf({
      hall: HALL,
      tables: [TRIANGLE_TABLE],
      fixtures: [],
      guests: [],
      options: {
        includeLabels: false,
        includeDimensions: false,
        includeCapacity: false,
      },
    })
    const { preview } = parsePlannerDxf(dxf)
    expect(preview).not.toBeNull()
    if (!preview) throw new Error("preview missing")
    expect(preview.tables).toHaveLength(1)
    const reTable = preview.tables[0]
    expect(reTable.shape).toBe("custom")
    expect(reTable.geometry?.closed).toBe(true)
    // Vertices should be back in object-local space (top-left origin, Y down):
    // (0,0) (2,0) (1,1) — same as the input.
    const verts = reTable.geometry?.vertices ?? []
    expect(verts).toHaveLength(3)
    expect(verts[0].x).toBeCloseTo(0, 3)
    expect(verts[0].y).toBeCloseTo(0, 3)
    expect(verts[1].x).toBeCloseTo(2, 3)
    expect(verts[1].y).toBeCloseTo(0, 3)
    expect(verts[2].x).toBeCloseTo(1, 3)
    expect(verts[2].y).toBeCloseTo(1, 3)
    // Bounding box position matches the source.
    expect(reTable.position.x).toBeCloseTo(TRIANGLE_TABLE.position.x, 3)
    expect(reTable.position.y).toBeCloseTo(TRIANGLE_TABLE.position.y, 3)
  })
})

describe("parsePlannerDxf failure cases", () => {
  it("returns null + no_hall warning when no hall outline is present", () => {
    // Minimal DXF: just a CIRCLE on a TABLES layer, no HALL layer at all.
    const dxf =
      "0\r\nSECTION\r\n2\r\nENTITIES\r\n0\r\nCIRCLE\r\n8\r\nTABLES\r\n10\r\n5.0\r\n20\r\n5.0\r\n40\r\n0.5\r\n0\r\nENDSEC\r\n0\r\nEOF\r\n"
    const { preview, warnings } = parsePlannerDxf(dxf)
    expect(preview).toBeNull()
    expect(warnings.some((w) => w.code === "no_hall")).toBe(true)
  })
})
