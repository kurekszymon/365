import { useDndMonitor, useDroppable } from "@dnd-kit/core"
import { useEffect, useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { DraggableTable } from "./DraggableTable"
import { DraggableFixture } from "./DraggableFixture"
import { HallBackground } from "./HallBackground"
import { MeasureOverlay } from "./MeasureOverlay"
import {
  clampToHall,
  nearestCircleBorder,
  nearestRectBorder,
  snapPositionToGrid,
} from "./utils"
import type { GridSpacing, GridStyle, SnapStep } from "@/stores/view.store"
import type { Position } from "@/stores/planner.store"
import type { MeasurementPoint } from "@/stores/measures.store"
import { useViewStore } from "@/stores/view.store"
import { getEffectiveSize, usePlannerStore } from "@/stores/planner.store"
import { useGlobalStore } from "@/stores/global.store"
import { useMeasuresStore } from "@/stores/measures.store"

interface HallSurfaceProps {
  left: number
  top: number
  width: number
  height: number
  ppm: number
  zoom: number
  gridStyle: GridStyle
  snapStep: SnapStep
  gridSpacing?: GridSpacing
}

export const HallSurface = ({
  left,
  top,
  width,
  height,
  ppm,
  zoom,
  gridStyle,
  snapStep,
  gridSpacing = 1,
}: HallSurfaceProps) => {
  const { setNodeRef: setDropRef } = useDroppable({
    // droppable data { type: "hall" } so the shared onDragEnd in Planner.tsx ignores guest drops on the background
    id: "hall-identifier",
    data: { type: "hall" },
  })

  const {
    tables,
    guests,
    fixtures,
    hallDimensions,
    updateTablePosition,
    updateFixturePosition,
  } = usePlannerStore(
    useShallow((state) => ({
      tables: state.tables,
      guests: state.guests,
      fixtures: state.fixtures,
      hallDimensions: state.hall.dimensions,
      updateTablePosition: state.updateTablePosition,
      updateFixturePosition: state.updateFixturePosition,
    }))
  )

  const assignedGuestsByTableId = useMemo(() => {
    const counts = new Map<string, number>()
    for (const table of tables) {
      counts.set(table.id, 0)
    }
    for (const guest of guests) {
      if (!guest.tableId) continue
      counts.set(guest.tableId, (counts.get(guest.tableId) ?? 0) + 1)
    }
    return counts
  }, [tables, guests])

  const canvasTables = useMemo(
    () =>
      tables.map((table) => ({
        ...table,
        position: clampToHall(
          table.position,
          getEffectiveSize(table.size, table.rotation),
          hallDimensions.width,
          hallDimensions.height
        ),
      })),
    [tables, hallDimensions]
  )

  const canvasFixtures = useMemo(
    () =>
      fixtures.map((fixture) => ({
        ...fixture,
        position: clampToHall(
          fixture.position,
          getEffectiveSize(fixture.size, fixture.rotation),
          hallDimensions.width,
          hallDimensions.height
        ),
      })),
    [fixtures, hallDimensions]
  )

  const [isDraggingGuest, setIsDraggingGuest] = useState(false)

  // Measure tool state
  const isMeasuring = useViewStore((state) => state.isMeasuring)
  const measureMode = useViewStore((state) => state.measureMode)
  const weddingId = useGlobalStore((state) => state.weddingId)
  const { addMeasurement, deleteMeasurement, shiftMeasurementPoints, byWedding } =
    useMeasuresStore(
      useShallow((state) => ({
        addMeasurement: state.addMeasurement,
        deleteMeasurement: state.deleteMeasurement,
        shiftMeasurementPoints: state.shiftMeasurementPoints,
        byWedding: state.byWedding,
      }))
    )
  const measurements = weddingId ? (byWedding[weddingId] ?? []) : []

  const [pendingPoint, setPendingPoint] = useState<MeasurementPoint | null>(
    null
  )
  const [cursorPos, setCursorPos] = useState<Position | null>(null)

  // Clear pending state when measure mode is turned off
  useEffect(() => {
    if (!isMeasuring) {
      setPendingPoint(null)
      setCursorPos(null)
    }
  }, [isMeasuring])

  /**
   * Resolves a pointer position (in meters relative to the hall) to either
   * the center / border of a containing table/fixture, or the raw hall position.
   */
  const resolvePoint = (xM: number, yM: number): MeasurementPoint => {
    for (const table of canvasTables) {
      const s = getEffectiveSize(table.size, table.rotation)
      const h = table.shape === "round" ? s.width : s.height
      if (
        xM >= table.position.x &&
        xM <= table.position.x + s.width &&
        yM >= table.position.y &&
        yM <= table.position.y + h
      ) {
        const cx = table.position.x + s.width / 2
        const cy = table.position.y + h / 2
        if (measureMode === "border") {
          const bp =
            table.shape === "round"
              ? nearestCircleBorder(xM, yM, cx, cy, s.width / 2)
              : nearestRectBorder(
                  xM,
                  yM,
                  table.position.x,
                  table.position.y,
                  s.width,
                  h
                )
          return { ...bp, objectId: table.id }
        }
        return { x: cx, y: cy, objectId: table.id }
      }
    }
    for (const fixture of canvasFixtures) {
      const s = getEffectiveSize(fixture.size, fixture.rotation)
      const h = fixture.shape === "circle" ? s.width : s.height
      if (
        xM >= fixture.position.x &&
        xM <= fixture.position.x + s.width &&
        yM >= fixture.position.y &&
        yM <= fixture.position.y + h
      ) {
        const cx = fixture.position.x + s.width / 2
        const cy = fixture.position.y + h / 2
        if (measureMode === "border") {
          const bp =
            fixture.shape === "circle"
              ? nearestCircleBorder(xM, yM, cx, cy, s.width / 2)
              : nearestRectBorder(
                  xM,
                  yM,
                  fixture.position.x,
                  fixture.position.y,
                  s.width,
                  h
                )
          return { ...bp, objectId: fixture.id }
        }
        return { x: cx, y: cy, objectId: fixture.id }
      }
    }
    return { x: xM, y: yM }
  }

  const handleMeasurePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const xM = e.nativeEvent.offsetX / ppm
    const yM = e.nativeEvent.offsetY / ppm
    const point = resolvePoint(xM, yM)

    if (!pendingPoint) {
      setPendingPoint(point)
      setCursorPos(point)
    } else {
      if (weddingId) addMeasurement(weddingId, pendingPoint, point)
      setPendingPoint(null)
      setCursorPos(null)
    }
  }

  const handleMeasurePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pendingPoint) return
    setCursorPos({
      x: e.nativeEvent.offsetX / ppm,
      y: e.nativeEvent.offsetY / ppm,
    })
  }

  useDndMonitor({
    onDragStart: ({ active }) =>
      setIsDraggingGuest(active.data.current?.type === "guest"),

    onDragEnd: (e) => {
      if (e.active.data.current?.type === "table-drag") {
        const id = String(e.active.id)
        const table = canvasTables.find((ct) => ct.id === id)

        if (table) {
          const rawNext = {
            x: table.position.x + e.delta.x / ppm,
            y: table.position.y + e.delta.y / ppm,
          }

          const snappedNext =
            snapStep === "off" ? rawNext : snapPositionToGrid(rawNext, snapStep)

          const next = clampToHall(
            snappedNext,
            getEffectiveSize(table.size, table.rotation),
            hallDimensions.width,
            hallDimensions.height
          )

          updateTablePosition(id, next.x, next.y)
          if (weddingId) {
            shiftMeasurementPoints(
              weddingId,
              id,
              next.x - table.position.x,
              next.y - table.position.y
            )
          }
        }
      }

      if (e.active.data.current?.type === "fixture-drag") {
        const id = String(e.active.id)
        const fixture = canvasFixtures.find((cf) => cf.id === id)

        if (fixture) {
          const rawNext = {
            x: fixture.position.x + e.delta.x / ppm,
            y: fixture.position.y + e.delta.y / ppm,
          }

          const snappedNext =
            snapStep === "off" ? rawNext : snapPositionToGrid(rawNext, snapStep)

          const next = clampToHall(
            snappedNext,
            getEffectiveSize(fixture.size, fixture.rotation),
            hallDimensions.width,
            hallDimensions.height
          )

          updateFixturePosition(id, next.x, next.y)
          if (weddingId) {
            shiftMeasurementPoints(
              weddingId,
              id,
              next.x - fixture.position.x,
              next.y - fixture.position.y
            )
          }
        }
      }

      setIsDraggingGuest(false)
    },
    onDragCancel: () => setIsDraggingGuest(false),
  })

  return (
    <HallBackground
      ref={setDropRef}
      hallWidth={width}
      hallHeight={height}
      ppm={ppm}
      gridStyle={gridStyle}
      gridSpacing={gridSpacing}
      zoom={zoom}
      className="absolute z-10 shadow-md ring-2 ring-emerald-400"
      style={{ left, top }}
    >
      {canvasTables.map((ct) => (
        <DraggableTable
          key={ct.id}
          table={ct}
          guestsAssigned={assignedGuestsByTableId.get(ct.id) ?? 0}
          hallWidth={hallDimensions.width}
          hallHeight={hallDimensions.height}
          ppm={ppm}
          isDraggingGuest={isDraggingGuest}
        />
      ))}
      {canvasFixtures.map((cf) => (
        <DraggableFixture
          key={cf.id}
          fixture={cf}
          hallWidth={hallDimensions.width}
          hallHeight={hallDimensions.height}
          ppm={ppm}
        />
      ))}

      {/* Measure interaction overlay — sits above tables/fixtures to intercept pointer events */}
      {isMeasuring && (
        <div
          className="absolute inset-0 z-30 cursor-crosshair"
          onPointerDown={handleMeasurePointerDown}
          onPointerMove={handleMeasurePointerMove}
        />
      )}

      {/* Measurement annotations — always rendered so saved lines are visible */}
      <MeasureOverlay
        measurements={measurements}
        ppm={ppm}
        hallWidthPx={width}
        hallHeightPx={height}
        pendingPoint={isMeasuring ? pendingPoint : null}
        cursorPos={isMeasuring ? cursorPos : null}
        onDelete={(id) => weddingId && deleteMeasurement(weddingId, id)}
      />
    </HallBackground>
  )
}
