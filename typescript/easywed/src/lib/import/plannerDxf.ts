import { denormalise, parseString } from "dxf"
import { applyTransforms, entityToPolyline } from "./dxfGeometry"
import type { DxfEntity, DxfTransform } from "./dxfGeometry"
import type {
  Fixture,
  Geometry,
  HallPreset,
  Position,
  Table,
} from "@/stores/planner.store"

// Layer roles. "ignore" means the layer's entities are silently dropped.
export type LayerRole = "hall" | "tables" | "fixtures" | "labels" | "ignore"

export type LayerMapping = Record<string, LayerRole>

// Source units we can scale from. `$INSUNITS` covers more (km, yards, …) but
// these are the ones a wedding-hall drawing realistically uses; anything else
// falls back to meters + a `unit_assumed` warning.
export type DxfUnit = "mm" | "cm" | "m" | "in" | "ft"

// Multiply a source coordinate by this to get meters (the app's unit).
export const UNIT_SCALE: Record<DxfUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  in: 0.0254,
  ft: 0.3048,
}

// $INSUNITS integer → our DxfUnit subset. 0 (unitless) and any code we don't
// model are absent, so a lookup returns `undefined`, which drives the meters
// fallback. Typed with `| undefined` so that absence is visible to callers.
const INSUNITS_TO_UNIT: Record<number, DxfUnit | undefined> = {
  1: "in",
  2: "ft",
  4: "mm",
  5: "cm",
  6: "m",
}

export interface ImportPreview {
  hall: { width: number; height: number; preset: HallPreset }
  tables: Array<Table>
  fixtures: Array<Fixture>
}

export interface ImportWarning {
  // `count` may be omitted when the warning isn't a "X entities skipped" kind.
  code: // An open ARC can't bound a closed shape, so it's dropped.
    | "skipped_arc"
    // An open (non-closed) SPLINE is dropped; closed splines are tessellated.
    | "skipped_spline"
    // Covers both heavy POLYLINE entities and open LWPOLYLINEs — neither can
    // represent a closed planner shape, so they're counted under one code.
    | "skipped_polyline_open"
    | "skipped_unknown"
    // No hall outline was found. Non-fatal when paired with `hall_synthesized`
    // (we wrapped the imported objects); fatal when there's also nothing to
    // wrap, in which case it's the only warning and preview is null.
    | "no_hall"
    // Hall dimensions were derived from the AABB of imported objects plus a
    // fixed padding because the file didn't contain a usable hall outline.
    | "hall_synthesized"
    | "ambiguous_layer"
    // The file carried no usable `$INSUNITS`, so we assumed meters. The user
    // can correct this via the unit dropdown in the wizard.
    | "unit_assumed"
    // The DXF library threw while parsing. `detail` carries the error message.
    | "parse_error"
  count?: number
  detail?: string
}

export interface ImportResult {
  preview: ImportPreview | null
  // Layer metadata is always populated, even when `preview` is null. This lets
  // the wizard drive its layer-mapping step on files that don't auto-detect as
  // EasyWed exports — without it, the initial parse (where every layer maps
  // to "ignore") would always fail with `no_hall` and dead-end into the error
  // stage.
  layers: Array<string>
  mapping: LayerMapping
  detectedAsEasywed: boolean
  // Unit detected from `$INSUNITS` (null when the file was unitless/unknown),
  // and the unit actually used for this parse (override → detected → meters).
  detectedUnit: DxfUnit | null
  resolvedUnit: DxfUnit
  warnings: Array<ImportWarning>
}

// Layer names emitted by buildPlannerDxf. Used for auto-detection.
const EASYWED_LAYERS: Record<string, LayerRole> = {
  HALL: "hall",
  TABLES: "tables",
  FIXTURES: "fixtures",
  LABELS: "labels",
  DIMS: "ignore",
}

const DEFAULT_CAPACITY = 8

// Spline tessellation density. The lib default is 25; 16 keeps the persisted
// jsonb vertex count modest while staying smooth enough at hall scale.
const SPLINE_SEGMENTS = 16

// Tolerance (fraction of radius) for treating an ELLIPSE / non-uniformly
// scaled CIRCLE as a true circle rather than a polygon.
const CIRCLE_RATIO_EPS = 0.02

