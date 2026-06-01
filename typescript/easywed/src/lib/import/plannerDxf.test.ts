import { describe, expect, it } from "vitest"
import type { Fixture, Table } from "@/stores/planner.store"
import { buildPlannerDxf } from "@/lib/export/plannerDxf"
import { parsePlannerDxf } from "@/lib/import/plannerDxf"
import { applyTransforms } from "@/lib/import/dxfGeometry"

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

const POLY_FIXTURE: Fixture = {
  id: "f-poly",
  name: "Stage",
  shape: "polygon",
  size: { width: 2, height: 1 },
  rotation: 0,
  position: { x: 12, y: 7 },
  geometry: {
    vertices: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
    ],
    closed: true,
  },
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

    const result = parsePlannerDxf(dxf)
    const { preview, warnings } = result
    expect(preview).not.toBeNull()
    if (!preview) throw new Error("preview missing")

    expect(result.detectedAsEasywed).toBe(true)
    expect(preview.hall.width).toBeCloseTo(HALL.width, 3)
    expect(preview.hall.height).toBeCloseTo(HALL.height, 3)
    // The exported hall is an axis-aligned rectangle, so it round-trips back
    // to the "rectangle" preset rather than the catch-all "custom".
    expect(preview.hall.preset).toBe("rectangle")

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

  it("preserves a polygon fixture with local-coord vertices", () => {
    const dxf = buildPlannerDxf({
      hall: HALL,
      tables: [],
      fixtures: [POLY_FIXTURE],
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
    expect(preview.fixtures).toHaveLength(1)
    const reFix = preview.fixtures[0]
    expect(reFix.shape).toBe("polygon")
    expect(reFix.geometry?.closed).toBe(true)
    // Vertices back in object-local space (top-left origin, Y down).
    const verts = reFix.geometry?.vertices ?? []
    expect(verts).toHaveLength(3)
    expect(verts[0].x).toBeCloseTo(0, 3)
    expect(verts[0].y).toBeCloseTo(0, 3)
    expect(verts[1].x).toBeCloseTo(2, 3)
    expect(verts[1].y).toBeCloseTo(0, 3)
    expect(verts[2].x).toBeCloseTo(1, 3)
    expect(verts[2].y).toBeCloseTo(1, 3)
    expect(reFix.position.x).toBeCloseTo(POLY_FIXTURE.position.x, 3)
    expect(reFix.position.y).toBeCloseTo(POLY_FIXTURE.position.y, 3)
  })
})

describe("parsePlannerDxf failure cases", () => {
  it("returns null + no_hall warning when no hall outline is present", () => {
    // Minimal DXF: just a CIRCLE on a TABLES layer, no HALL layer at all.
    // Without a userMapping, the auto-mapping marks the layer as "ignore"
    // (non-EasyWed file), so nothing makes it into byRole.tables and the
    // fallback has nothing to wrap.
    const dxf =
      "0\r\nSECTION\r\n2\r\nENTITIES\r\n0\r\nCIRCLE\r\n8\r\nTABLES\r\n10\r\n5.0\r\n20\r\n5.0\r\n40\r\n0.5\r\n0\r\nENDSEC\r\n0\r\nEOF\r\n"
    const { preview, warnings } = parsePlannerDxf(dxf)
    expect(preview).toBeNull()
    expect(warnings.some((w) => w.code === "no_hall")).toBe(true)
  })
})

