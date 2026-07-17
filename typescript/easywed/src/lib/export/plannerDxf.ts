import type {
  Fixture,
  Geometry,
  Guest,
  Hall,
  Size,
  Table,
  TableRotation,
} from "@/stores/planner.store"
import { getEffectiveSize, usePlannerStore } from "@/stores/planner.store"
import { worldBoundsOf } from "@/components/planner/Canvas/utils"
import { useGlobalStore } from "@/stores/global.store"
import { downloadBlob } from "@/lib/export/downloadBlob"

// DXF group codes used here:
//   0   entity type / structural marker
//   1   primary text value (TEXT/MTEXT content)
//   2   name (section, table, block, layer)
//   6   linetype
//   8   layer name
//   9   header variable name
//   10  X coord (primary)
//   11  X coord (secondary)
//   20  Y coord (primary)
//   21  Y coord (secondary)
//   40  float (radius, text height)
//   62  ACI color index (1=red, 2=yellow, 3=green, 5=blue, 7=white/black)
//   70  flag int
//   71  attachment point (MTEXT: 5 = middle-center)
//   90  unsigned int (LWPOLYLINE vertex count)

const LAYER_HALL = "HALL"
const LAYER_TABLES = "TABLES"
const LAYER_FIXTURES = "FIXTURES"
const LAYER_LABELS = "LABELS"
const LAYER_DIMS = "DIMS"

const COLOR_HALL = 7
const COLOR_TABLES = 5
const COLOR_FIXTURES = 3
const COLOR_LABELS = 7
const COLOR_DIMS = 6

const LABEL_HEIGHT_M = 0.3
const DIM_OFFSET_M = 0.5
const DIM_TICK_M = 0.2

export interface PlannerDxfInput {
  // All halls; entity positions are hall-local (world = hall.position + local).
  // The whole layout is emitted in one model space, Y-flipped about the union
  // of the hall rects, with the union's bottom-left at the DXF origin.
  halls: Array<Hall>
  tables: Array<Table>
  fixtures: Array<Fixture>
  guests: Array<Guest>
  options: {
    includeLabels: boolean
    includeDimensions: boolean
    includeCapacity: boolean
  }
}

// DXF group codes have type-specific ranges. We only use codes in these bands:
//   0–9:    strings
//   10–59:  doubles
//   60–79:  16-bit integers (flags, color, attachment point)
//   90–99:  32-bit integers (LWPOLYLINE vertex count)
const isIntCode = (code: number): boolean =>
  (code >= 60 && code <= 79) || (code >= 90 && code <= 99)

class DxfBuilder {
  private parts: Array<string> = []
  push(code: number, value: string | number): void {
    this.parts.push(String(code))
    if (typeof value === "string") {
      this.parts.push(value)
    } else if (isIntCode(code)) {
      this.parts.push(String(Math.round(value)))
    } else {
      this.parts.push(fmtFloat(value))
    }
  }
  toString(): string {
    // Classic DXF line separator is CRLF; readers also accept LF, but CRLF
    // matches what AutoCAD itself emits and avoids issues with some parsers.
    return this.parts.join("\r\n") + "\r\n"
  }
}

const fmtFloat = (n: number): string => {
  // Round microscopic FP noise but keep enough precision for mm-level accuracy.
  const rounded = Math.round(n * 1e6) / 1e6
  return Number.isInteger(rounded) ? rounded.toFixed(1) : String(rounded)
}

const emitHeader = (b: DxfBuilder) => {
  b.push(0, "SECTION")
  b.push(2, "HEADER")
  // $INSUNITS = 6 → meters. Tells importing tools the model space is metric.
  b.push(9, "$INSUNITS")
  b.push(70, 6)
  // $MEASUREMENT = 1 → metric drawing settings.
  b.push(9, "$MEASUREMENT")
  b.push(70, 1)
  b.push(0, "ENDSEC")
}

interface LayerDef {
  name: string
  color: number
}