// dxf's parser produces entity objects with a `type` discriminator + a bag of
// fields per entity. `denormalise` additionally attaches a `transforms` stack.
// Rather than wrestle with the (partially-untyped) lib types, we treat the
// entity stream as `Array<RawEntity>` and narrow ourselves. `DxfEntity` (from
// ./dxfGeometry) supplies the geometry fields the tessellation reads; we add
// the few extra fields this module needs on top.
type RawEntity = DxfEntity & {
  layer?: string
  flag?: number
  string?: string
} & Record<string, unknown>

// A normalized planner-relevant shape, in scaled world DXF coordinates
// (meters, Y-up). Produced from raw entities so insert transforms and curves
// are already resolved before classification.
type NormShape =
  | { kind: "circle"; cx: number; cy: number; r: number; layer: string }
  | {
      kind: "poly"
      // Always a closed polygon — open polylines are reported as skips, never
      // surfaced as shapes.
      vertices: Array<Position>
      layer: string
    }
  | { kind: "text"; x: number; y: number; text: string; layer: string }

// Either a usable shape, or a skip with an optional warning code. `null` skip
// code means "drop silently" (e.g. LINE noise, already-expanded INSERT).
type NormResult = NormShape | { skip: ImportWarning["code"] | null }

const isShape = (r: NormResult): r is NormShape => "kind" in r

// Convert a DXF world point (Y-up, origin at hall bottom-left) to an app point
// (Y-down, origin at hall top-left).
const toApp = (hallH: number, dx: number, dy: number): Position => ({
  x: dx,
  y: hallH - dy,
})

// Bounding box of a vertex list, in whatever coordinate system the vertices
// are already in.
const aabb = (
  vertices: Array<{ x: number; y: number }>
): { minX: number; minY: number; maxX: number; maxY: number } => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const v of vertices) {
    if (v.x < minX) minX = v.x
    if (v.y < minY) minY = v.y
    if (v.x > maxX) maxX = v.x
    if (v.y > maxY) maxY = v.y
  }
  return { minX, minY, maxX, maxY }
}

// True for a closed polygon whose 4 vertices form an axis-aligned rectangle
// (allowing any rotation order of the 4 corners).
const isAxisAlignedRect = (
  vertices: Array<{ x: number; y: number }>
): boolean => {
  if (vertices.length !== 4) return false
  const xs = new Set(vertices.map((v) => Math.round(v.x * 1e3) / 1e3))
  const ys = new Set(vertices.map((v) => Math.round(v.y * 1e3) / 1e3))
  return xs.size === 2 && ys.size === 2
}

// Parse a "Name seated/capacity" hint out of a label, pulling out the
// capacity. Only the unambiguous slash form is treated as a capacity: a bare
// trailing number is left as part of the name, since "Table 12" is far more
// likely to be a table name than a capacity-12 table. Our own export always
// emits the slash form (see `tableLabel` in export/plannerDxf.ts), so dropping
// the bare-number heuristic only affects foreign CAD files — where it was more
// likely to corrupt a name than to recover a real capacity.
const parseLabel = (raw: string): { name: string; capacity?: number } => {
  // Match a trailing " N/M" (with optional whitespace around the slash),
  // pulling out the M as capacity. Greedy on the leading name part.
  const slashMatch = raw.match(/^(.*?)\s+(\d+)\s*\/\s*(\d+)\s*$/)
  if (slashMatch) {
    return { name: slashMatch[1].trim(), capacity: Number(slashMatch[3]) }
  }
  return { name: raw.trim() }
}

// Greedy nearest-label matcher. A label attaches to an object when its point
// is inside the object's AABB, or within `LABEL_MATCH_THRESHOLD_M` of the
// center. The inside check matters for large tables, where a centered label
// can sit well beyond the radius threshold. Threshold is in meters (post-scale).
export const LABEL_MATCH_THRESHOLD_M = 0.6

interface LabelPoint {
  appX: number
  appY: number
  text: string
}

const matchLabels = <
  T extends { position: Position; size: { width: number; height: number } },
