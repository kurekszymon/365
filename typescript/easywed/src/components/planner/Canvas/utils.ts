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

type CapturedElementKind = "table" | "hall"

export type CapturedElement = {
  kind: CapturedElementKind
  id: string | null
}

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

  const kind = elementNode.getAttribute(
    "data-canvas-element-kind"
  ) as CapturedElementKind | null

  if (!kind) {
    return null
  }

  return {
    kind,
    id: elementNode.getAttribute("data-canvas-element-id"),
  }
}
