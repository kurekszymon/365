import type { CSSProperties } from "react"
import type { GridSpacing, GridStyle } from "@/stores/view.store"
import type { Hall, Position } from "@/stores/planner.store"
import { DEFAULT_HALL } from "@/stores/planner.store"
import {
  nearestPolygonBoundaryPoint,
  pointInPolygon,
  rectVertices,
} from "@/lib/geometry"

const NICE_INTERVALS: Array<Exclude<GridSpacing, "auto">> = [
  1, 2, 5, 10, 25, 50,
]

const snap = (value: number, step: number) => {
  return Math.round(value / step) * step
}

export const validSpacings = (
  width: number,
  height: number
): Array<GridSpacing> => {
  return [...NICE_INTERVALS.filter((n) => n < Math.max(width, height)), "auto"]
}

export const clampGridSpacing = (
  spacing: GridSpacing,
  width: number,
  height: number
): GridSpacing => {
  const valid = validSpacings(width, height)
  return valid.includes(spacing) ? spacing : 1
}

export const calcGridSpacing = (
  width: number,
  height: number
): Exclude<GridSpacing, "auto"> => {
  const raw = Math.max(width, height) / 6
  return NICE_INTERVALS.find((n) => n >= raw) ?? 50
}

export const gridBackground = (
  style: GridStyle,
  zoom: number
): CSSProperties => {
  // Softer, lighter grid so the hall reads as delicate ruled paper rather than
  // a heavy technical grid. Alpha is capped at zoom 1 then halved, and still
  // fades out as you zoom away.
  const color = `rgb(148 163 184 / ${Math.min(zoom, 1) * 0.5})`
  if (style === "dots")
    return {
      backgroundImage: `radial-gradient(circle, ${color} 1px, transparent 1px)`,
    }
  if (style === "grid")
    return {
      backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
      backgroundPosition: "-0.5px -0.5px",
    }
  return {}
}

export const snapPositionToGrid = (
  position: { x: number; y: number },
  step: number
) => {
  return {
    x: snap(position.x, step),
    y: snap(position.y, step),
  }
}

export const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value))
}

// Diameter (px) of a seat marker at a given pixels-per-meter. Scales with zoom
// but stays legible/tappable at the extremes. Shared by the seat renderer and
// anything that needs to clear the seat ring (e.g. the table toolbar offset).
export const seatSizePx = (ppm: number) => clamp(ppm * 0.34, 12, 44)

// ---------------------------------------------------------------------------
// World space: all halls share one coordinate system (meters). A hall's
// `position` is its top-left corner in world space; entity positions stay
// local to their hall (world = hall.position + local).

export interface WorldBounds {
  x: number
  y: number
  width: number
  height: number
}

