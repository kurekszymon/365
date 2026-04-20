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

export type CapturedElement = { kind: "table"; id: string } | { kind: "hall" }

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

  return null
}
