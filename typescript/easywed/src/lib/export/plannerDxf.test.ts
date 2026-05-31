import { describe, expect, it } from "vitest"
import type { Fixture, Table } from "@/stores/planner.store"
import { buildPlannerDxf } from "@/lib/export/plannerDxf"

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
  rotation: 90,
  position: { x: 3, y: 5 },
}

const CIRCLE_FIXTURE: Fixture = {
  id: "f-circle",
  name: "Column",
  shape: "circle",
  size: { width: 1, height: 1 },
  rotation: 0,
  position: { x: 10, y: 4 },
}

// Extract the (groupCode, value) pairs of the first entity of a given type
// starting from a given offset. Returns the lines so each test can assert on
// specific coords without re-parsing the whole DXF.
const findEntity = (
  dxf: string,
  type: string,
  startAt = 0
): { lines: Array<string>; start: number; end: number } => {
  const lines = dxf.split("\r\n")
  for (let i = startAt; i < lines.length - 1; i++) {
    if (lines[i] === "0" && lines[i + 1] === type) {
      // Find the end: the next "0" at an even index after i+2.
      let end = lines.length
      for (let j = i + 2; j < lines.length - 1; j += 2) {
        if (lines[j] === "0") {
          end = j
          break
        }
      }
      return { lines: lines.slice(i, end), start: i, end }
    }
  }
  throw new Error(`Entity ${type} not found from offset ${startAt}`)
}

const groupValues = (entity: Array<string>, code: number): Array<string> => {
  const out: Array<string> = []
  for (let i = 0; i < entity.length - 1; i += 2) {
    if (entity[i] === String(code)) out.push(entity[i + 1])
  }
  return out
}

describe("buildPlannerDxf", () => {
  const dxf = buildPlannerDxf({
    hall: HALL,
    tables: [ROUND_TABLE, RECT_TABLE],
    fixtures: [CIRCLE_FIXTURE],
    guests: [],
    options: {
      includeLabels: false,
      includeDimensions: false,
      includeCapacity: false,
    },
  })

  it("declares metric units in the header", () => {
    expect(dxf).toContain("$INSUNITS")
    // Group code 70 = 6 immediately after $INSUNITS.
    expect(dxf).toMatch(/\$INSUNITS\r\n70\r\n6\r\n/)
    expect(dxf).toContain("$MEASUREMENT")
  })

  it("defines the expected layers", () => {
    for (const layer of ["HALL", "TABLES", "FIXTURES", "LABELS", "DIMS"]) {
      expect(dxf).toContain(layer)
    }
  })

  it("emits the hall outline as a closed LWPOLYLINE in Y-up coords", () => {
    const hall = findEntity(dxf, "LWPOLYLINE")
    expect(groupValues(hall.lines, 8)).toEqual(["HALL"])
    // 4 vertices, closed.
    expect(groupValues(hall.lines, 90)).toEqual(["4"])
    expect(groupValues(hall.lines, 70)).toEqual(["1"])
    // Bottom-left (0,0) then CCW to (20,0), (20,12), (0,12).
    expect(groupValues(hall.lines, 10)).toEqual(["0.0", "20.0", "20.0", "0.0"])
    expect(groupValues(hall.lines, 20)).toEqual(["0.0", "0.0", "12.0", "12.0"])
  })

  it("emits a round table as a CIRCLE with Y flipped about the hall height", () => {
    const circle = findEntity(dxf, "CIRCLE")
    expect(groupValues(circle.lines, 8)).toEqual(["TABLES"])
    // Round table at app (1, 2) diameter 1.6 →
    //   center app (1.8, 2.8) → center DXF (1.8, 12 - 2.8) = (1.8, 9.2)
    //   radius 0.8.
    expect(groupValues(circle.lines, 10)).toEqual(["1.8"])
    expect(groupValues(circle.lines, 20)).toEqual(["9.2"])
    expect(groupValues(circle.lines, 40)).toEqual(["0.8"])
  })

  it("emits a 90°-rotated rectangular table with width/height swapped", () => {
    // Skip the hall LWPOLYLINE then read the next one.
    const hall = findEntity(dxf, "LWPOLYLINE")
    const rect = findEntity(dxf, "LWPOLYLINE", hall.end)
    expect(groupValues(rect.lines, 8)).toEqual(["TABLES"])
    // Rect (3, 1) at app (3, 5) rotated 90 → effective bbox (1, 3) at app
    // top-left (3, 5). In DXF (Y-up), bottom-left = (3, 12 - 5 - 3) = (3, 4).
    // Vertices CCW from bottom-left: (3,4) (4,4) (4,7) (3,7).
    expect(groupValues(rect.lines, 10)).toEqual(["3.0", "4.0", "4.0", "3.0"])
    expect(groupValues(rect.lines, 20)).toEqual(["4.0", "4.0", "7.0", "7.0"])
  })

  it("emits a circle fixture on the FIXTURES layer", () => {
    // Skip the round-table CIRCLE.
    const first = findEntity(dxf, "CIRCLE")
    const fixture = findEntity(dxf, "CIRCLE", first.end)
    expect(groupValues(fixture.lines, 8)).toEqual(["FIXTURES"])
    // Fixture at app (10, 4) diameter 1 → center DXF (10.5, 12 - 4.5) = (10.5, 7.5).
    expect(groupValues(fixture.lines, 10)).toEqual(["10.5"])
    expect(groupValues(fixture.lines, 20)).toEqual(["7.5"])
    expect(groupValues(fixture.lines, 40)).toEqual(["0.5"])
  })

  it("ends with EOF", () => {
    expect(dxf.trimEnd().endsWith("EOF")).toBe(true)
  })
})

