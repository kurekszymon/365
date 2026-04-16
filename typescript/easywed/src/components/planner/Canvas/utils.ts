import type { Position, Size } from "@/stores/planner.store"

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