describe("parsePlannerDxf fallback hall", () => {
  it("synthesizes a hall around objects when the user maps a layer but the file has no outline", () => {
    // Same minimal CIRCLE-only DXF as above, but now we tell the parser the
    // TABLES layer holds tables. With no hall outline, the fallback wraps the
    // single circle in a hall with 1 m padding on each side.
    const dxf =
      "0\r\nSECTION\r\n2\r\nENTITIES\r\n0\r\nCIRCLE\r\n8\r\nTABLES\r\n10\r\n5.0\r\n20\r\n5.0\r\n40\r\n0.5\r\n0\r\nENDSEC\r\n0\r\nEOF\r\n"
    const { preview, warnings } = parsePlannerDxf(dxf, { TABLES: "tables" })
    expect(preview).not.toBeNull()
    if (!preview) throw new Error("preview missing")
    // Both warnings are reported: `no_hall` (we didn't find one) and
    // `hall_synthesized` (we made one anyway).
    expect(warnings.some((w) => w.code === "no_hall")).toBe(true)
    expect(warnings.some((w) => w.code === "hall_synthesized")).toBe(true)
    // CIRCLE bbox in DXF: (4.5..5.5, 4.5..5.5) → fallback hall is 3 × 3 with
    // 1 m padding, so the circle sits centered with its top-left at (1, 1).
    expect(preview.hall.width).toBeCloseTo(3, 3)
    expect(preview.hall.height).toBeCloseTo(3, 3)
    expect(preview.tables).toHaveLength(1)
    expect(preview.tables[0].position.x).toBeCloseTo(1, 3)
    expect(preview.tables[0].position.y).toBeCloseTo(1, 3)
    expect(preview.tables[0].size.width).toBeCloseTo(1, 3)
  })
})

// --- Hand-authored minimal DXF helpers --------------------------------------
// Each DXF "tuple" is a group code on one line and its value on the next.
const tag = (code: number, value: string | number): string =>
  `${code}\r\n${value}\r\n`

const dxfDoc = (opts: {
  insUnits?: number
  blocks?: string
  entities: string
}): string => {
  const header =
    opts.insUnits !== undefined
      ? tag(0, "SECTION") +
        tag(2, "HEADER") +
        tag(9, "$INSUNITS") +
        tag(70, opts.insUnits) +
        tag(0, "ENDSEC")
      : ""
  const blocks = opts.blocks
    ? tag(0, "SECTION") + tag(2, "BLOCKS") + opts.blocks + tag(0, "ENDSEC")
    : ""
  const entities =
    tag(0, "SECTION") + tag(2, "ENTITIES") + opts.entities + tag(0, "ENDSEC")
  return header + blocks + entities + tag(0, "EOF")
}

const rect = (
  layer: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): string =>
  tag(0, "LWPOLYLINE") +
  tag(8, layer) +
  tag(90, 4) +
  tag(70, 1) +
  tag(10, x0) +
  tag(20, y0) +
  tag(10, x1) +
  tag(20, y0) +
  tag(10, x1) +
  tag(20, y1) +
  tag(10, x0) +
  tag(20, y1)

const circle = (layer: string, cx: number, cy: number, r: number): string =>
  tag(0, "CIRCLE") + tag(8, layer) + tag(10, cx) + tag(20, cy) + tag(40, r)

// Closed LWPOLYLINE quad whose first (bottom) edge carries a bulge, so the
// importer must tessellate it into an arc rather than a straight segment. The
// bulge tag (42) attaches to the vertex it follows.
const bulgedQuad = (layer: string): string =>
  tag(0, "LWPOLYLINE") +
  tag(8, layer) +
  tag(90, 4) +
  tag(70, 1) +
  tag(10, 2) +
  tag(20, 2) +
  tag(42, 0.5) +
  tag(10, 6) +
  tag(20, 2) +
  tag(10, 6) +
  tag(20, 5) +
  tag(10, 2) +
  tag(20, 5)

// Closed SPLINE: knots must number controlPoints + degree + 1. Group codes:
// 70 flag (bit 1 = closed), 71 degree, 40 knot (repeated), 10/20 control point.
const closedSpline = (
  layer: string,
  degree: number,
  controlPoints: Array<[number, number]>,
  knots: Array<number>
): string => {
  let s = tag(0, "SPLINE") + tag(8, layer) + tag(70, 1) + tag(71, degree)
  for (const k of knots) s += tag(40, k)
  for (const [x, y] of controlPoints) s += tag(10, x) + tag(20, y)
  return s
}

