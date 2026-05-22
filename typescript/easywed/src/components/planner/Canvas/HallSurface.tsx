import { useDndMonitor, useDroppable } from "@dnd-kit/core"
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react"
import { useShallow } from "zustand/react/shallow"
import { DraggableTable } from "./DraggableTable"
import { DraggableFixture } from "./DraggableFixture"
import { HallBackground } from "./HallBackground"
import { MeasureOverlay } from "./MeasureOverlay"
import {
  clampToHall,
  nearestCircleBorder,
  nearestRectBorder,
  rectBorderTowards,
  snapPositionToGrid,
} from "./utils"
import type { Ref } from "react"
import type { GridSpacing, GridStyle, SnapStep } from "@/stores/view.store"
import type { Position } from "@/stores/planner.store"
import type { MeasurementPoint } from "@/stores/measures.store"
import { useViewStore } from "@/stores/view.store"
import { getEffectiveSize, usePlannerStore } from "@/stores/planner.store"
import { useMeasuresStore } from "@/stores/measures.store"
import { Route } from "@/routes/wedding.$id/planner"

export interface HallSurfaceMethods {
  handleMeasureDown: (xM: number, yM: number, shiftKey: boolean) => void
  handleMeasureMove: (xM: number, yM: number, shiftKey: boolean) => void
  hasPendingPoint: boolean
}

const SNAP_FLIP_THRESHOLD = 0.3

const getRectZone = (
  xM: number,
  yM: number,
  x0: number,
  y0: number,
  w: number,
  h: number
): "left" | "right" | "top" | "bottom" | "inside" => {
  if (
    xM >= x0 - SNAP_FLIP_THRESHOLD &&
    xM <= x0 + w + SNAP_FLIP_THRESHOLD &&
    yM >= y0 - SNAP_FLIP_THRESHOLD &&
    yM <= y0 + h + SNAP_FLIP_THRESHOLD
  )
    return "inside"
  const cx = x0 + w / 2
  const cy = y0 + h / 2
  const normX = (xM - cx) / (w / 2)
  const normY = (yM - cy) / (h / 2)
  return Math.abs(normX) >= Math.abs(normY)
    ? normX < 0
      ? "left"
      : "right"
    : normY < 0
      ? "top"
      : "bottom"
}

const getCircleZone = (
  xM: number,
  yM: number,
  cx: number,
  cy: number,
  r: number
): "left" | "right" | "top" | "bottom" | "inside" => {
  if (Math.sqrt((xM - cx) ** 2 + (yM - cy) ** 2) <= r + SNAP_FLIP_THRESHOLD)
    return "inside"
  const dx = xM - cx
  const dy = yM - cy
  return Math.abs(dx) >= Math.abs(dy)
    ? dx < 0
      ? "left"
      : "right"
    : dy < 0
      ? "top"
      : "bottom"
}

