import type { CSSProperties } from "react"
import type { GridSpacing, GridStyle } from "@/stores/view.store"
import type { Position, Size } from "@/stores/planner.store"

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
  const color = `rgb(156 163 175 / ${zoom})`
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

export const clampToHall = (
  pos: Position,
  tableSize: Size,
  hallWidth: number,
  hallHeight: number
): Position => {
  return {
    x: clamp(pos.x, 0, hallWidth - tableSize.width),
    y: clamp(pos.y, 0, hallHeight - tableSize.height),
  }
}

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
 * the rectangle too — useful for "facing" border snap while aiming at another point.
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

export type CapturedElement =
  | { kind: "table"; id: string }
  | { kind: "fixture"; id: string }
  | { kind: "hall" }

export const findCapturedElement = (
  target: EventTarget | null
): CapturedElement | null => {
  if (!(target instanceof HTMLElement)) {
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