>(
  objects: Array<T>,
  labels: Array<LabelPoint>,
  threshold = LABEL_MATCH_THRESHOLD_M
): Map<T, LabelPoint> => {
  // Small N, no need for a kd-tree. Each label can only attach to one object;
  // once attached, it's consumed.
  const matches = new Map<T, LabelPoint>()
  const available = [...labels]
  for (const obj of objects) {
    const left = obj.position.x
    const top = obj.position.y
    const right = left + obj.size.width
    const bottom = top + obj.size.height
    const cx = left + obj.size.width / 2
    const cy = top + obj.size.height / 2
    // Prefer an inside label over an outside-but-near one; among equals, the
    // nearest to center wins.
    let bestIdx = -1
    let bestInside = false
    let bestDist = Infinity
    for (let i = 0; i < available.length; i++) {
      const lbl = available[i]
      const inside =
        lbl.appX >= left &&
        lbl.appX <= right &&
        lbl.appY >= top &&
        lbl.appY <= bottom
      const dist = Math.hypot(lbl.appX - cx, lbl.appY - cy)
      if (!inside && dist > threshold) continue
      const better =
        bestIdx === -1 ||
        (inside && !bestInside) ||
        (inside === bestInside && dist < bestDist)
      if (better) {
        bestIdx = i
        bestInside = inside
        bestDist = dist
      }
    }
    if (bestIdx >= 0) {
      matches.set(obj, available[bestIdx])
      available.splice(bestIdx, 1)
    }
  }
  return matches
}

// Group raw entities by layer name, returning a Map for stable iteration.
const groupByLayer = (
  entities: Array<RawEntity>
): Map<string, Array<RawEntity>> => {
  const out = new Map<string, Array<RawEntity>>()
  for (const e of entities) {
    const layer = e.layer ?? ""
    const list = out.get(layer) ?? []
    list.push(e)
    out.set(layer, list)
  }
  return out
}

// Detect the EasyWed export convention. We only see layers that have at
// least one entity on them, so a hall-only file won't have a TABLES layer
// in the set — require HALL plus at least one of TABLES/FIXTURES to call it
// an EasyWed export.
export const detectEasywedLayers = (layerNames: Array<string>): boolean => {
  const set = new Set(layerNames)
  return set.has("HALL") && (set.has("TABLES") || set.has("FIXTURES"))
}

// Auto-build a mapping. EasyWed exports get the canonical mapping; otherwise
// every detected layer starts as "ignore" so the user explicitly opts in.
export const buildAutoMapping = (layerNames: Array<string>): LayerMapping => {
  if (detectEasywedLayers(layerNames)) {
    const mapping: LayerMapping = {}
    for (const name of layerNames) {
      mapping[name] = EASYWED_LAYERS[name] ?? "ignore"
    }
    return mapping
  }
  const mapping: LayerMapping = {}
  for (const name of layerNames) mapping[name] = "ignore"
  return mapping
}

// ---------------------------------------------------------------------------
// Entity normalization
// ---------------------------------------------------------------------------

const TWO_PI = Math.PI * 2

// Combined absolute scale factors across an insert transform stack. Used to
// scale a circle's radius and to decide whether a circle stays a circle
// (uniform scale) or becomes an ellipse-polygon (non-uniform scale).
const combinedScale = (
  transforms: Array<DxfTransform>
): { sx: number; sy: number } => {
  let sx = 1
  let sy = 1
  for (const t of transforms) {
    if (typeof t.scaleX === "number") sx *= t.scaleX
    if (typeof t.scaleY === "number") sy *= t.scaleY
  }
  return { sx: Math.abs(sx), sy: Math.abs(sy) }
}

const isUniformScale = (sx: number, sy: number): boolean =>
  Math.abs(sx - sy) <= CIRCLE_RATIO_EPS * Math.max(sx, sy, 1e-9)

// Drop a trailing vertex coincident with the first. `entityToPolyline` repeats
// the start point to close LWPOLYLINEs and full ellipses; we store an implicit
// close, so the duplicate would otherwise inflate the vertex count (and break
// the 4-vertex rectangle check).
const stripClosingDuplicate = (verts: Array<Position>): Array<Position> => {
  if (verts.length < 2) return verts
  const a = verts[0]
  const b = verts[verts.length - 1]
  if (Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6) {
    return verts.slice(0, -1)
  }
  return verts
}

