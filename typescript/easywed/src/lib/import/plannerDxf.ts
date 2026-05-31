import { parseString } from "dxf"
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

export interface ImportPreview {
  hall: { width: number; height: number; preset: HallPreset }
  tables: Array<Table>
  fixtures: Array<Fixture>
  // True when the source DXF has the EasyWed layer naming convention, so the
  // wizard can auto-skip the layer-mapping step.
  detectedAsEasywed: boolean
  // The mapping that was used to produce this preview. The wizard keeps it so
  // the user can come back and re-edit step 2.
  mapping: LayerMapping
  // All layer names found in the file, in source order.
  layers: Array<string>
}

export interface ImportWarning {
  // `count` may be omitted when the warning isn't a "X entities skipped" kind.
  code:
    | "skipped_arc"
    | "skipped_spline"
    | "skipped_polyline_open"
    | "skipped_polyline_open_lw"
    | "skipped_unknown"
    | "no_hall"
    | "ambiguous_layer"
  count?: number
  detail?: string
}

export interface ImportResult {
  preview: ImportPreview | null
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

// dxf's parser produces entity objects with a `type` discriminator + a bag of
// fields per entity. Rather than wrestle with the (partially-untyped) lib
// types, we treat the entity stream as `Array<RawEntity>` and narrow ourselves.
type RawEntity = {
  type: string
  layer?: string
  vertices?: Array<{ x: number; y: number }>
  closed?: boolean
  x?: number
  y?: number
  r?: number
  string?: string
  nominalTextHeight?: number
} & Record<string, unknown>

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

// True for a closed LWPOLYLINE whose 4 vertices form an axis-aligned rectangle
// (allowing any rotation order of the 4 corners).
const isAxisAlignedRect = (
  vertices: Array<{ x: number; y: number }>
): boolean => {
  if (vertices.length !== 4) return false
  const xs = new Set(vertices.map((v) => Math.round(v.x * 1e3) / 1e3))
  const ys = new Set(vertices.map((v) => Math.round(v.y * 1e3) / 1e3))
  return xs.size === 2 && ys.size === 2
}

// Parse "Name 4/8" or "Name 8" capacity hints out of a label. Returns the
// trimmed name and inferred capacity if present.
const parseLabel = (raw: string): { name: string; capacity?: number } => {
  // Match a trailing " N/M" or " M" (with optional whitespace around the
  // slash), pulling out the M as capacity. Greedy on the leading name part.
  const slashMatch = raw.match(/^(.*?)\s+(\d+)\s*\/\s*(\d+)\s*$/)
  if (slashMatch) {
    return { name: slashMatch[1].trim(), capacity: Number(slashMatch[3]) }
  }
  const trailingMatch = raw.match(/^(.*?)\s+(\d+)\s*$/)
  if (trailingMatch) {
    return { name: trailingMatch[1].trim(), capacity: Number(trailingMatch[2]) }
  }
  return { name: raw.trim() }
}

// Match each label to the nearest object whose bbox-center is within a
// threshold (in meters). Unmatched labels are returned in `unused` for callers
// that want to drop them or warn.
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
  threshold = 0.6
): Map<T, LabelPoint> => {
  // Greedy nearest-neighbour: small N, no need for a kd-tree. Each label can
  // only attach to one object; once attached, it's consumed.
  const matches = new Map<T, LabelPoint>()
  const available = [...labels]
  for (const obj of objects) {
    const cx = obj.position.x + obj.size.width / 2
    const cy = obj.position.y + obj.size.height / 2
    let bestIdx = -1
    let bestDist = threshold
    for (let i = 0; i < available.length; i++) {
      const lbl = available[i]
      const dx = lbl.appX - cx
      const dy = lbl.appY - cy
      const dist = Math.hypot(dx, dy)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    }
    if (bestIdx >= 0) {
      matches.set(obj, available[bestIdx])
      available.splice(bestIdx, 1)
    }
  }
  return matches
}

// Group entities by layer name, returning a Map for stable iteration.
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