describe("parsePlannerDxf units", () => {
  it("scales a millimeter drawing to meters from $INSUNITS", () => {
    const doc = dxfDoc({
      insUnits: 4, // millimeters
      entities:
        rect("HALL", 0, 0, 4000, 3000) + circle("TABLES", 2000, 1500, 500),
    })
    const result = parsePlannerDxf(doc)
    expect(result.detectedUnit).toBe("mm")
    expect(result.resolvedUnit).toBe("mm")
    expect(result.warnings.some((w) => w.code === "unit_assumed")).toBe(false)
    const { preview } = result
    expect(preview).not.toBeNull()
    if (!preview) throw new Error("preview missing")
    expect(preview.hall.width).toBeCloseTo(4, 3)
    expect(preview.hall.height).toBeCloseTo(3, 3)
    expect(preview.tables).toHaveLength(1)
    // 500 mm radius → 1000 mm diameter → 1 m.
    expect(preview.tables[0].size.width).toBeCloseTo(1, 3)
  })

  it("assumes meters (with a warning) when units are absent, and honors an override", () => {
    const doc = dxfDoc({
      entities: rect("HALL", 0, 0, 400, 300) + circle("TABLES", 200, 150, 50),
    })

    const assumed = parsePlannerDxf(doc)
    expect(assumed.detectedUnit).toBeNull()
    expect(assumed.resolvedUnit).toBe("m")
    expect(assumed.warnings.some((w) => w.code === "unit_assumed")).toBe(true)
    expect(assumed.preview?.hall.width).toBeCloseTo(400, 3)

    // Overriding to centimeters rescales: 400 cm → 4 m, 300 cm → 3 m.
    const cm = parsePlannerDxf(doc, undefined, "cm")
    expect(cm.resolvedUnit).toBe("cm")
    expect(cm.warnings.some((w) => w.code === "unit_assumed")).toBe(false)
    expect(cm.preview?.hall.width).toBeCloseTo(4, 3)
    expect(cm.preview?.hall.height).toBeCloseTo(3, 3)
  })
})

describe("parsePlannerDxf blocks/inserts", () => {
  it("expands INSERTs of a block into one table per instance", () => {
    const block =
      tag(0, "BLOCK") +
      tag(2, "TBL") +
      tag(10, 0) +
      tag(20, 0) +
      circle("0", 0, 0, 0.5) +
      tag(0, "ENDBLK")
    const insert = (cx: number, cy: number): string =>
      tag(0, "INSERT") +
      tag(8, "TABLES") +
      tag(2, "TBL") +
      tag(10, cx) +
      tag(20, cy)
    const doc = dxfDoc({
      insUnits: 6, // meters
      blocks: block,
      entities: rect("HALL", 0, 0, 10, 8) + insert(2, 2) + insert(6, 3),
    })
    const { preview } = parsePlannerDxf(doc)
    expect(preview).not.toBeNull()
    if (!preview) throw new Error("preview missing")
    expect(preview.tables).toHaveLength(2)
    expect(preview.tables.every((t) => t.shape === "round")).toBe(true)
    expect(preview.tables.every((t) => Math.abs(t.size.width - 1) < 1e-3)).toBe(
      true
    )
    // Centers land at the insert points (2,2) and (6,3); top-left = center
    // minus radius, with Y flipped against the 8 m hall height.
    const xs = preview.tables.map((t) => t.position.x).sort((a, b) => a - b)
    expect(xs[0]).toBeCloseTo(1.5, 3)
    expect(xs[1]).toBeCloseTo(5.5, 3)
  })
})