// Tessellate any curve/polyline entity to a closed polygon in scaled world
// coords. Returns null when the lib can't produce a usable polyline.
const polyFromEntity = (e: RawEntity, scale: number): NormShape | null => {
  const local = entityToPolyline(e, {
    interpolationsPerSplineSegment: SPLINE_SEGMENTS,
  })
  if (local.length === 0) return null
  const world = applyTransforms(local, e.transforms ?? [])
  const verts = stripClosingDuplicate(
    world.map(([x, y]) => ({ x: x * scale, y: y * scale }))
  )
  if (verts.length < 3) return null
  return { kind: "poly", vertices: verts, layer: e.layer ?? "" }
}

const applyToPoint = (
  e: RawEntity,
  x: number,
  y: number
): { x: number; y: number } => {
  const [tx, ty] = applyTransforms([[x, y]], e.transforms ?? [])[0]
  return { x: tx, y: ty }
}

const normalizeEntity = (e: RawEntity, scale: number): NormResult => {
  const layer = e.layer ?? ""
  switch (e.type) {
    case "TEXT":
    case "MTEXT": {
      if (typeof e.x !== "number" || typeof e.y !== "number") {
        return { skip: null }
      }
      const text = (e.string ?? "").toString().trim()
      if (!text) return { skip: null }
      const p = applyToPoint(e, e.x, e.y)
      return { kind: "text", x: p.x * scale, y: p.y * scale, text, layer }
    }
    case "CIRCLE": {
      if (
        typeof e.x !== "number" ||
        typeof e.y !== "number" ||
        typeof e.r !== "number"
      ) {
        return { skip: null }
      }
      const { sx, sy } = combinedScale(e.transforms ?? [])
      // Non-uniform scale squashes the circle into an ellipse: fall back to a
      // tessellated polygon so the aspect ratio is preserved.
      if (!isUniformScale(sx, sy)) {
        return polyFromEntity(e, scale) ?? { skip: null }
      }
      const c = applyToPoint(e, e.x, e.y)
      return {
        kind: "circle",
        cx: c.x * scale,
        cy: c.y * scale,
        r: e.r * sx * scale,
        layer,
      }
    }
    case "ELLIPSE": {
      const start = e.startAngle ?? 0
      const end = e.endAngle ?? TWO_PI
      const full =
        Math.abs(Math.abs(end - start) - TWO_PI) < 1e-3 ||
        (start === 0 && end === 0)
      // A partial ellipse is an open arc — can't bound a shape.
      if (!full) return { skip: "skipped_unknown" }
      const rx = Math.hypot(e.majorX ?? 0, e.majorY ?? 0)
      const ry = (e.axisRatio ?? 1) * rx
      const { sx, sy } = combinedScale(e.transforms ?? [])
      const nearCircular = rx > 0 && Math.abs(rx - ry) <= CIRCLE_RATIO_EPS * rx
      if (nearCircular && isUniformScale(sx, sy)) {
        const c = applyToPoint(e, e.x ?? 0, e.y ?? 0)
        return {
          kind: "circle",
          cx: c.x * scale,
          cy: c.y * scale,
          r: rx * sx * scale,
          layer,
        }
      }
      return polyFromEntity(e, scale) ?? { skip: null }
    }
    case "LWPOLYLINE":
    case "POLYLINE": {
      if (!e.closed) return { skip: "skipped_polyline_open" }
      return polyFromEntity(e, scale) ?? { skip: null }
    }
    case "SPLINE": {
      const closed = !!e.closed || ((e.flag ?? 0) & 1) === 1
      if (!closed) return { skip: "skipped_spline" }
      return polyFromEntity(e, scale) ?? { skip: null }
    }
    case "ARC":
      return { skip: "skipped_arc" }
    // Annotation/structural noise, or an INSERT that `denormalise` already
    // expanded (a leftover means a missing block def, logged by the lib).
    case "LINE":
    case "POINT":
    case "DIMENSION":
    case "INSERT":
      return { skip: null }
    default:
      return { skip: "skipped_unknown" }
  }
}