const emitTables = (b: DxfBuilder, layers: Array<LayerDef>) => {
  b.push(0, "SECTION")
  b.push(2, "TABLES")
  b.push(0, "TABLE")
  b.push(2, "LAYER")
  b.push(70, layers.length)
  for (const layer of layers) {
    b.push(0, "LAYER")
    b.push(2, layer.name)
    b.push(70, 0)
    b.push(62, layer.color)
    b.push(6, "CONTINUOUS")
  }
  b.push(0, "ENDTAB")
  b.push(0, "ENDSEC")
}

const emitPolygon = (
  b: DxfBuilder,
  layer: string,
  // Vertices in DXF (Y-up) coords, already translated to world space.
  vertices: Array<{ x: number; y: number }>,
  closed: boolean
) => {
  b.push(0, "LWPOLYLINE")
  b.push(8, layer)
  b.push(90, vertices.length)
  b.push(70, closed ? 1 : 0)
  for (const v of vertices) {
    b.push(10, v.x)
    b.push(20, v.y)
  }
}

// Transform an object-local polygon (top-left origin, Y down) to world DXF
// coordinates (bottom-left origin, Y up). The object's top-left corner in app
// space is (px, py).
//
// NOTE: `rotation` is deliberately NOT applied to the vertices here. This is
// safe only because custom/polygon shapes are non-rotatable in the UI (their
// rotation stays 0 - see TablePanelContent/FixturePanelContent, which hide the
// rotation control for these shapes). If polygons ever become rotatable, bake
// the rotation into these vertices, or the export will silently drop it.
const polygonToDxf = (
  hallH: number,
  px: number,
  py: number,
  geometry: Geometry
): Array<{ x: number; y: number }> =>
  geometry.vertices.map((v) => ({
    x: px + v.x,
    y: hallH - py - v.y,
  }))

const emitRect = (
  b: DxfBuilder,
  layer: string,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  // LWPOLYLINE, closed, axis-aligned rectangle. (x, y) is the lower-left
  // corner in DXF (Y-up) coords.
  b.push(0, "LWPOLYLINE")
  b.push(8, layer)
  b.push(90, 4)
  b.push(70, 1)
  b.push(10, x)
  b.push(20, y)
  b.push(10, x + w)
  b.push(20, y)
  b.push(10, x + w)
  b.push(20, y + h)
  b.push(10, x)
  b.push(20, y + h)
}

const emitCircle = (
  b: DxfBuilder,
  layer: string,
  cx: number,
  cy: number,
  r: number
) => {
  b.push(0, "CIRCLE")
  b.push(8, layer)
  b.push(10, cx)
  b.push(20, cy)
  b.push(40, r)
}

const emitLine = (
  b: DxfBuilder,
  layer: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
  b.push(0, "LINE")
  b.push(8, layer)
  b.push(10, x1)
  b.push(20, y1)
  b.push(11, x2)
  b.push(21, y2)
}

const emitText = (
  b: DxfBuilder,
  layer: string,
  cx: number,
  cy: number,
  height: number,
  text: string
) => {
  // MTEXT with attachment point 5 = middle-center, so (cx, cy) is the visual
  // center of the label. Backslashes in user-supplied names are escaped because
  // MTEXT treats `\` as a formatting introducer.
  b.push(0, "MTEXT")
  b.push(8, layer)
  b.push(10, cx)
  b.push(20, cy)
  b.push(40, height)
  b.push(71, 5)
  b.push(1, text.replace(/\\/g, "\\\\"))
}

// Convert app-space (top-left origin, Y down) to DXF-space (bottom-left origin,
// Y up). For an object whose top-left in app space is (px, py) with effective
// size (w, h), its bottom-left in DXF is (px, hallH - py - h).
const flipRect = (
  hallH: number,
  px: number,
  py: number,
  size: Size,
  rotation: TableRotation
): { x: number; y: number; w: number; h: number } => {
  const eff = getEffectiveSize(size, rotation)
  return {
    x: px,
    y: hallH - py - eff.height,
    w: eff.width,
    h: eff.height,
  }
}

