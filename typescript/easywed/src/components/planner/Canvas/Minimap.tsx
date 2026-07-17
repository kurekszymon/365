import { useMemo, useRef } from "react"
import { clamp } from "./utils"
import type { WorldBounds } from "./utils"
import type { Hall, Position } from "@/stores/planner.store"
import { usePlannerStore } from "@/stores/planner.store"

const BOX_WIDTH = 120
const BOX_HEIGHT = 84
// The card has a 1px border + p-1 (4px) padding, so its inner (overflow-hidden)
// content box is 2px smaller on each axis than BOX - 2*padding. The world
// (union of all halls) is letterboxed to fill this drawable area.
const CARD_BORDER = 1
const CARD_PADDING = 4
const INNER_WIDTH = BOX_WIDTH - 2 * (CARD_BORDER + CARD_PADDING)
const INNER_HEIGHT = BOX_HEIGHT - 2 * (CARD_BORDER + CARD_PADDING)
const DOT_SIZE = 8

type MinimapProps = {
  halls: Array<Hall>
  worldBounds: WorldBounds
  selectedId: string | null
  worldLeft: number
  worldTop: number
  ppm: number
  containerWidth: number
  containerHeight: number
  onNavigate: (pan: Position) => void
}

export const Minimap = ({
  halls,
  worldBounds,
  selectedId,
  worldLeft,
  worldTop,
  ppm,
  containerWidth,
  containerHeight,
  onNavigate,
}: MinimapProps) => {
  const tables = usePlannerStore((state) => state.tables)
  const fixtures = usePlannerStore((state) => state.fixtures)
  const boxRef = useRef<HTMLDivElement>(null)

  const hallsById = useMemo(
    () => new Map(halls.map((h) => [h.id, h])),
    [halls]
  )

  if (worldBounds.width <= 0 || worldBounds.height <= 0) return null

  const scale = Math.min(
    INNER_WIDTH / worldBounds.width,
    INNER_HEIGHT / worldBounds.height
  )
  const worldScaledWidth = worldBounds.width * scale
  const worldScaledHeight = worldBounds.height * scale
  const offsetX = (INNER_WIDTH - worldScaledWidth) / 2
  const offsetY = (INNER_HEIGHT - worldScaledHeight) / 2

  // Minimap px of a world-space point.
  const px = (x: number) => offsetX + (x - worldBounds.x) * scale
  const py = (y: number) => offsetY + (y - worldBounds.y) * scale

  // Place a marker of the given size, keeping its whole footprint inside its
  // hall's outline: a table pushed flush against a wall would otherwise render
  // centred on the border and poke out past it, which reads as a clipped dot.
  const dot = (worldPos: Position, hall: Hall, size: number) => ({
    left: clamp(
      px(worldPos.x) - size / 2,
      px(hall.position.x),
      px(hall.position.x + hall.size.width) - size
    ),
    top: clamp(
      py(worldPos.y) - size / 2,
      py(hall.position.y),
      py(hall.position.y + hall.size.height) - size
    ),
  })

  // World position of an entity, clamped into its hall.
  const entityWorld = (
    position: Position,
    hall: Hall
  ): Position => ({
    x: hall.position.x + clamp(position.x, 0, hall.size.width),
    y: hall.position.y + clamp(position.y, 0, hall.size.height),
  })

  // Visible viewport rect, in world-space meters, clipped to the world bounds -
  // mirrors the geometry `useWorldGeometry` already computes for the main
  // canvas, just inverted (container px -> world meters).
  const visibleLeftM = worldBounds.x - worldLeft / ppm
  const visibleTopM = worldBounds.y - worldTop / ppm
  const visibleRightM = visibleLeftM + containerWidth / ppm
  const visibleBottomM = visibleTopM + containerHeight / ppm

  const worldRight = worldBounds.x + worldBounds.width
  const worldBottom = worldBounds.y + worldBounds.height
  const clippedLeft = clamp(visibleLeftM, worldBounds.x, worldRight)
  const clippedTop = clamp(visibleTopM, worldBounds.y, worldBottom)
  const clippedRight = clamp(visibleRightM, worldBounds.x, worldRight)
  const clippedBottom = clamp(visibleBottomM, worldBounds.y, worldBottom)

  // translate instead of left/top - this rect moves on every pan frame, and a
  // transform update doesn't trigger layout (width/height only change while
  // the viewport edge crosses a world edge).
  const viewportRect = {
    transform: `translate3d(${px(clippedLeft)}px, ${py(clippedTop)}px, 0)`,
    width: Math.max(0, (clippedRight - clippedLeft) * scale),
    height: Math.max(0, (clippedBottom - clippedTop) * scale),
  }

  const navigateTo = (clientX: number, clientY: number) => {
    const rect = boxRef.current?.getBoundingClientRect()
    if (!rect) return
    const localX = clientX - rect.left - offsetX
    const localY = clientY - rect.top - offsetY
    // Clicked world point, relative to the world origin (worldBounds.x/y).
    const relX = clamp(localX / scale, 0, worldBounds.width)
    const relY = clamp(localY / scale, 0, worldBounds.height)
    // Centers the clicked world-space point in the viewport. Derived from
    // worldLeft = (containerWidth - scaledWidth) / 2 + pan.x, solved for pan.x
    // such that worldLeft + relX * ppm == containerWidth / 2 (and similarly y).
    onNavigate({
      x: ppm * (worldBounds.width / 2 - relX),
      y: ppm * (worldBounds.height / 2 - relY),
    })
  }

  return (
    <div
      data-no-pan
      className="absolute right-4 bottom-4 z-20 rounded-[10px] border bg-card p-1 shadow-[0_8px_20px_-12px_rgba(40,60,45,0.4)]"
      style={{ width: BOX_WIDTH, height: BOX_HEIGHT }}
    >
      <div
        ref={boxRef}
        className="relative h-full w-full cursor-pointer overflow-hidden"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          navigateTo(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 1) return
          navigateTo(e.clientX, e.clientY)
        }}
      >
        {/* One dashed outline per hall, placed at its world position. */}
        {halls.map((hall) => (
          <div
            key={hall.id}
            className="pointer-events-none absolute rounded-[5px] border border-dashed border-planner-table-border"
            style={{
              left: px(hall.position.x),
              top: py(hall.position.y),
              width: hall.size.width * scale,
              height: hall.size.height * scale,
            }}
          />
        ))}
        {tables.map((table) => {
          const hall = hallsById.get(table.hallId)
          if (!hall) return null
          const world = entityWorld(table.position, hall)
          const { left, top } = dot(world, hall, DOT_SIZE)
          return (
            <div
              key={table.id}
              className={
                "absolute rounded-full " +
                (table.id === selectedId
                  ? "bg-planner-selected"
                  : "bg-planner-table-border")
              }
              style={{ width: DOT_SIZE, height: DOT_SIZE, left, top }}
            />
          )
        })}
        {fixtures.map((fixture) => {
          const hall = hallsById.get(fixture.hallId)
          if (!hall) return null
          const world = entityWorld(fixture.position, hall)
          const { left, top } = dot(world, hall, DOT_SIZE - 1)
          return (
            <div
              key={fixture.id}
              className="absolute rounded-[2px] bg-planner-table-border"
              style={{
                width: DOT_SIZE - 1,
                height: DOT_SIZE - 1,
                left,
                top,
              }}
            />
          )
        })}
        <div
          className="absolute top-0 left-0 rounded-[3px] border-[1.5px] border-primary bg-primary/10"
          style={viewportRect}
        />
      </div>
    </div>
  )
}
