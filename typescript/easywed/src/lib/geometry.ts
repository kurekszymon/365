import type { Hall, HallPreset, Position, Size } from "@/stores/planner.store"

// Polygon math shared by the planner store and the canvas. Lives in lib/ (not
// Canvas/) because the store must not import from components. All coordinates
// are hall-local meters, matching the persisted Geometry convention (bbox-min
// at (0,0), `size` = AABB).

const EPS = 1e-9

// Vertices (and positions derived from them) are persisted as JSONB - round
// to mm so a drag doesn't store 15-decimal floats.
export const round3 = (n: number) => Math.round(n * 1000) / 1000

// SVG points attribute for a vertex list, optionally scaled (e.g. by ppm).
export const polygonPoints = (vertices: Array<Position>, scale = 1): string =>
  vertices.map((v) => `${v.x * scale},${v.y * scale}`).join(" ")

// The 4 corners of an axis-aligned rect footprint, clockwise from top-left.
export const rectVertices = (size: Size): Array<Position> => [
  { x: 0, y: 0 },
  { x: size.width, y: 0 },
  { x: size.width, y: size.height },
  { x: 0, y: size.height },
]

// Even-odd ray cast; points on the boundary count as inside so an entity
// flush against a wall isn't rejected.
export const pointInPolygon = (
  p: Position,
  vertices: Array<Position>
): boolean => {
  let inside = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i]
    const b = vertices[j]
    if (onSegment(p, a, b)) return true
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside
    }
  }
  return inside
}

const onSegment = (p: Position, a: Position, b: Position): boolean => {
  const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)
  if (Math.abs(cross) > EPS) return false
  const dot = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2
  return dot >= -EPS && dot <= len2 + EPS
}

const orient = (a: Position, b: Position, c: Position): number => {
  const v = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  if (v > EPS) return 1
  if (v < -EPS) return -1
  return 0
}

// Proper crossing only: shared endpoints and collinear touches don't count,
// so a rect edge sliding along a polygon wall isn't treated as escaping.
const segmentsIntersect = (
  a1: Position,
  a2: Position,
  b1: Position,
  b2: Position
): boolean => {
  const o1 = orient(a1, a2, b1)
  const o2 = orient(a1, a2, b2)
  const o3 = orient(b1, b2, a1)
  const o4 = orient(b1, b2, a2)
  return o1 !== o2 && o3 !== o4 && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0
}

// An axis-aligned rect (top-left `pos`, `size`) lies fully inside the polygon
// when all four corners are inside and no polygon edge properly crosses a
// rect edge - the crossing test catches the "corners inside but an L-notch
// pokes through an edge" case that a corner-only check misses.
export const rectInsidePolygon = (
  pos: Position,
  size: Size,
  vertices: Array<Position>
): boolean => {
  const corners: Array<Position> = [
    pos,
    { x: pos.x + size.width, y: pos.y },
    { x: pos.x + size.width, y: pos.y + size.height },
    { x: pos.x, y: pos.y + size.height },
  ]
  for (const c of corners) {
    if (!pointInPolygon(c, vertices)) return false
  }
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    for (let k = 0; k < 4; k++) {
      if (
        segmentsIntersect(
          vertices[j],
          vertices[i],
          corners[k],
          corners[(k + 1) % 4]
        )
      ) {
        return false
      }
    }
  }
  return true
}

// Default search granularity (meters) for the clamp fallback below; callers
// with grid snapping pass their snap step so results stay grid-aligned.
const DEFAULT_CLAMP_STEP = 0.25

/**
 * Clamps an entity's AABB into a hall (hall-local coords) - the single
 * containment entry point shared by the store, the canvas, and the AI tools.
 * Without geometry this is the classic axis clamp into the hall rect (the
 * historical behavior). With geometry, a candidate that already fits the
 * polygon is returned as-is; otherwise the valid position range is
 * grid-searched at `step` (pass the caller's snap step so results stay
 * grid-aligned) and the fitting position nearest the candidate wins
 * (row-major scan order breaks ties, so results are deterministic). If
 * nothing fits - the entity is larger than every pocket of the polygon -
 * the plain AABB clamp is returned, mirroring how oversized entities
 * already overflow rectangular halls today.
 *
 * Entities are judged by their AABB even when they have their own polygon
 * geometry, matching the fixture stance where `size` drives all clamp logic.
 */
