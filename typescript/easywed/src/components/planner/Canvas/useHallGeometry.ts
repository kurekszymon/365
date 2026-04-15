import { useMemo } from "react"
import type { Position } from "@/stores/planner.store"

const PIXELS_PER_METER = 40
const VIEWPORT_MARGIN = 48

type HallDimensions = { width: number; height: number }

export function useHallGeometry(
  containerEl: HTMLElement | null,
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

  function toContainerCoords(clientX: number, clientY: number) {
    const rect = containerEl?.getBoundingClientRect()
    return {
      x: clientX - (rect?.left ?? 0),
      y: clientY - (rect?.top ?? 0),
    }
  }

  function viewportToHall(clientX: number, clientY: number): Position {
    const { x, y } = toContainerCoords(clientX, clientY)
    return {
      x: Math.max(0, (x - hallLeft) / ppm),
      y: Math.max(0, (y - hallTop) / ppm),
    }
  }

  function isInHallBounds(clientX: number, clientY: number): boolean {
    const { x, y } = toContainerCoords(clientX, clientY)
    return (
      x >= hallLeft &&
      x <= hallLeft + scaledWidth &&
      y >= hallTop &&
      y <= hallTop + scaledHeight
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