describe("buildPlannerDxf with options", () => {
  it("emits labels and capacity when requested", () => {
    const dxf = buildPlannerDxf({
      hall: HALL,
      tables: [ROUND_TABLE],
      fixtures: [],
      guests: [
        { id: "g1", name: "Alice", dietary: [], tableId: "t-round" },
        { id: "g2", name: "Bob", dietary: [], tableId: "t-round" },
      ],
      options: {
        includeLabels: true,
        includeDimensions: false,
        includeCapacity: true,
      },
    })
    // "Head 2/8" centered on the table.
    expect(dxf).toContain("Head 2/8")
    expect(dxf).toContain("LABELS")
  })

  it("emits dimension lines and value labels when requested", () => {
    const dxf = buildPlannerDxf({
      hall: HALL,
      tables: [],
      fixtures: [],
      guests: [],
      options: {
        includeLabels: false,
        includeDimensions: true,
        includeCapacity: false,
      },
    })
    expect(dxf).toContain("DIMS")
    expect(dxf).toContain("20.0 m")
    expect(dxf).toContain("12.0 m")
  })
})

describe("buildPlannerDxf with custom shapes", () => {
  // Triangle table: bbox 2m × 1m, top-left at app (5, 3). Vertices in local
  // (top-left origin, Y-down): (0,0) (2,0) (1,1).
  const TRIANGLE_TABLE: Table = {
    id: "t-tri",
    name: "Tri",
    shape: "custom",
    capacity: 4,
    size: { width: 2, height: 1 },
    rotation: 0,
    position: { x: 5, y: 3 },
    geometry: {
      vertices: [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 1, y: 1 },
      ],
      closed: true,
    },
  }

  it("emits a custom-shape table as a closed LWPOLYLINE with Y-flipped vertices", () => {
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
    // Skip the hall LWPOLYLINE then the triangle is next.
    const hall = findEntity(dxf, "LWPOLYLINE")
    const tri = findEntity(dxf, "LWPOLYLINE", hall.end)
    expect(groupValues(tri.lines, 8)).toEqual(["TABLES"])
    expect(groupValues(tri.lines, 90)).toEqual(["3"])
    expect(groupValues(tri.lines, 70)).toEqual(["1"])
    // World DXF coords: x = px + lx, y = hallH - py - ly with hallH=12, px=5, py=3.
    //   (0,0) → (5, 9)
    //   (2,0) → (7, 9)
    //   (1,1) → (6, 8)
    expect(groupValues(tri.lines, 10)).toEqual(["5.0", "7.0", "6.0"])
    expect(groupValues(tri.lines, 20)).toEqual(["9.0", "9.0", "8.0"])
  })

  it("emits an open polygon when geometry.closed is false", () => {
    const open: Table = {
      ...TRIANGLE_TABLE,
      geometry: { vertices: TRIANGLE_TABLE.geometry!.vertices, closed: false },
    }
    const dxf = buildPlannerDxf({
      hall: HALL,
      tables: [open],
      fixtures: [],
      guests: [],
      options: {
        includeLabels: false,
        includeDimensions: false,
        includeCapacity: false,
      },
    })
    const hall = findEntity(dxf, "LWPOLYLINE")
    const poly = findEntity(dxf, "LWPOLYLINE", hall.end)
    expect(groupValues(poly.lines, 70)).toEqual(["0"])
  })
})
