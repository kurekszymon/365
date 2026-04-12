import { useMemo } from "react"
import type { Position } from "@/stores/planner.store"

const PIXELS_PER_METER = 40
const VIEWPORT_MARGIN = 48

type HallDimensions = { width: number; height: number }

export function useHallGeometry(
  containerWidth: number,
  containerHeight: number,
  dimensions: HallDimensions,
  zoom: number,
  pan: Position
) {
  const hallWidth = Math.round(dimensions.width * PIXELS_PER_METER)
  const hallHeight = Math.round(dimensions.height * PIXELS_PER_METER)

  const baseScale = useMemo(() => {
    if (containerWidth <= 0 || containerHeight <= 0) return 1
    return Math.min(
      (containerWidth - VIEWPORT_MARGIN * 2) / hallWidth,
      (containerHeight - VIEWPORT_MARGIN * 2) / hallHeight
    )
  }, [containerWidth, containerHeight, hallWidth, hallHeight])

  const scale = baseScale * zoom
  const scaledWidth = hallWidth * scale
  const scaledHeight = hallHeight * scale
  const hallLeft = (containerWidth - scaledWidth) / 2 + pan.x
  const hallTop = (containerHeight - scaledHeight) / 2 + pan.y
  const ppm = PIXELS_PER_METER * scale

  function viewportToHall(clientX: number, clientY: number): Position {
    return {
      x: Math.max(0, (clientX - hallLeft) / ppm),
      y: Math.max(0, (clientY - hallTop) / ppm),
    }
  }

  function isInHallBounds(clientX: number, clientY: number): boolean {
    return (
      clientX >= hallLeft &&
      clientX <= hallLeft + scaledWidth &&
      clientY >= hallTop &&
      clientY <= hallTop + scaledHeight
    )
  }

  return {
    scaledWidth,
    scaledHeight,
    hallLeft,
    hallTop,
    ppm,
    viewportToHall,
    isInHallBounds,
  }
}