describe("parsePlannerDxf curves", () => {
  it("tessellates a full ellipse into a polygon fixture", () => {
    const ellipse =
      tag(0, "ELLIPSE") +
      tag(8, "FIXTURES") +
      tag(10, 5) +
      tag(20, 4) +
      tag(11, 2) + // major axis endpoint (relative to center): rx = 2
      tag(21, 0) +
      tag(40, 0.5) + // axis ratio → ry = 1
      tag(41, 0) +
      tag(42, 6.283185307) // full sweep
    const doc = dxfDoc({
      insUnits: 6,
      entities: rect("HALL", 0, 0, 10, 8) + ellipse,
    })
    const { preview } = parsePlannerDxf(doc)
    expect(preview).not.toBeNull()
    if (!preview) throw new Error("preview missing")
    expect(preview.fixtures).toHaveLength(1)
    expect(preview.fixtures[0].shape).toBe("polygon")
    expect(preview.fixtures[0].geometry?.vertices.length ?? 0).toBeGreaterThan(
      3
    )
    // Non-circular ellipse: AABB ~ 4 m wide (rx 2) × 2 m tall (ry 1).
    expect(preview.fixtures[0].size.width).toBeCloseTo(4, 1)
    expect(preview.fixtures[0].size.height).toBeCloseTo(2, 1)
  })

  it("skips an open arc with a skipped_arc warning", () => {
    const arc =
      tag(0, "ARC") +
      tag(8, "TABLES") +
      tag(10, 5) +
      tag(20, 4) +
      tag(40, 1) +
      tag(50, 0) +
      tag(51, 90)
    const doc = dxfDoc({
      insUnits: 6,
      entities: rect("HALL", 0, 0, 10, 8) + arc,
    })
    const { preview, warnings } = parsePlannerDxf(doc)
    expect(preview).not.toBeNull()
    if (!preview) throw new Error("preview missing")
    expect(preview.tables).toHaveLength(0)
    expect(warnings.some((w) => w.code === "skipped_arc")).toBe(true)
  })

  it("expands an LWPOLYLINE bulge into arc vertices (custom polygon)", () => {
    const doc = dxfDoc({
      insUnits: 6,
      entities: rect("HALL", 0, 0, 10, 8) + bulgedQuad("FIXTURES"),
    })
    const { preview } = parsePlannerDxf(doc)
    expect(preview).not.toBeNull()
    if (!preview) throw new Error("preview missing")
    expect(preview.fixtures).toHaveLength(1)
    // The bulged edge tessellates into many arc points, so this is no longer a
    // 4-corner rectangle — it round-trips as a custom polygon with > 4 verts.
    expect(preview.fixtures[0].shape).toBe("polygon")
    expect(preview.fixtures[0].geometry?.vertices.length ?? 0).toBeGreaterThan(
      4
    )
  })

  it("tessellates a closed SPLINE into a polygon fixture", () => {
    // Degree-3 Bézier (4 control points, clamped knot vector of length 8).
    const spline = closedSpline(
      "FIXTURES",
      3,
      [
        [3, 3],
        [4, 5],
        [6, 5],
        [7, 3],
      ],
      [0, 0, 0, 0, 1, 1, 1, 1]
    )
    const doc = dxfDoc({
      insUnits: 6,
      entities: rect("HALL", 0, 0, 10, 8) + spline,
    })
    const { preview } = parsePlannerDxf(doc)
    expect(preview).not.toBeNull()
    if (!preview) throw new Error("preview missing")
    expect(preview.fixtures).toHaveLength(1)
    expect(preview.fixtures[0].shape).toBe("polygon")
    // The B-spline evaluator samples many points along the curve.
    expect(preview.fixtures[0].geometry?.vertices.length ?? 0).toBeGreaterThan(
      4
    )
  })
})

describe("dxfGeometry.applyTransforms", () => {
  it("applies scale, then rotation, then translation in order", () => {
    // scaleX 2 → (2,0); rotate 90° → (0,2); translate (1,1) → (1,3).
    const [[x, y]] = applyTransforms(
      [[1, 0]],
      [{ scaleX: 2, scaleY: 1, rotation: 90, x: 1, y: 1 }]
    )
    expect(x).toBeCloseTo(1, 6)
    expect(y).toBeCloseTo(3, 6)
  })
})