// Hall info recovered from the source file, or synthesized from the AABB of
// imported objects when no hall outline was present. All values in meters.
interface HallInfo {
  width: number
  height: number
  // Bottom-left of the hall in DXF world coords — used to anchor the app's
  // hall at (0, 0).
  bottomLeftDxfY: number
  offsetX: number
  // Whether the recovered outline is an axis-aligned rectangle. Drives the
  // stored `preset` so a round-tripped rectangle hall comes back as
  // "rectangle" rather than the catch-all "custom".
  isRect: boolean
}

// Compute hall dimensions from the largest closed polygon on the hall layer.
// Picking the largest (by AABB area) handles drawings that include auxiliary
// outlines on the same layer — without that we could silently grab a small
// annotation rectangle drawn before the actual hall outline.
const extractHallDimensions = (shapes: Array<NormShape>): HallInfo | null => {
  let best: HallInfo | null = null
  let bestArea = 0
  for (const s of shapes) {
    if (s.kind !== "poly") continue
    if (s.vertices.length < 3) continue
    const box = aabb(s.vertices)
    if (!Number.isFinite(box.minX) || !Number.isFinite(box.minY)) continue
    const width = box.maxX - box.minX
    const height = box.maxY - box.minY
    if (width <= 0 || height <= 0) continue
    const area = width * height
    if (area > bestArea) {
      bestArea = area
      best = {
        width,
        height,
        bottomLeftDxfY: box.minY,
        offsetX: box.minX,
        isRect: isAxisAlignedRect(s.vertices),
      }
    }
  }
  return best
}

// Padding (meters) added on each side when synthesizing a hall to wrap
// imported objects. Keeps tables/fixtures from sitting flush against the
// hall edge after import.
export const FALLBACK_HALL_PADDING = 1

// Wrap all imported objects in a synthesized hall. Returns null when there's
// nothing to wrap (in which case the caller surfaces `no_hall` as fatal).
// Hall-layer shapes are deliberately excluded: this path runs precisely when
// the hall layer had no usable outline, so its leftover shapes shouldn't drive
// the size either. Labels are excluded too — a stray label sitting away from
// the furniture would inflate the box, and labels are positioned relative to
// objects we already account for.
const computeFallbackHall = (
  byRole: Record<LayerRole, Array<NormShape>>,
  padding: number
): HallInfo | null => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const extend = (x: number, y: number) => {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  for (const s of [...byRole.tables, ...byRole.fixtures]) {
    if (s.kind === "circle") {
      extend(s.cx - s.r, s.cy - s.r)
      extend(s.cx + s.r, s.cy + s.r)
    } else if (s.kind === "poly") {
      for (const v of s.vertices) extend(v.x, v.y)
    }
  }
  if (!Number.isFinite(minX)) return null
  return {
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
    bottomLeftDxfY: minY - padding,
    offsetX: minX - padding,
    // A synthesized hall is always a plain bounding rectangle.
    isRect: true,
  }
}

interface BuildOpts {
  hallH: number
  // Offset between the DXF model-space origin and the hall's bottom-left
  // corner. Subtracted before conversion to make the app's hall start at
  // (0, 0) regardless of where the hall outline was drawn in model space.
  offsetX: number
  offsetY: number
}

const dxfToAppPoint = (opts: BuildOpts, dx: number, dy: number): Position =>
  toApp(opts.hallH, dx - opts.offsetX, dy - opts.offsetY)

// Convert a closed polygon's world vertices to object-local geometry (top-left
// origin, Y down) plus its AABB-derived position and size.
const polyToLocal = (
  opts: BuildOpts,
  vertices: Array<Position>
): {
  position: Position
  size: { width: number; height: number }
  geometry: Geometry
} => {
  const box = aabb(vertices)
  return {
    position: dxfToAppPoint(opts, box.minX, box.maxY),
    size: { width: box.maxX - box.minX, height: box.maxY - box.minY },
    geometry: {
      vertices: vertices.map((v) => ({ x: v.x - box.minX, y: box.maxY - v.y })),
      closed: true,
    },
  }
}