// Compute hall dimensions from an LWPOLYLINE on the hall layer. Returns null
// if there isn't exactly one suitable closed rectangle.
const extractHallDimensions = (
  hallEntities: Array<RawEntity>
): { width: number; height: number; bottomLeftDxfY: number } | null => {
  for (const e of hallEntities) {
    if (e.type !== "LWPOLYLINE" || !e.closed || !e.vertices) continue
    const box = aabb(e.vertices)
    if (!Number.isFinite(box.minX) || !Number.isFinite(box.minY)) continue
    return {
      width: box.maxX - box.minX,
      height: box.maxY - box.minY,
      bottomLeftDxfY: box.minY,
    }
  }
  return null
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

const buildTablesFromEntities = (
  opts: BuildOpts,
  entities: Array<RawEntity>,
  labels: Array<LabelPoint>,
  warnings: Array<ImportWarning>
): Array<Table> => {
  const tables: Array<Table> = []
  for (const e of entities) {
    if (
      e.type === "CIRCLE" &&
      typeof e.x === "number" &&
      typeof e.y === "number" &&
      typeof e.r === "number"
    ) {
      const topLeft = dxfToAppPoint(opts, e.x - e.r, e.y + e.r)
      const diameter = e.r * 2
      tables.push({
        id: crypto.randomUUID(),
        name: "",
        shape: "round",
        capacity: DEFAULT_CAPACITY,
        size: { width: diameter, height: diameter },
        rotation: 0,
        position: topLeft,
      })
      continue
    }
    if (e.type === "LWPOLYLINE" && e.vertices) {
      if (!e.closed) {
        bumpWarning(warnings, "skipped_polyline_open_lw")
        continue
      }
      if (isAxisAlignedRect(e.vertices)) {
        const box = aabb(e.vertices)
        const topLeft = dxfToAppPoint(opts, box.minX, box.maxY)
        tables.push({
          id: crypto.randomUUID(),
          name: "",
          shape: "rectangular",
          capacity: DEFAULT_CAPACITY,
          size: {
            width: box.maxX - box.minX,
            height: box.maxY - box.minY,
          },
          rotation: 0,
          position: topLeft,
        })
        continue
      }
      // Generic closed polygon → custom shape.
      const box = aabb(e.vertices)
      const topLeft = dxfToAppPoint(opts, box.minX, box.maxY)
      const geometry: Geometry = {
        vertices: e.vertices.map((v) => ({
          x: v.x - box.minX,
          y: box.maxY - v.y,
        })),
        closed: true,
      }
      tables.push({
        id: crypto.randomUUID(),
        name: "",
        shape: "custom",
        capacity: DEFAULT_CAPACITY,
        size: {
          width: box.maxX - box.minX,
          height: box.maxY - box.minY,
        },
        rotation: 0,
        position: topLeft,
        geometry,
      })
      continue
    }
    countSkip(e, warnings)
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

const buildFixturesFromEntities = (
  opts: BuildOpts,
  entities: Array<RawEntity>,
  labels: Array<LabelPoint>,
  warnings: Array<ImportWarning>
): Array<Fixture> => {
  const fixtures: Array<Fixture> = []
  for (const e of entities) {
    if (
      e.type === "CIRCLE" &&
      typeof e.x === "number" &&
      typeof e.y === "number" &&
      typeof e.r === "number"
    ) {
      const topLeft = dxfToAppPoint(opts, e.x - e.r, e.y + e.r)
      const diameter = e.r * 2
      fixtures.push({
        id: crypto.randomUUID(),
        name: "",
        shape: "circle",
        size: { width: diameter, height: diameter },
        rotation: 0,
        position: topLeft,
      })
      continue
    }
    if (e.type === "LWPOLYLINE" && e.vertices) {
      if (!e.closed) {
        bumpWarning(warnings, "skipped_polyline_open_lw")
        continue
      }
      if (isAxisAlignedRect(e.vertices)) {
        const box = aabb(e.vertices)
        const topLeft = dxfToAppPoint(opts, box.minX, box.maxY)
        fixtures.push({
          id: crypto.randomUUID(),
          name: "",
          shape: "rectangle",
          size: {
            width: box.maxX - box.minX,
            height: box.maxY - box.minY,
          },
          rotation: 0,
          position: topLeft,
        })
        continue
      }
      const box = aabb(e.vertices)
      const topLeft = dxfToAppPoint(opts, box.minX, box.maxY)
      const geometry: Geometry = {
        vertices: e.vertices.map((v) => ({
          x: v.x - box.minX,
          y: box.maxY - v.y,
        })),
        closed: true,
      }
      fixtures.push({
        id: crypto.randomUUID(),
        name: "",
        shape: "polygon",
        size: {
          width: box.maxX - box.minX,
          height: box.maxY - box.minY,
        },
        rotation: 0,
        position: topLeft,
        geometry,
      })
      continue
    }
    countSkip(e, warnings)
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
  entities: Array<RawEntity>
): Array<LabelPoint> => {
  const out: Array<LabelPoint> = []
  for (const e of entities) {
    if (
      (e.type === "MTEXT" || e.type === "TEXT") &&
      typeof e.x === "number" &&
      typeof e.y === "number"
    ) {
      const text = (e.string ?? "").toString().trim()
      if (!text) continue
      const pos = dxfToAppPoint(opts, e.x, e.y)
      out.push({ appX: pos.x, appY: pos.y, text })
    }
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

const countSkip = (e: RawEntity, warnings: Array<ImportWarning>) => {
  switch (e.type) {
    case "ARC":
      return bumpWarning(warnings, "skipped_arc")
    case "SPLINE":
      return bumpWarning(warnings, "skipped_spline")
    case "POLYLINE":
      return bumpWarning(warnings, "skipped_polyline_open")
    case "DIMENSION":
    case "LINE":
    case "POINT":
    case "TEXT":
    case "MTEXT":
      // Silently ignored: handled by other passes or considered annotation
      // noise that doesn't represent a planner object.
      return
    default:
      return bumpWarning(warnings, "skipped_unknown")
  }
}

export const parsePlannerDxf = (
  content: string,
  // When provided, overrides the auto-detected mapping (step 2 of the wizard).
  userMapping?: LayerMapping
): ImportResult => {
  const warnings: Array<ImportWarning> = []
  let parsed: { entities?: Array<RawEntity> }
  try {
    parsed = parseString(content) as { entities?: Array<RawEntity> }
  } catch (err) {
    return {
      preview: null,
      warnings: [
        {
          code: "skipped_unknown",
          detail: err instanceof Error ? err.message : String(err),
        },
      ],
    }
  }

  const entities = parsed.entities ?? []
  const grouped = groupByLayer(entities)
  const layerNames = Array.from(grouped.keys())
  const mapping = userMapping ?? buildAutoMapping(layerNames)
  const detectedAsEasywed = detectEasywedLayers(layerNames)

  // Collect entities per role using the mapping.
  const byRole: Record<LayerRole, Array<RawEntity>> = {
    hall: [],
    tables: [],
    fixtures: [],
    labels: [],
    ignore: [],
  }
  for (const [layer, list] of grouped.entries()) {
    const role = mapping[layer] ?? "ignore"
    byRole[role].push(...list)
  }

  // Determine hall geometry. If no hall-role layer or no rectangle there,
  // we surface a warning and let the wizard reject the import.
  const hallDims = extractHallDimensions(byRole.hall)
  if (!hallDims) {
    warnings.push({ code: "no_hall" })
    return { preview: null, warnings }
  }

  // World-to-app offset: anchor the hall outline's bottom-left at (0, 0) in
  // app space so the imported layout doesn't depend on the file's drawing
  // origin.
  const offsetX = Math.min(
    ...byRole.hall
      .filter((e) => e.type === "LWPOLYLINE" && e.vertices)
      .flatMap((e) => e.vertices!.map((v) => v.x))
  )
  const opts: BuildOpts = {
    hallH: hallDims.height,
    offsetX,
    offsetY: hallDims.bottomLeftDxfY,
  }

  const labels = buildLabels(opts, byRole.labels)
  const tables = buildTablesFromEntities(opts, byRole.tables, labels, warnings)
  const fixtures = buildFixturesFromEntities(
    opts,
    byRole.fixtures,
    labels,
    warnings
  )

  return {
    preview: {
      hall: {
        width: hallDims.width,
        height: hallDims.height,
        // Custom preset — imported halls are rarely a clean rectangle in the
        // app's preset taxonomy, but the outline rectangle is what we store.
        preset: "custom",
      },
      tables,
      fixtures,
      detectedAsEasywed,
      mapping,
      layers: layerNames,
    },
    warnings,
  }
}