// Union of all hall rects. An empty hall list falls back to the default hall
// footprint so the canvas math stays finite.
export const worldBoundsOf = (halls: Array<Hall>): WorldBounds => {
  if (halls.length === 0) return { x: 0, y: 0, ...DEFAULT_HALL.size }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const h of halls) {
    minX = Math.min(minX, h.position.x)
    minY = Math.min(minY, h.position.y)
    maxX = Math.max(maxX, h.position.x + h.size.width)
    maxY = Math.max(maxY, h.position.y + h.size.height)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

// Halls sorted back-to-front for rendering and hit-testing: unraised halls
// keep their creation order at the bottom, raised ones stack in raise order
// (most recently raised last = on top). Stable sort keeps ties in place.
export const sortHallsByZ = (
  halls: Array<Hall>,
  zOrder: Array<string>
): Array<Hall> => {
  if (zOrder.length === 0) return halls
  const rank = new Map(zOrder.map((id, i) => [id, i]))
  return [...halls].sort(
    (a, b) => (rank.get(a.id) ?? -1) - (rank.get(b.id) ?? -1)
  )
}

const inHall = (hall: Hall, p: Position): boolean => {
  const inAabb =
    p.x >= hall.position.x &&
    p.x <= hall.position.x + hall.size.width &&
    p.y >= hall.position.y &&
    p.y <= hall.position.y + hall.size.height
  if (!inAabb || !hall.geometry) return inAabb
  // Polygon halls: a point in the AABB can still sit in a cut-out notch.
  return pointInPolygon(hallLocalOf(p, hall), hall.geometry.vertices)
}

// The hall under a world-space point. When halls overlap the LAST one in
// array order wins, matching paint order (later halls render on top).
export const hallAtPoint = (halls: Array<Hall>, p: Position): Hall | null => {
  for (let i = halls.length - 1; i >= 0; i--) {
    if (inHall(halls[i], p)) return halls[i]
  }
  return null
}

// Fallback drop target: the hall whose rect is closest to the point.
// Deliberately AABB-based even for polygon halls: a drop inside a hall's own
// notch misses hallAtPoint, lands here at distance 0, and the clamp then
// pushes the entity inside the polygon - the right outcome without polygon
// distance math.
export const nearestHall = (halls: Array<Hall>, p: Position): Hall | null => {
  let best: Hall | null = null
  let bestD = Infinity
  for (const h of halls) {
    const dx = Math.max(
      h.position.x - p.x,
      0,
      p.x - (h.position.x + h.size.width)
    )
    const dy = Math.max(
      h.position.y - p.y,
      0,
      p.y - (h.position.y + h.size.height)
    )
    const d = dx * dx + dy * dy
    if (d < bestD) {
      bestD = d
      best = h
    }
  }
  return best
}

export const hallLocalOf = (p: Position, hall: Hall): Position => ({
  x: p.x - hall.position.x,
  y: p.y - hall.position.y,
})

export const hallWorldOf = (p: Position, hall: Hall): Position => ({
  x: p.x + hall.position.x,
  y: p.y + hall.position.y,
})

// Closest point on any hall's outline (world meters). Unlike `nearestHall`
// this projects onto the real polygon, so a point in the void lands exactly on
// the wall a user would draw to. Returns null only when there are no halls.
export const nearestHallBoundaryPoint = (
  halls: Array<Hall>,
  p: Position
): Position | null => {
  let best: Position | null = null
  let bestD = Infinity
  for (const hall of halls) {
    const local = nearestPolygonBoundaryPoint(
      hallLocalOf(p, hall),
      hall.geometry?.vertices ?? rectVertices(hall.size)
    )
    const world = hallWorldOf(local, hall)
    const d = (world.x - p.x) ** 2 + (world.y - p.y) ** 2
    if (d < bestD) {
      bestD = d
      best = world
    }
  }
  return best
}

// Keeps a point out of the void: inside a hall it stays where it is, anywhere
// else it sticks to the nearest hall border.
export const stickToHalls = (halls: Array<Hall>, p: Position): Position =>
  hallAtPoint(halls, p) ? p : (nearestHallBoundaryPoint(halls, p) ?? p)

/**
 * Returns the nearest point on the boundary of an axis-aligned rectangle to (xM, yM).
 * Assumes (xM, yM) is inside the rectangle.
 */
export const nearestRectBorder = (
  xM: number,
  yM: number,
  x0: number,
  y0: number,
  w: number,
  h: number
): Position => {
  const dLeft = xM - x0
  const dRight = x0 + w - xM
  const dTop = yM - y0
  const dBottom = y0 + h - yM
  const minD = Math.min(dLeft, dRight, dTop, dBottom)
  const cx = clamp(xM, x0, x0 + w)
  const cy = clamp(yM, y0, y0 + h)
  if (minD === dLeft) return { x: x0, y: cy }
  if (minD === dRight) return { x: x0 + w, y: cy }
  if (minD === dTop) return { x: cx, y: y0 }
  return { x: cx, y: y0 + h }
}

/**
 * Returns the point on the boundary of an axis-aligned rectangle in the direction
 * from its center (cx, cy) towards (targetX, targetY). Works for target outside
 * the rectangle too - useful for "facing" border snap while aiming at another point.
 */
export const rectBorderTowards = (
  targetX: number,
  targetY: number,
  cx: number,
  cy: number,
  w: number,
  h: number
): Position => {
  const dx = targetX - cx
  const dy = targetY - cy
  if (dx === 0 && dy === 0) return { x: cx + w / 2, y: cy }
  const hw = w / 2
  const hh = h / 2
  // Scale factor t so the ray cx + t*dx, cy + t*dy hits the rectangle edge
  const t = Math.min(
    dx !== 0 ? hw / Math.abs(dx) : Infinity,
    dy !== 0 ? hh / Math.abs(dy) : Infinity
  )
  return { x: cx + dx * t, y: cy + dy * t }
}

/**
 * Returns the nearest point on the circumference of a circle to (xM, yM).
 * Assumes (xM, yM) is inside the circle.
 */
export const nearestCircleBorder = (
  xM: number,
  yM: number,
  cx: number,
  cy: number,
  r: number
): Position => {
  const dx = xM - cx
  const dy = yM - cy
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return { x: cx + r, y: cy }
  return { x: cx + (dx / len) * r, y: cy + (dy / len) * r }
}

// True when the event target sits inside a canvas overlay (toolbar, minimap,
// FAB, seat markers…) that opts out of pan/tap handling via `data-no-pan`.
export const isNoPan = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest("[data-no-pan]") !== null

export type CapturedElement =
  | { kind: "table"; id: string }
  | { kind: "fixture"; id: string }
  | { kind: "hall" }

export const findCapturedElement = (
  target: EventTarget | null
): CapturedElement | null => {
  if (!(target instanceof Element)) {
    return null
  }

  const elementNode = target.closest<HTMLElement>("[data-canvas-element-kind]")

  if (!elementNode) {
    return null
  }

  const kind = elementNode.getAttribute("data-canvas-element-kind")

  if (kind === "hall") {
    return { kind: "hall" }
  }

  if (kind === "table") {
    const id = elementNode.getAttribute("data-canvas-element-id")
    if (!id) return null
    return { kind: "table", id }
  }

  if (kind === "fixture") {
    const id = elementNode.getAttribute("data-canvas-element-id")
    if (!id) return null
    return { kind: "fixture", id }
  }

  return null
}