const buildTablesFromShapes = (
  opts: BuildOpts,
  shapes: Array<NormShape>,
  labels: Array<LabelPoint>
): Array<Table> => {
  const tables: Array<Table> = []
  for (const s of shapes) {
    if (s.kind === "circle") {
      const topLeft = dxfToAppPoint(opts, s.cx - s.r, s.cy + s.r)
      const diameter = s.r * 2
      tables.push({
        id: crypto.randomUUID(),
        name: "",
        shape: "round",
        capacity: DEFAULT_CAPACITY,
        size: { width: diameter, height: diameter },
        rotation: 0,
        position: topLeft,
      })
    } else if (s.kind === "poly") {
      if (isAxisAlignedRect(s.vertices)) {
        const box = aabb(s.vertices)
        tables.push({
          id: crypto.randomUUID(),
          name: "",
          shape: "rectangular",
          capacity: DEFAULT_CAPACITY,
          size: { width: box.maxX - box.minX, height: box.maxY - box.minY },
          rotation: 0,
          position: dxfToAppPoint(opts, box.minX, box.maxY),
        })
      } else {
        const { position, size, geometry } = polyToLocal(opts, s.vertices)
        tables.push({
          id: crypto.randomUUID(),
          name: "",
          shape: "custom",
          capacity: DEFAULT_CAPACITY,
          size,
          rotation: 0,
          position,
          geometry,
        })
      }
    }
    // text shapes on a tables layer carry no object: ignored.
  }

  // Attach matching labels.
  const matches = matchLabels(tables, labels)
  for (const [table, label] of matches.entries()) {
    const parsed = parseLabel(label.text)
    if (parsed.name) table.name = parsed.name
    if (parsed.capacity && parsed.capacity > 0) table.capacity = parsed.capacity
  }
  return tables
}

const buildFixturesFromShapes = (
  opts: BuildOpts,
  shapes: Array<NormShape>,
  labels: Array<LabelPoint>
): Array<Fixture> => {
  const fixtures: Array<Fixture> = []
  for (const s of shapes) {
    if (s.kind === "circle") {
      const topLeft = dxfToAppPoint(opts, s.cx - s.r, s.cy + s.r)
      const diameter = s.r * 2
      fixtures.push({
        id: crypto.randomUUID(),
        name: "",
        shape: "circle",
        size: { width: diameter, height: diameter },
        rotation: 0,
        position: topLeft,
      })
    } else if (s.kind === "poly") {
      if (isAxisAlignedRect(s.vertices)) {
        const box = aabb(s.vertices)
        fixtures.push({
          id: crypto.randomUUID(),
          name: "",
          shape: "rectangle",
          size: { width: box.maxX - box.minX, height: box.maxY - box.minY },
          rotation: 0,
          position: dxfToAppPoint(opts, box.minX, box.maxY),
        })
      } else {
        const { position, size, geometry } = polyToLocal(opts, s.vertices)
        fixtures.push({
          id: crypto.randomUUID(),
          name: "",
          shape: "polygon",
          size,
          rotation: 0,
          position,
          geometry,
        })
      }
    }
  }

  const matches = matchLabels(fixtures, labels)
  for (const [fixture, label] of matches.entries()) {
    const parsed = parseLabel(label.text)
    if (parsed.name) fixture.name = parsed.name
  }
  return fixtures
}

const buildLabels = (
  opts: BuildOpts,
  shapes: Array<NormShape>
): Array<LabelPoint> => {
  const out: Array<LabelPoint> = []
  for (const s of shapes) {
    if (s.kind !== "text") continue
    const pos = dxfToAppPoint(opts, s.x, s.y)
    out.push({ appX: pos.x, appY: pos.y, text: s.text })
  }
  return out
}

const bumpWarning = (
  warnings: Array<ImportWarning>,
  code: ImportWarning["code"]
) => {
  const existing = warnings.find((w) => w.code === code)
  if (existing) existing.count = (existing.count ?? 0) + 1
  else warnings.push({ code, count: 1 })
}

const detectUnit = (header: unknown): DxfUnit | null => {
  // Runtime stores the value under `insUnits` (the `@types/dxf` `$INSUNITS`
  // declaration doesn't match the parser's actual key).
  const insUnits = (header as { insUnits?: number } | undefined)?.insUnits
  if (typeof insUnits === "number" && INSUNITS_TO_UNIT[insUnits]) {
    return INSUNITS_TO_UNIT[insUnits]
  }
  return null
}