const seatedCountByTableId = (guests: Array<Guest>): Map<string, number> => {
  const counts = new Map<string, number>()
  for (const g of guests) {
    if (g.tableId) counts.set(g.tableId, (counts.get(g.tableId) ?? 0) + 1)
  }
  return counts
}

const tableLabel = (
  table: Table,
  seated: number,
  includeCapacity: boolean
): string => {
  const name = table.name.trim()
  if (!includeCapacity) return name
  const cap = `${seated}/${table.capacity}`
  return name ? `${name} ${cap}` : cap
}

const emitDimensions = (
  b: DxfBuilder,
  // Hall rect in DXF coords: (x0, y0) is the hall's bottom-left corner.
  x0: number,
  y0: number,
  hallW: number,
  hallH: number
) => {
  // Width dimension below the hall.
  const yLine = y0 - DIM_OFFSET_M
  emitLine(b, LAYER_DIMS, x0, yLine, x0 + hallW, yLine)
  emitLine(b, LAYER_DIMS, x0, yLine - DIM_TICK_M, x0, yLine + DIM_TICK_M)
  emitLine(
    b,
    LAYER_DIMS,
    x0 + hallW,
    yLine - DIM_TICK_M,
    x0 + hallW,
    yLine + DIM_TICK_M
  )
  emitText(
    b,
    LAYER_DIMS,
    x0 + hallW / 2,
    yLine - LABEL_HEIGHT_M,
    LABEL_HEIGHT_M,
    `${fmtFloat(hallW)} m`
  )

  // Height dimension to the left of the hall.
  const xLine = x0 - DIM_OFFSET_M
  emitLine(b, LAYER_DIMS, xLine, y0, xLine, y0 + hallH)
  emitLine(b, LAYER_DIMS, xLine - DIM_TICK_M, y0, xLine + DIM_TICK_M, y0)
  emitLine(
    b,
    LAYER_DIMS,
    xLine - DIM_TICK_M,
    y0 + hallH,
    xLine + DIM_TICK_M,
    y0 + hallH
  )
  emitText(
    b,
    LAYER_DIMS,
    xLine - LABEL_HEIGHT_M,
    y0 + hallH / 2,
    LABEL_HEIGHT_M,
    `${fmtFloat(hallH)} m`
  )
}

