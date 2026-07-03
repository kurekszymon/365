import { useRef } from "react"
import { clamp } from "./utils"
import type { Position } from "@/stores/planner.store"
import { usePlannerStore } from "@/stores/planner.store"

const BOX_WIDTH = 120
const BOX_HEIGHT = 84
const BOX_PADDING = 8
const INNER_WIDTH = BOX_WIDTH - BOX_PADDING * 2
const INNER_HEIGHT = BOX_HEIGHT - BOX_PADDING * 2
const DOT_SIZE = 8

type MinimapProps = {
  hallDimensions: { width: number; height: number }
  selectedId: string | null
  hallLeft: number
  hallTop: number
  ppm: number
  containerWidth: number
  containerHeight: number
  onNavigate: (pan: Position) => void
}

export const Minimap = ({
  hallDimensions,
  selectedId,
  hallLeft,
  hallTop,
  ppm,
  containerWidth,
  containerHeight,
  onNavigate,
}: MinimapProps) => {
  const tables = usePlannerStore((state) => state.tables)
  const fixtures = usePlannerStore((state) => state.fixtures)
  const boxRef = useRef<HTMLDivElement>(null)

  if (hallDimensions.width <= 0 || hallDimensions.height <= 0) return null

  const scale = Math.min(
    INNER_WIDTH / hallDimensions.width,
    INNER_HEIGHT / hallDimensions.height
  )
  const offsetX = (INNER_WIDTH - hallDimensions.width * scale) / 2
  const offsetY = (INNER_HEIGHT - hallDimensions.height * scale) / 2

  // Visible viewport rect, in hall-space meters, clipped to the hall bounds —
  // mirrors the geometry `useHallGeometry` already computes for the main canvas,
  // just inverted (container px -> hall meters) instead of the other way round.
  const visibleLeftM = -hallLeft / ppm
  const visibleTopM = -hallTop / ppm
  const visibleRightM = visibleLeftM + containerWidth / ppm
  const visibleBottomM = visibleTopM + containerHeight / ppm

  const clippedLeft = clamp(visibleLeftM, 0, hallDimensions.width)
  const clippedTop = clamp(visibleTopM, 0, hallDimensions.height)
  const clippedRight = clamp(visibleRightM, 0, hallDimensions.width)
  const clippedBottom = clamp(visibleBottomM, 0, hallDimensions.height)

  const viewportRect = {
    left: offsetX + clippedLeft * scale,
    top: offsetY + clippedTop * scale,
    width: Math.max(0, (clippedRight - clippedLeft) * scale),
    height: Math.max(0, (clippedBottom - clippedTop) * scale),
  }

  const navigateTo = (clientX: number, clientY: number) => {
    const rect = boxRef.current?.getBoundingClientRect()
    if (!rect) return
    const localX = clientX - rect.left - offsetX
    const localY = clientY - rect.top - offsetY
    const hallX = clamp(localX / scale, 0, hallDimensions.width)
    const hallY = clamp(localY / scale, 0, hallDimensions.height)
    // Centers the clicked hall-space point in the viewport. Derived from
    // hallLeft = (containerWidth - scaledWidth) / 2 + pan.x, solved for pan.x
    // such that hallLeft + hallX * ppm == containerWidth / 2 (and similarly y).
    onNavigate({
      x: ppm * (hallDimensions.width / 2 - hallX),
      y: ppm * (hallDimensions.height / 2 - hallY),
    })
  }

  return (
    <div
      data-no-pan
      className="absolute right-4 bottom-4 z-20 rounded-[10px] border bg-card p-2 shadow-[0_8px_20px_-12px_rgba(40,60,45,0.4)]"
      style={{ width: BOX_WIDTH, height: BOX_HEIGHT }}
    >
      <div
        ref={boxRef}
        className="relative h-full w-full cursor-pointer rounded-[5px] border border-dashed border-planner-table-border"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          navigateTo(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 1) return
          navigateTo(e.clientX, e.clientY)
        }}
      >
        {tables.map((table) => (
          <div
            key={table.id}
            className={
              "absolute rounded-full " +
              (table.id === selectedId
                ? "bg-planner-selected"
                : "bg-planner-table-border")
            }
            style={{
              width: DOT_SIZE,
              height: DOT_SIZE,
              left: offsetX + table.position.x * scale - DOT_SIZE / 2,
              top: offsetY + table.position.y * scale - DOT_SIZE / 2,
            }}
          />
        ))}
        {fixtures.map((fixture) => (
          <div
            key={fixture.id}
            className="absolute rounded-[2px] bg-planner-table-border"
            style={{
              width: DOT_SIZE - 1,
              height: DOT_SIZE - 1,
              left: offsetX + fixture.position.x * scale - (DOT_SIZE - 1) / 2,
              top: offsetY + fixture.position.y * scale - (DOT_SIZE - 1) / 2,
            }}
          />
        ))}
        <div
          className="absolute rounded-[3px] border-[1.5px] border-primary bg-primary/10"
          style={viewportRect}
        />
      </div>
    </div>
  )
}