const failure = (
  warnings: Array<ImportWarning>,
  extra?: Partial<ImportResult>
): ImportResult => ({
  preview: null,
  layers: [],
  mapping: {},
  detectedAsEasywed: false,
  detectedUnit: null,
  resolvedUnit: "m",
  warnings,
  ...extra,
})

export const parsePlannerDxf = (
  content: string,
  // When provided, overrides the auto-detected mapping (step 2 of the wizard).
  userMapping?: LayerMapping,
  // When provided, overrides the unit detected from `$INSUNITS`.
  unitOverride?: DxfUnit
): ImportResult => {
  const warnings: Array<ImportWarning> = []
  let parsed: ReturnType<typeof parseString>
  let entities: Array<RawEntity>
  try {
    parsed = parseString(content)
    // Expand INSERT/block references into a flat entity stream, baking the
    // insert transforms onto each entity (read later via `applyTransforms`).
    entities = denormalise(parsed) as unknown as Array<RawEntity>
  } catch (err) {
    return failure([
      {
        code: "parse_error",
        detail: err instanceof Error ? err.message : String(err),
      },
    ])
  }

  // Resolve the unit: explicit override → detected → meters (with a warning).
  const detectedUnit = detectUnit(parsed.header)
  const resolvedUnit: DxfUnit = unitOverride ?? detectedUnit ?? "m"
  const scale = UNIT_SCALE[resolvedUnit]
  if (!unitOverride && !detectedUnit) warnings.push({ code: "unit_assumed" })

  const grouped = groupByLayer(entities)
  const layerNames = Array.from(grouped.keys())
  const mapping = userMapping ?? buildAutoMapping(layerNames)
  const detectedAsEasywed = detectEasywedLayers(layerNames)

  // Normalize entities per role. Entities on ignored layers are dropped
  // silently; skip warnings only fire for layers the user actually cares
  // about (hall/tables/fixtures/labels).
  const byRole: Record<LayerRole, Array<NormShape>> = {
    hall: [],
    tables: [],
    fixtures: [],
    labels: [],
    ignore: [],
  }
  for (const [layer, list] of grouped.entries()) {
    const role = mapping[layer] ?? "ignore"
    if (role === "ignore") continue
    for (const e of list) {
      const r = normalizeEntity(e, scale)
      if (isShape(r)) byRole[role].push(r)
      else if (r.skip) bumpWarning(warnings, r.skip)
    }
  }

  const base = {
    layers: layerNames,
    mapping,
    detectedAsEasywed,
    detectedUnit,
    resolvedUnit,
  }

  // Determine hall geometry. If the hall layer has no usable outline, fall
  // back to wrapping imported objects in a synthesized hall + padding. Only
  // when there's also nothing to wrap do we treat `no_hall` as fatal.
  let hall = extractHallDimensions(byRole.hall)
  if (!hall) {
    warnings.push({ code: "no_hall" })
    hall = computeFallbackHall(byRole, FALLBACK_HALL_PADDING)
    if (!hall) {
      return { preview: null, warnings, ...base }
    }
    warnings.push({ code: "hall_synthesized" })
  }

  // World-to-app offset: anchor the hall's bottom-left at (0, 0) in app space
  // so the imported layout doesn't depend on the file's drawing origin.
  const opts: BuildOpts = {
    hallH: hall.height,
    offsetX: hall.offsetX,
    offsetY: hall.bottomLeftDxfY,
  }

  const labels = buildLabels(opts, byRole.labels)
  const tables = buildTablesFromShapes(opts, byRole.tables, labels)
  const fixtures = buildFixturesFromShapes(opts, byRole.fixtures, labels)

  return {
    preview: {
      hall: {
        width: hall.width,
        height: hall.height,
        // A clean axis-aligned outline round-trips back to "rectangle"; any
        // other polygon outline is stored under the catch-all "custom" preset
        // (we only persist width/height, so the exact polygon isn't kept).
        preset: hall.isRect ? "rectangle" : "custom",
      },
      tables,
      fixtures,
    },
    warnings,
    ...base,
  }
}