const constrainToAxis = (
  xM: number,
  yM: number,
  origin: { x: number; y: number }
): { x: number; y: number } => {
  const dx = Math.abs(xM - origin.x)
  const dy = Math.abs(yM - origin.y)
  return dx >= dy ? { x: xM, y: origin.y } : { x: origin.x, y: yM }
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
  const weddingId = Route.useParams().id

  const {
    addMeasurement,
    deleteMeasurement,
    shiftMeasurementPoints,
    updateMeasurementPoint,
    byWedding,
  } = useMeasuresStore(
    useShallow((state) => ({
      addMeasurement: state.addMeasurement,
      deleteMeasurement: state.deleteMeasurement,
      shiftMeasurementPoints: state.shiftMeasurementPoints,
      updateMeasurementPoint: state.updateMeasurementPoint,
      byWedding: state.byWedding,
    }))
  )

  const [activeDrag, setActiveDrag] = useState<{
    id: string
    dx: number
    dy: number
  } | null>(null)
  const measurements = weddingId ? (byWedding[weddingId] ?? []) : []

  const [pendingPoint, setPendingPoint] = useState<MeasurementPoint | null>(
    null
  )
  const [cursorPos, setCursorPos] = useState<Position | null>(null)
  // Tracks which of the 4 zones (left/right/top/bottom) the cursor is currently in
  // relative to the pending point's snapped object. null = not yet established / inside.
  const [pendingSnapZone, setPendingSnapZone] = useState<
    "left" | "right" | "top" | "bottom" | null
  >(null)

  useEffect(() => {
    if (!isMeasuring) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingPoint(null)
      setCursorPos(null)
      setPendingSnapZone(null)
    }
  }, [isMeasuring])

  const resolvePoint = useCallback(
    (xM: number, yM: number): MeasurementPoint => {
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
      // Snap to hall walls — threshold scales with zoom so it always covers ~20px
      const wallThreshold = Math.max(0.3, 20 / ppm)
      const dLeft = xM
      const dRight = hallDimensions.width - xM
      const dTop = yM
      const dBottom = hallDimensions.height - yM
      const minWall = Math.min(dLeft, dRight, dTop, dBottom)
      if (minWall < wallThreshold) {
        if (minWall === dLeft) return { x: 0, y: yM }
        if (minWall === dRight) return { x: hallDimensions.width, y: yM }
        if (minWall === dTop) return { x: xM, y: 0 }
        return { x: xM, y: hallDimensions.height }
      }

      return { x: xM, y: yM }
    },
    [canvasTables, canvasFixtures, measureMode, hallDimensions, ppm]
  )

  const handleMeasureDown = useCallback(
    (xM: number, yM: number, shiftKey: boolean) => {
      let x = xM
      let y = yM
      if (pendingPoint && shiftKey) {
        const c = constrainToAxis(x, y, pendingPoint)
        x = c.x
        y = c.y
      }
      const point = resolvePoint(x, y)
      if (!pendingPoint) {
        setPendingPoint(point)
        setCursorPos(point)
        setPendingSnapZone(null)
      } else {
        if (weddingId) addMeasurement(weddingId, pendingPoint, point)
        setPendingPoint(null)
        setCursorPos(null)
        setPendingSnapZone(null)
      }
    },
    [pendingPoint, resolvePoint, weddingId, addMeasurement]
  )

  const handleMeasureMove = useCallback(
    (xM: number, yM: number, shiftKey: boolean) => {
      if (!pendingPoint) return
      let x = xM
      let y = yM
      if (shiftKey) {
        const c = constrainToAxis(x, y, pendingPoint)
        x = c.x
        y = c.y
      }
      const resolved = resolvePoint(x, y)
      setCursorPos({ x: resolved.x, y: resolved.y })
      if (pendingPoint.objectId && measureMode === "border") {
        const table = canvasTables.find((t) => t.id === pendingPoint.objectId)
        if (table) {
          const s = getEffectiveSize(table.size, table.rotation)
          const h = table.shape === "round" ? s.width : s.height
          const cx = table.position.x + s.width / 2
          const cy = table.position.y + h / 2
          const zone =
            table.shape === "round"
              ? getCircleZone(x, y, cx, cy, s.width / 2)
              : getRectZone(
                  x,
                  y,
                  table.position.x,
                  table.position.y,
                  s.width,
                  h
                )
          if (zone !== "inside" && zone !== pendingSnapZone) {
            setPendingSnapZone(zone)
            setPendingPoint(
              table.shape === "round"
                ? {
                    ...nearestCircleBorder(x, y, cx, cy, s.width / 2),
                    objectId: table.id,
                  }
                : {
                    ...rectBorderTowards(x, y, cx, cy, s.width, h),
                    objectId: table.id,
                  }
            )
          }
          return
        }
        const fixture = canvasFixtures.find(
          (f) => f.id === pendingPoint.objectId
        )
        if (fixture) {
          const s = getEffectiveSize(fixture.size, fixture.rotation)
          const h = fixture.shape === "circle" ? s.width : s.height
          const cx = fixture.position.x + s.width / 2
          const cy = fixture.position.y + h / 2
          const zone =
            fixture.shape === "circle"
              ? getCircleZone(x, y, cx, cy, s.width / 2)
              : getRectZone(
                  x,
                  y,
                  fixture.position.x,
                  fixture.position.y,
                  s.width,
                  h
                )
          if (zone !== "inside" && zone !== pendingSnapZone) {
            setPendingSnapZone(zone)
            setPendingPoint(
              fixture.shape === "circle"
                ? {
                    ...nearestCircleBorder(x, y, cx, cy, s.width / 2),
                    objectId: fixture.id,
                  }
                : {
                    ...rectBorderTowards(x, y, cx, cy, s.width, h),
                    objectId: fixture.id,
                  }
            )
          }
        }
      }
    },
    [
      pendingPoint,
      pendingSnapZone,
      resolvePoint,
      measureMode,
      canvasTables,
      canvasFixtures,
    ]
  )

  useImperativeHandle(
    ref,
    () => ({
      handleMeasureDown,
      handleMeasureMove,
      hasPendingPoint: !!pendingPoint,
    }),
    [handleMeasureDown, handleMeasureMove, pendingPoint]
  )

  useDndMonitor({
    onDragStart: ({ active }) => {
      setIsDraggingGuest(active.data.current?.type === "guest")
      if (
        active.data.current?.type === "table-drag" ||
        active.data.current?.type === "fixture-drag"
      ) {
        setActiveDrag({ id: String(active.id), dx: 0, dy: 0 })
      }
    },

    onDragMove: (e) => {
      if (
        e.active.data.current?.type === "table-drag" ||
        e.active.data.current?.type === "fixture-drag"
      ) {
        setActiveDrag({
          id: String(e.active.id),
          dx: e.delta.x / ppm,
          dy: e.delta.y / ppm,
        })
      }
    },

    onDragEnd: (e) => {
      setActiveDrag(null)
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
    onDragCancel: () => {
      setActiveDrag(null)
      setIsDraggingGuest(false)
    },
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
  )
}
