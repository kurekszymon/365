import { useCallback, useEffect, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import {
  nearestCircleBorder,
  nearestRectBorder,
  rectBorderTowards,
} from "./utils"
import type { Fixture, Position, Table } from "@/stores/planner.store"
import type { MeasurementPoint } from "@/stores/measures.store"
import { getEffectiveSize } from "@/stores/planner.store"
import { useMeasuresStore } from "@/stores/measures.store"

const SNAP_FLIP_THRESHOLD = 0.3

type Zone = "left" | "right" | "top" | "bottom" | "inside"

const getRectZone = (
  xM: number,
  yM: number,
  x0: number,
  y0: number,
  w: number,
  h: number
): Zone => {
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
): Zone => {
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

interface UseMeasureToolParams {
  canvasTables: Array<Table>
  canvasFixtures: Array<Fixture>
  measureMode: "center" | "border"
  hallDimensions: { width: number; height: number }
  ppm: number
  weddingId: string | undefined
  isMeasuring: boolean
}

/**
 * Owns the measure-tool state machine: resolving a pointer position to a
 * snapped point (table/fixture center or border, or hall wall), and tracking
 * the pending start point + live cursor between the two clicks of a
 * measurement. Returns the imperative handlers Canvas drives via its ref plus
 * the pending/cursor points the overlay renders.
 */
export function useMeasureTool({
  canvasTables,
  canvasFixtures,
  measureMode,
  hallDimensions,
  ppm,
  weddingId,
  isMeasuring,
}: UseMeasureToolParams) {
  const { addMeasurement } = useMeasuresStore(
    useShallow((state) => ({ addMeasurement: state.addMeasurement }))
  )

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

  return {
    pendingPoint,
    cursorPos,
    resolvePoint,
    handleMeasureDown,
    handleMeasureMove,
  }
}