export const buildPlannerDxf = (input: PlannerDxfInput): string => {
  const { halls, tables, fixtures, guests, options } = input
  // World bbox of all halls; its bottom-left maps to the DXF origin and the
  // Y-flip happens about its height, so relative hall placement is preserved.
  const world = worldBoundsOf(halls)
  const worldH = world.height
  const hallsById = new Map(halls.map((h) => [h.id, h]))
  // App-space world coords -> origin-relative coords the flip helpers expect.
  const relX = (worldX: number) => worldX - world.x
  const relY = (worldY: number) => worldY - world.y

  const b = new DxfBuilder()

  emitHeader(b)
  emitTables(b, [
    { name: LAYER_HALL, color: COLOR_HALL },
    { name: LAYER_TABLES, color: COLOR_TABLES },
    { name: LAYER_FIXTURES, color: COLOR_FIXTURES },
    { name: LAYER_LABELS, color: COLOR_LABELS },
    { name: LAYER_DIMS, color: COLOR_DIMS },
  ])

  b.push(0, "SECTION")
  b.push(2, "ENTITIES")

  // One outline per hall, each at its world position.
  for (const hall of halls) {
    const x0 = relX(hall.position.x)
    const y0 = worldH - relY(hall.position.y) - hall.size.height
    emitRect(b, LAYER_HALL, x0, y0, hall.size.width, hall.size.height)
    if (options.includeLabels && hall.name.trim()) {
      // Hall name just above its top edge.
      emitText(
        b,
        LAYER_LABELS,
        x0 + hall.size.width / 2,
        y0 + hall.size.height + LABEL_HEIGHT_M,
        LABEL_HEIGHT_M,
        hall.name.trim()
      )
    }
    if (options.includeDimensions)
      emitDimensions(b, x0, y0, hall.size.width, hall.size.height)
  }

  const seated = seatedCountByTableId(guests)
  // Entity world position (origin-relative); entities whose hall is missing
  // are emitted at their local coords (hall at origin), never dropped.
  const worldPos = (e: {
    position: { x: number; y: number }
    hallId: string
  }) => {
    const hall = hallsById.get(e.hallId)
    return {
      x: relX((hall?.position.x ?? 0) + e.position.x),
      y: relY((hall?.position.y ?? 0) + e.position.y),
    }
  }

  for (const t of tables) {
    const pos = worldPos(t)
    const rect = flipRect(worldH, pos.x, pos.y, t.size, t.rotation)
    if (t.shape === "round") {
      // Round table: stored width is the diameter; rotation is irrelevant.
      const d = t.size.width
      const cx = pos.x + d / 2
      const cy = worldH - (pos.y + d / 2)
      emitCircle(b, LAYER_TABLES, cx, cy, d / 2)
    } else if (t.shape === "custom" && t.geometry) {
      const verts = polygonToDxf(worldH, pos.x, pos.y, t.geometry)
      emitPolygon(b, LAYER_TABLES, verts, t.geometry.closed)
    } else {
      emitRect(b, LAYER_TABLES, rect.x, rect.y, rect.w, rect.h)
    }
    if (options.includeLabels) {
      const label = tableLabel(
        t,
        seated.get(t.id) ?? 0,
        options.includeCapacity
      )
      if (label) {
        emitText(
          b,
          LAYER_LABELS,
          rect.x + rect.w / 2,
          rect.y + rect.h / 2,
          LABEL_HEIGHT_M,
          label
        )
      }
    }
  }

  for (const f of fixtures) {
    const pos = worldPos(f)
    const rect = flipRect(worldH, pos.x, pos.y, f.size, f.rotation)
    if (f.shape === "circle") {
      // Circle fixture: stored width is the diameter (matches the render
      // path in FixtureVisual.tsx).
      const d = f.size.width
      const cx = pos.x + d / 2
      const cy = worldH - (pos.y + d / 2)
      emitCircle(b, LAYER_FIXTURES, cx, cy, d / 2)
    } else if (f.shape === "polygon" && f.geometry) {
      const verts = polygonToDxf(worldH, pos.x, pos.y, f.geometry)
      emitPolygon(b, LAYER_FIXTURES, verts, f.geometry.closed)
    } else {
      // "rectangle" and "rounded" both emit an axis-aligned rectangle -
      // DXF has no native "rounded rectangle" primitive at this layer of
      // abstraction. The rounded corner is purely cosmetic in the app.
      emitRect(b, LAYER_FIXTURES, rect.x, rect.y, rect.w, rect.h)
    }
    if (options.includeLabels) {
      const label = f.name.trim()
      if (label) {
        emitText(
          b,
          LAYER_LABELS,
          rect.x + rect.w / 2,
          rect.y + rect.h / 2,
          LABEL_HEIGHT_M,
          label
        )
      }
    }
  }

  b.push(0, "ENDSEC")
  b.push(0, "EOF")

  return b.toString()
}

const buildFilename = (): string => {
  const { name, date } = useGlobalStore.getState()
  const iso = (date ?? new Date()).toISOString().slice(0, 10)
  const safe = (name ?? "").replace(/[/\\?%*:|"<>]/g, "-").trim()
  return `${safe || "easywed"}-plan-${iso}.dxf`
}

export const triggerDxfExport = (options: PlannerDxfInput["options"]) => {
  const { halls, tables, fixtures, guests } = usePlannerStore.getState()
  const dxf = buildPlannerDxf({
    halls,
    tables,
    fixtures,
    guests,
    options,
  })
  const blob = new Blob([dxf], { type: "application/dxf" })
  downloadBlob(blob, buildFilename())
}
