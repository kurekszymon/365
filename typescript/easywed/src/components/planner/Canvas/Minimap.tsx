import { useRef } from "react"
import { clamp } from "./utils"
import type { Position } from "@/stores/planner.store"
import { usePlannerStore } from "@/stores/planner.store"

const BOX_WIDTH = 120
const BOX_HEIGHT = 84
// The card has a 1px border + p-1 (4px) padding, so its inner (overflow-hidden)
// content box is 2px smaller on each axis than BOX - 2*padding. The hall is
// letterboxed to fill this drawable area.
const CARD_BORDER = 1
const CARD_PADDING = 4
const INNER_WIDTH = BOX_WIDTH - 2 * (CARD_BORDER + CARD_PADDING)
const INNER_HEIGHT = BOX_HEIGHT - 2 * (CARD_BORDER + CARD_PADDING)
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
  const hallScaledWidth = hallDimensions.width * scale
  const hallScaledHeight = hallDimensions.height * scale
  const offsetX = (INNER_WIDTH - hallScaledWidth) / 2
  const offsetY = (INNER_HEIGHT - hallScaledHeight) / 2

  // Place a marker of the given size, keeping its whole footprint inside the
  // hall outline: a table pushed flush against a wall would otherwise render
  // centred on the border and poke out past it, which reads as a clipped dot.
  const dotLeft = (x: number, size: number) =>
    clamp(
      offsetX + x * scale - size / 2,
      offsetX,
      offsetX + hallScaledWidth - size
    )
  const dotTop = (y: number, size: number) =>
    clamp(
      offsetY + y * scale - size / 2,
      offsetY,
      offsetY + hallScaledHeight - size
    )

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

  // translate instead of left/top — this rect moves on every pan frame, and a
  // transform update doesn't trigger layout (width/height only change while
  // the viewport edge crosses a hall edge).
  const viewportRect = {
    transform: `translate3d(${offsetX + clippedLeft * scale}px, ${offsetY + clippedTop * scale}px, 0)`,
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
        {/* Outlines the hall's own scaled rect, not the padded box around it —
            when the aspect ratios differ (the common case), the hall is
            letterboxed inside the box via offsetX/offsetY. Drawing the border
            on the full box instead would leave a gap between this outline and
            the viewport rect below even when panned flush to a hall edge. */}
        <div
          className="pointer-events-none absolute rounded-[5px] border border-dashed border-planner-table-border"
          style={{
            left: offsetX,
            top: offsetY,
            width: hallDimensions.width * scale,
            height: hallDimensions.height * scale,
          }}
        />
        {tables.map((table) => {
          // Tables placed outside the (possibly resized) hall are clamped to
          // its bounds here — same as the main canvas — so a stray dot can't
          // render outside the minimap box.
          const x = clamp(table.position.x, 0, hallDimensions.width)
          const y = clamp(table.position.y, 0, hallDimensions.height)
          return (
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
                left: dotLeft(x, DOT_SIZE),
                top: dotTop(y, DOT_SIZE),
              }}
            />
          )
        })}
        {fixtures.map((fixture) => {
          const x = clamp(fixture.position.x, 0, hallDimensions.width)
          const y = clamp(fixture.position.y, 0, hallDimensions.height)
          return (
            <div
              key={fixture.id}
              className="absolute rounded-[2px] bg-planner-table-border"
              style={{
                width: DOT_SIZE - 1,
                height: DOT_SIZE - 1,
                left: dotLeft(x, DOT_SIZE - 1),
                top: dotTop(y, DOT_SIZE - 1),
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
