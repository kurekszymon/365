import { useDroppable } from "@dnd-kit/core"
import { useImperativeHandle, useMemo } from "react"
import { useShallow } from "zustand/react/shallow"
import { StatusBar } from "../StatusBar"
import { DraggableTable } from "./DraggableTable"
import { DraggableFixture } from "./DraggableFixture"
import { HallBackground } from "./HallBackground"
import { MeasureOverlay } from "./MeasureOverlay"
import { clampToHall } from "./utils"
import { useMeasureTool } from "./useMeasureTool"
import { useTableSnap } from "./useTableSnap"
import type { Ref } from "react"
import type { GridSpacing, GridStyle, SnapStep } from "@/stores/view.store"
import { useViewStore } from "@/stores/view.store"
import { getEffectiveSize, usePlannerStore } from "@/stores/planner.store"
import { useMeasuresStore } from "@/stores/measures.store"
import { Route } from "@/routes/wedding.$id/planner"

export interface HallSurfaceMethods {
  handleMeasureDown: (xM: number, yM: number, shiftKey: boolean) => void
  handleMeasureMove: (xM: number, yM: number, shiftKey: boolean) => void
  hasPendingPoint: boolean
}

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
  ref?: Ref<HallSurfaceMethods>
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
  ref,
}: HallSurfaceProps) => {
  const { setNodeRef: setDropRef } = useDroppable({
    // droppable data { type: "hall" } so the shared onDragEnd in Planner.tsx ignores guest drops on the background
    id: "hall-identifier",
    data: { type: "hall" },
  })

  const { tables, guests, fixtures, hallDimensions } = usePlannerStore(
    useShallow((state) => ({
      tables: state.tables,
      guests: state.guests,
      fixtures: state.fixtures,
      hallDimensions: state.hall.dimensions,
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

  const isMeasuring = useViewStore((state) => state.isMeasuring)
  const measureMode = useViewStore((state) => state.measureMode)
  const weddingId = Route.useParams().id

  const { deleteMeasurement, updateMeasurementPoint, byWedding } =
    useMeasuresStore(
      useShallow((state) => ({
        deleteMeasurement: state.deleteMeasurement,
        updateMeasurementPoint: state.updateMeasurementPoint,
        byWedding: state.byWedding,
      }))
    )
  const measurements = weddingId ? (byWedding[weddingId] ?? []) : []

  const { activeDrag, isDraggingGuest } = useTableSnap({
    canvasTables,
    canvasFixtures,
    ppm,
    snapStep,
    hallDimensions,
    weddingId,
  })

  const {
    pendingPoint,
    cursorPos,
    resolvePoint,
    handleMeasureDown,
    handleMeasureMove,
  } = useMeasureTool({
    canvasTables,
    canvasFixtures,
    measureMode,
    hallDimensions,
    ppm,
    weddingId,
    isMeasuring,
  })

  useImperativeHandle(
    ref,
    () => ({
      handleMeasureDown,
      handleMeasureMove,
      hasPendingPoint: !!pendingPoint,
    }),
    [handleMeasureDown, handleMeasureMove, pendingPoint]
  )

  return (
    <>
      {isMeasuring && <StatusBar isMeasureStarted={!!pendingPoint} />}
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

        {/* Measurement annotations — always rendered so saved lines are visible */}
        <MeasureOverlay
          measurements={measurements}
          ppm={ppm}
          hallWidthPx={width}
          hallHeightPx={height}
          pendingPoint={isMeasuring ? pendingPoint : null}
          cursorPos={isMeasuring ? cursorPos : null}
          onDelete={(id) => deleteMeasurement(weddingId, id)}
          activeDrag={activeDrag}
          resolvePoint={resolvePoint}
          onEndpointUpdate={(measurementId, pointKey, point) =>
            updateMeasurementPoint(weddingId, measurementId, pointKey, point)
          }
        />
      </HallBackground>
    </>
  )
}
