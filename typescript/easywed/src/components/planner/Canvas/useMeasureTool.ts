import { useCallback, useEffect, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import {
  clamp,
  hallAtPoint,
  hallLocalOf,
  hallWorldOf,
  nearestCircleBorder,
  nearestRectBorder,
  rectBorderTowards,
  stickToHalls,
} from "./utils"
import type { WorldBounds } from "./utils"
import type { Fixture, Hall, Position, Table } from "@/stores/planner.store"
import type { MeasurementPoint } from "@/stores/measures.store"
import { nearestPolygonBoundaryPoint, rectVertices } from "@/lib/geometry"
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
  // Entities with positions converted to WORLD meters (hall pos + local pos) -
  // measurements span halls, so everything here works in world space.
  worldTables: Array<Table>
  worldFixtures: Array<Fixture>
  halls: Array<Hall>
  worldBounds: WorldBounds
  measureMode: "center" | "border"
  ppm: number
  weddingId: string | undefined
  isMeasuring: boolean
}

/**
 * Owns the measure-tool state machine: resolving a pointer position to a
 * snapped point (table/fixture center or border, or a wall of the hall under
 * the cursor), and tracking the pending start point + live cursor between the
 * two clicks of a measurement. All coordinates are world-space meters.
 * Returns the imperative handlers Canvas drives via its ref plus the
 * pending/cursor points the overlay renders.
 */
export function useMeasureTool({
  worldTables: canvasTables,
  worldFixtures: canvasFixtures,
  halls,
  worldBounds,
  measureMode,
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
    (rawXM: number, rawYM: number): MeasurementPoint => {
      // Keep every resolved point inside the world (union of halls); anything
      // that still lands in the void between halls sticks to a wall below.
      const xM = clamp(rawXM, worldBounds.x, worldBounds.x + worldBounds.width)
      const yM = clamp(rawYM, worldBounds.y, worldBounds.y + worldBounds.height)
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
      // Snap to the walls of the hall under the cursor - threshold scales
      // with zoom so it always covers ~20px. Rect halls go through the same
      // boundary projection as polygon halls, via their 4 corner vertices.
      const hall = hallAtPoint(halls, { x: xM, y: yM })
      if (hall) {
        const wallThreshold = Math.max(0.3, 20 / ppm)
        const local = hallLocalOf({ x: xM, y: yM }, hall)
        const bp = nearestPolygonBoundaryPoint(
          local,
          hall.geometry?.vertices ?? rectVertices(hall.size)
        )
        if (Math.hypot(bp.x - local.x, bp.y - local.y) < wallThreshold)
          return hallWorldOf(bp, hall)
        return { x: xM, y: yM }
      }

      // Void between/outside the halls: a point can't be dropped there, it
      // sticks to the nearest hall border instead. Cross-hall measuring still
      // works - each end lands on its own hall's wall.
      return stickToHalls(halls, { x: xM, y: yM })
    },
    [canvasTables, canvasFixtures, measureMode, halls, worldBounds, ppm]
  )

  // Like resolvePoint but without object snapping: used when a whole
  // measurement is dragged by its label, where re-snapping each end to
  // whatever it passes over would rewrite the distance mid-drag.
  const constrainPoint = useCallback(
    (rawXM: number, rawYM: number): Position =>
      stickToHalls(halls, {
        x: clamp(rawXM, worldBounds.x, worldBounds.x + worldBounds.width),
        y: clamp(rawYM, worldBounds.y, worldBounds.y + worldBounds.height),
      }),
    [halls, worldBounds]
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
    constrainPoint,
    handleMeasureDown,
    handleMeasureMove,
  }
}
