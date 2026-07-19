import { useImperativeHandle, useMemo } from "react"
import { useShallow } from "zustand/react/shallow"
import { StatusBar } from "../StatusBar"
import { HallView } from "./HallView"
import { MeasureOverlay } from "./MeasureOverlay"
import { clampToHall, hallWorldOf, sortHallsByZ } from "./utils"
import { ShapeEditOverlay } from "./ShapeEditOverlay"
import { useMeasureTool } from "./useMeasureTool"
import { useTableSnap } from "./useTableSnap"
import type { Ref } from "react"
import type { WorldBounds } from "./utils"
import type { GridSpacing, GridStyle, SnapStep } from "@/stores/view.store"
import type { Hall } from "@/stores/planner.store"
import { useViewStore } from "@/stores/view.store"
import { getEffectiveSize, usePlannerStore } from "@/stores/planner.store"
import { useMeasuresStore } from "@/stores/measures.store"
import { useGlobalStore } from "@/stores/global.store"
import { useIsMobile } from "@/hooks/useMediaQuery"

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
  worldBounds: WorldBounds
  hallScreenOffset: (hall: Hall) => { left: number; top: number }
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
  worldBounds,
  hallScreenOffset,
  ppm,
  zoom,
  gridStyle,
  snapStep,
  gridSpacing = 1,
  ref,
}: HallSurfaceProps) => {
  const isMobile = useIsMobile()

  const { tables, guests, fixtures, rawHalls, hallZOrder } = usePlannerStore(
    useShallow((state) => ({
      tables: state.tables,
      guests: state.guests,
      fixtures: state.fixtures,
      rawHalls: state.halls,
      hallZOrder: state.hallZOrder,
    }))
  )

  // Back-to-front for both DOM/paint order and hit-testing (must agree with
  // the z-sorted array Canvas hands to hallAtPoint).
  const halls = useMemo(
    () => sortHallsByZ(rawHalls, hallZOrder),
    [rawHalls, hallZOrder]
  )

  const hallsById = useMemo(() => new Map(halls.map((h) => [h.id, h])), [halls])

  const guestsByTableId = useMemo(() => {
    const byTable = new Map<string, Array<(typeof guests)[number]>>()
    for (const table of tables) {
      byTable.set(table.id, [])
    }
    for (const guest of guests) {
      if (!guest.tableId) continue
      byTable.get(guest.tableId)?.push(guest)
    }
    return byTable
  }, [tables, guests])

  // Entities clamped into their own hall (hall-local coords, for rendering).
  const canvasTables = useMemo(
    () =>
      tables.map((table) => {
        const hall = hallsById.get(table.hallId)
        if (!hall) return table
        return {
          ...table,
          position: clampToHall(
            table.position,
            getEffectiveSize(table.size, table.rotation),
            hall
          ),
        }
      }),
    [tables, hallsById]
  )

  const canvasFixtures = useMemo(
    () =>
      fixtures.map((fixture) => {
        const hall = hallsById.get(fixture.hallId)
        if (!hall) return fixture
        return {
          ...fixture,
          position: clampToHall(
            fixture.position,
            getEffectiveSize(fixture.size, fixture.rotation),
            hall
          ),
        }
      }),
    [fixtures, hallsById]
  )

  // The same entities in world coords, for the measure tool (measurements are
  // world-space so they can span halls).
  const worldTables = useMemo(
    () =>
      canvasTables.map((t) => {
        const hall = hallsById.get(t.hallId)
        return hall ? { ...t, position: hallWorldOf(t.position, hall) } : t
      }),
    [canvasTables, hallsById]
  )

  const worldFixtures = useMemo(
    () =>
      canvasFixtures.map((f) => {
        const hall = hallsById.get(f.hallId)
        return hall ? { ...f, position: hallWorldOf(f.position, hall) } : f
      }),
    [canvasFixtures, hallsById]
  )

  const tablesByHall = useMemo(() => {
    const byHall = new Map<string, Array<(typeof canvasTables)[number]>>()
    for (const t of canvasTables) {
      const list = byHall.get(t.hallId)
      if (list) list.push(t)
      else byHall.set(t.hallId, [t])
    }
    return byHall
  }, [canvasTables])

  const fixturesByHall = useMemo(() => {
    const byHall = new Map<string, Array<(typeof canvasFixtures)[number]>>()
    for (const f of canvasFixtures) {
      const list = byHall.get(f.hallId)
      if (list) list.push(f)
      else byHall.set(f.hallId, [f])
    }
    return byHall
  }, [canvasFixtures])

  const isMeasuring = useViewStore((state) => state.isMeasuring)
  const measureMode = useViewStore((state) => state.measureMode)
  const showSeats = useViewStore((state) => state.showSeats)
  const weddingId = useGlobalStore((state) => state.weddingId)

  const { deleteMeasurement, updateMeasurementPoint, byWedding } =
    useMeasuresStore(
      useShallow((state) => ({
        deleteMeasurement: state.deleteMeasurement,
        updateMeasurementPoint: state.updateMeasurementPoint,
        byWedding: state.byWedding,
      }))
    )
  const measurements = weddingId ? (byWedding[weddingId] ?? []) : []

  const { activeDrag, dropTargetHallId } = useTableSnap({
    canvasTables,
    canvasFixtures,
    halls,
    ppm,
    snapStep,
    weddingId,
  })

  // Hall the currently-dragged entity belongs to - raised above the other
  // halls so the drag preview isn't hidden under a later-DOM hall (see
  // HallView's `raise`).
  const dragSourceHallId = activeDrag
    ? ((
        canvasTables.find((t) => t.id === activeDrag.id) ??
        canvasFixtures.find((f) => f.id === activeDrag.id)
      )?.hallId ?? null)
    : null

  const {
    pendingPoint,
    cursorPos,
    resolvePoint,
    handleMeasureDown,
    handleMeasureMove,
  } = useMeasureTool({
    worldTables,
    worldFixtures,
    halls,
    worldBounds,
    measureMode,
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
      {!isMobile && isMeasuring && (
        <StatusBar isMeasureStarted={!!pendingPoint} />
      )}
      {/* World wrapper: contains every hall in one coordinate space.
          transform instead of left/top: panning moves this every frame, and a
          left/top change relayouts the whole subtree per frame while a
          translate only recomposites it. */}
      <div
        className="absolute top-0 left-0"
        style={{
          width,
          height,
          transform: `translate3d(${left}px, ${top}px, 0)`,
        }}
      >
        {halls.map((hall) => {
          const offset = hallScreenOffset(hall)
          return (
            <HallView
              key={hall.id}
              hall={hall}
              left={offset.left}
              top={offset.top}
              ppm={ppm}
              zoom={zoom}
              gridStyle={gridStyle}
              gridSpacing={gridSpacing}
              tables={tablesByHall.get(hall.id) ?? []}
              fixtures={fixturesByHall.get(hall.id) ?? []}
              guestsByTableId={guestsByTableId}
              showSeats={showSeats}
              isDropTarget={hall.id === dropTargetHallId}
              raise={hall.id === dragSourceHallId}
            />
          )
        })}

        {/* Measurement annotations - always rendered so saved lines are
            visible; world-level so a line can span two halls. */}
        <MeasureOverlay
          measurements={measurements}
          ppm={ppm}
          widthPx={width}
          heightPx={height}
          origin={{ x: worldBounds.x, y: worldBounds.y }}
          pendingPoint={isMeasuring ? pendingPoint : null}
          cursorPos={isMeasuring ? cursorPos : null}
          onDelete={(id) => weddingId && deleteMeasurement(weddingId, id)}
          activeDrag={activeDrag}
          resolvePoint={resolvePoint}
          onEndpointUpdate={(measurementId, pointKey, point) =>
            weddingId &&
            updateMeasurementPoint(weddingId, measurementId, pointKey, point)
          }
        />

        {/* Vertex editor for the entity in shape-edit mode (renders nothing
            otherwise). Sits above the halls, in world-wrapper coordinates. */}
        <ShapeEditOverlay ppm={ppm} hallScreenOffset={hallScreenOffset} />
      </div>
    </>
  )
}