export const clampRectIntoHall = (
  pos: Position,
  size: Size,
  hall: Pick<Hall, "size" | "geometry">,
  step: number = DEFAULT_CLAMP_STEP
): Position => {
  const { size: hallSize, geometry } = hall
  const maxX = Math.max(0, hallSize.width - size.width)
  const maxY = Math.max(0, hallSize.height - size.height)
  const clamped = {
    x: Math.min(Math.max(0, pos.x), maxX),
    y: Math.min(Math.max(0, pos.y), maxY),
  }
  if (!geometry) return clamped
  if (rectInsidePolygon(clamped, size, geometry.vertices)) return clamped

  let best: Position | null = null
  let bestD = Infinity
  for (let y = 0; y <= maxY + EPS; y += step) {
    for (let x = 0; x <= maxX + EPS; x += step) {
      const candidate = {
        x: round3(Math.min(x, maxX)),
        y: round3(Math.min(y, maxY)),
      }
      const d = (candidate.x - clamped.x) ** 2 + (candidate.y - clamped.y) ** 2
      if (d >= bestD) continue
      if (rectInsidePolygon(candidate, size, geometry.vertices)) {
        best = candidate
        bestD = d
      }
    }
  }
  return best ?? clamped
}

// Nearest point on the polygon's boundary to `p` - the measure tool's wall
// snap (rect halls go through it too, via their 4 corner vertices).
export const nearestPolygonBoundaryPoint = (
  p: Position,
  vertices: Array<Position>
): Position => {
  let best: Position = vertices[0]
  let bestD = Infinity
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[j]
    const b = vertices[i]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    const t =
      len2 > 0
        ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
        : 0
    const q = { x: a.x + t * dx, y: a.y + t * dy }
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2
    if (d < bestD) {
      bestD = d
      best = q
    }
  }
  return best
}

// Per-axis rescale of hall vertices when the hall's width/height change.
// Vertices span the AABB exactly (bbox-min at 0,0, bbox-max at `from`), so
// the scaled polygon's AABB equals `to` exactly (modulo mm rounding).
export const scaleVertices = (
  vertices: Array<Position>,
  from: Size,
  to: Size
): Array<Position> => {
  const sx = from.width > 0 ? to.width / from.width : 1
  const sy = from.height > 0 ? to.height / from.height : 1
  return vertices.map((v) => ({ x: round3(v.x * sx), y: round3(v.y * sy) }))
}

// Starter outline for a hall preset, spanning the hall's AABB exactly. The
// notch proportions are just a readable default - the user refines vertices
// in shape-edit mode. `rectangle` carries no geometry by invariant.
export const verticesForHallPreset = (
  preset: HallPreset,
  size: Size
): Array<Position> | null => {
  const w = size.width
  const h = size.height
  switch (preset) {
    case "rectangle":
      return null
    // Top-right quarter cut out.
    case "l-shape":
      return [
        { x: 0, y: 0 },
        { x: round3(w * 0.5), y: 0 },
        { x: round3(w * 0.5), y: round3(h * 0.5) },
        { x: w, y: round3(h * 0.5) },
        { x: w, y: h },
        { x: 0, y: h },
      ]
    // Notch cut into the top-center edge.
    case "u-shape":
      return [
        { x: 0, y: 0 },
        { x: round3(w * 0.3), y: 0 },
        { x: round3(w * 0.3), y: round3(h * 0.5) },
        { x: round3(w * 0.7), y: round3(h * 0.5) },
        { x: round3(w * 0.7), y: 0 },
        { x: w, y: 0 },
        { x: w, y: h },
        { x: 0, y: h },
      ]
    case "custom":
      return rectVertices(size)
  }
}
