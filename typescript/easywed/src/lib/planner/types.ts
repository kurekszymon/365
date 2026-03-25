export type TableShape = "round" | "rectangular"

export type Dietary =
  | "vegetarian"
  | "vegan"
  | "gluten-free"
  | "halal"
  | "kosher"

// ---------------------------------------------------------------------------
// Hall types
// ---------------------------------------------------------------------------

export interface HallPoint {
  x: number // canvas pixels
  y: number // canvas pixels
}

export interface HallDoor {
  id: string
  wallIndex: number // index of wall segment (edge between points[i] and points[(i+1) % n])
  position: number // 0–1 along wall
  widthM: number // door width in meters
}

export type HallPreset = "rectangle" | "l-shape" | "u-shape" | "custom"

export interface HallConfig {
  points: HallPoint[] // polygon vertices in canvas pixels
  doors: HallDoor[]
  pixelsPerMeter: number
  preset: HallPreset
}

export const DEFAULT_PIXELS_PER_METER = 80

// ---------------------------------------------------------------------------
// Table & Guest
// ---------------------------------------------------------------------------

export interface PlannerTable {
  id: string
  name: string
  shape: TableShape
  capacity: number
  x: number // canvas pixels
  y: number // canvas pixels
  widthPx: number // visual width in pixels (round: diameter)
  heightPx: number // visual height in pixels (round: same as widthPx)
}

export interface PlannerGuest {
  id: string
  name: string
  dietary: Dietary[]
  tableId: string | null
  note?: string
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface PlannerState {
  version: 1
  weddingName: string
  hall: HallConfig | null
  tables: PlannerTable[]
  guests: PlannerGuest[]
  chairSizePx: number // chair visual diameter in pixels
}

export const DEFAULT_TABLE_ROUND_PX = 160
export const DEFAULT_TABLE_RECT_W_PX = 184
export const DEFAULT_TABLE_RECT_H_PX = 80
export const DEFAULT_CHAIR_SIZE_PX = 20

export const EMPTY_STATE: PlannerState = {
  version: 1,
  weddingName: "My Wedding",
  hall: null,
  tables: [],
  guests: [],
  chairSizePx: DEFAULT_CHAIR_SIZE_PX,
}

// ---------------------------------------------------------------------------
// Dietary
// ---------------------------------------------------------------------------

export const DIETARY_LABELS: Record<Dietary, string> = {
  // TODO: use translation keys
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  "gluten-free": "Gluten-free",
  halal: "Halal",
  kosher: "Kosher",
}

export const DIETARY_COLORS: Record<Dietary | "empty", string> = {
  vegetarian: "bg-green-100 text-green-800",
  vegan: "bg-emerald-100 text-emerald-800",
  "gluten-free": "bg-yellow-100 text-yellow-800",
  halal: "bg-blue-100 text-blue-800",
  kosher: "bg-purple-100 text-purple-800",
  empty: "bg-muted text-muted-foreground",
}

// ---------------------------------------------------------------------------
// Hall polygon preset generators (points in canvas pixels)
// ---------------------------------------------------------------------------

const HALL_PADDING = 40 // px offset from canvas origin

export function generateRectangleHall(
  widthM: number,
  heightM: number,
  ppm: number
): HallPoint[] {
  const w = widthM * ppm
  const h = heightM * ppm
  const p = HALL_PADDING
  return [
    { x: p, y: p },
    { x: p + w, y: p },
    { x: p + w, y: p + h },
    { x: p, y: p + h },
  ]
}

/**
 * L-shape: rectangle with top-right corner cut out.
 *
 *   ┌────────────┐
 *   │            │ armH
 *   │     ┌──────┘
 *   │     │
 *   └─────┘
 *    armW    (W - armW)
 */
export function generateLShapeHall(
  widthM: number,
  heightM: number,
  armWidthM: number,
  armHeightM: number,
  ppm: number
): HallPoint[] {
  const w = widthM * ppm
  const h = heightM * ppm
  const aw = armWidthM * ppm
  const ah = armHeightM * ppm
  const p = HALL_PADDING
  return [
    { x: p, y: p },
    { x: p + w, y: p },
    { x: p + w, y: p + ah },
    { x: p + aw, y: p + ah },
    { x: p + aw, y: p + h },
    { x: p, y: p + h },
  ]
}

/**
 * U-shape: rectangle with a notch cut from the top center.
 *
 *   ┌──┐        ┌──┐
 *   │  │        │  │
 *   │  └────────┘  │
 *   │              │
 *   └──────────────┘
 *   armW  gap  armW
 */
export function generateUShapeHall(
  widthM: number,
  heightM: number,
  armWidthM: number,
  armHeightM: number,
  ppm: number
): HallPoint[] {
  const w = widthM * ppm
  const h = heightM * ppm
  const aw = armWidthM * ppm
  const ah = armHeightM * ppm
  const p = HALL_PADDING
  return [
    { x: p, y: p },
    { x: p + aw, y: p },
    { x: p + aw, y: p + ah },
    { x: p + w - aw, y: p + ah },
    { x: p + w - aw, y: p },
    { x: p + w, y: p },
    { x: p + w, y: p + h },
    { x: p, y: p + h },
  ]
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Point-in-polygon using ray casting algorithm. */
export function isPointInPolygon(
  px: number,
  py: number,
  polygon: HallPoint[]
): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y
    const xj = polygon[j].x,
      yj = polygon[j].y
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** Check if two finite line segments intersect. */
function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): boolean {
  const d1x = bx - ax,
    d1y = by - ay
  const d2x = dx - cx,
    d2y = dy - cy
  const cross = d1x * d2y - d1y * d2x
  if (Math.abs(cross) < 1e-10) return false // parallel / collinear
  const t = ((cx - ax) * d2y - (cy - ay) * d2x) / cross
  const u = ((cx - ax) * d1y - (cy - ay) * d1x) / cross
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

/**
 * Check if a rectangle is fully inside the polygon.
 * Checks all 4 corners (point-in-polygon) AND that no edge of the rectangle
 * crosses any polygon edge. The edge check is required for concave halls
 * (U-shape, L-shape) where a wide table can have all corners inside the
 * polygon while its body crosses through a notch or cutout.
 */
export function isRectInPolygon(
  x: number,
  y: number,
  w: number,
  h: number,
  polygon: HallPoint[]
): boolean {
  if (
    !isPointInPolygon(x, y, polygon) ||
    !isPointInPolygon(x + w, y, polygon) ||
    !isPointInPolygon(x + w, y + h, polygon) ||
    !isPointInPolygon(x, y + h, polygon)
  )
    return false

  // For concave polygons: ensure no rect edge crosses a polygon edge
  const rectEdges: [number, number, number, number][] = [
    [x, y, x + w, y],
    [x + w, y, x + w, y + h],
    [x + w, y + h, x, y + h],
    [x, y + h, x, y],
  ]
  for (const [ax, ay, bx, by] of rectEdges) {
    for (let i = 0; i < polygon.length; i++) {
      const c = polygon[i]
      const d = polygon[(i + 1) % polygon.length]
      if (segmentsIntersect(ax, ay, bx, by, c.x, c.y, d.x, d.y)) return false
    }
  }
  return true
}

/** Get polygon bounding box. Returns null for empty arrays. */
export function getPolygonBounds(points: HallPoint[]) {
  if (points.length === 0) return null
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}
