import type { TableShape } from "@/stores/planner.store"

export const isDimensionsValidForShape = (
  shape: TableShape,
  width: number,
  height: number
) => {
  const isWidthValid = Number.isFinite(width) && width > 0
  if (!isWidthValid) {
    return false
  }

  switch (shape) {
    case "round":
      return true
    case "rectangular":
      return Number.isFinite(height) && height > 0
  }
}

export const getSizeForShape = (
  shape: TableShape,
  width: number,
  height: number
) => {
  switch (shape) {
    case "round":
      return {
        width,
        height: width,
      }
    case "rectangular":
      return {
        width,
        height,
      }
  }
}
