import { HALL_PADDING_M } from "./consts"
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
    x: clamp(pos.x, HALL_PADDING_M, hallWidth - tableSize.width - HALL_PADDING_M),
    y: clamp(pos.y, HALL_PADDING_M, hallHeight - tableSize.height - HALL_PADDING_M),
  }
}
