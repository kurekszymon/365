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
