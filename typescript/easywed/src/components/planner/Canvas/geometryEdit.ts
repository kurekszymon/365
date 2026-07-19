import type {
  FixtureShape,
  Geometry,
  Position,
  Size,
  TableShape,
} from "@/stores/planner.store"
import { rectVertices, round3 } from "@/lib/geometry"

export const MIN_VERTICES = 3

// Smallest AABB extent (meters) a polygon may collapse to. Guards the DB's
// width/height > 0 checks and keeps the SVG viewBox non-degenerate when all
// vertices go collinear.
export const MIN_EXTENT_M = 0.05

// Result of re-anchoring edited vertices: `geometry` is object-local again
// (bbox min at 0,0), `size` is the new AABB, and `offset` is what to add to
// the entity's position so the shape stays put on the canvas.
export interface NormalizedShape {
  geometry: Geometry
  size: Size
  offset: Position
}

export const normalizeGeometry = (
  vertices: Array<Position>,
  closed = true
): NormalizedShape => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const v of vertices) {
    minX = Math.min(minX, v.x)
    minY = Math.min(minY, v.y)
    maxX = Math.max(maxX, v.x)
    maxY = Math.max(maxY, v.y)
  }
  return {
    geometry: {
      vertices: vertices.map((v) => ({
        x: round3(v.x - minX),
        y: round3(v.y - minY),
      })),
      closed,
    },
    size: {
      width: Math.max(round3(maxX - minX), MIN_EXTENT_M),
      height: Math.max(round3(maxY - minY), MIN_EXTENT_M),
    },
    offset: { x: round3(minX), y: round3(minY) },
  }
}

const CIRCLE_SEGMENTS = 12

// Object-local vertices reproducing a basic shape's current footprint - used
// when converting an entity to a custom polygon. `size` is the effective
// (rotation-adjusted) footprint; circles/rounds become a 12-gon of the same
// diameter.
export const verticesForFootprint = (
  shape: TableShape | FixtureShape,
  size: Size
): Array<Position> => {
  if (shape === "circle" || shape === "round") {
    const r = size.width / 2
    return Array.from({ length: CIRCLE_SEGMENTS }, (_, i) => {
      const angle = -Math.PI / 2 + (i / CIRCLE_SEGMENTS) * 2 * Math.PI
      return {
        x: round3(r + r * Math.cos(angle)),
        y: round3(r + r * Math.sin(angle)),
      }
    })
  }
  return rectVertices(size)
}

// Starting outline for a brand-new custom fixture: a rectangle with the
// top-left corner clipped, so it reads as "custom" at a glance instead of
// looking identical to the plain rectangle preset.
export const defaultPolygonVertices = (size: Size): Array<Position> => [
  { x: round3(size.width * 0.4), y: 0 },
  { x: size.width, y: 0 },
  { x: size.width, y: size.height },
  { x: 0, y: size.height },
  { x: 0, y: round3(size.height * 0.4) },
]

// Inserts a new vertex at the midpoint of the edge that starts at
// `edgeIndex` (edge i runs from vertex i to vertex i+1, wrapping when the
// polygon is closed).
export const insertMidpoint = (
  vertices: Array<Position>,
  edgeIndex: number
): Array<Position> => {
  const a = vertices[edgeIndex]
  const b = vertices[(edgeIndex + 1) % vertices.length]
  const mid = { x: round3((a.x + b.x) / 2), y: round3((a.y + b.y) / 2) }
  return [
    ...vertices.slice(0, edgeIndex + 1),
    mid,
    ...vertices.slice(edgeIndex + 1),
  ]
}
