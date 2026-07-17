import { useDndMonitor } from "@dnd-kit/core"
import { useState } from "react"
import { useShallow } from "zustand/react/shallow"
import {
  clampToHall,
  hallAtPoint,
  nearestHall,
  snapPositionToGrid,
} from "./utils"
import type { Fixture, Hall, Position, Table } from "@/stores/planner.store"
import type { SnapStep } from "@/stores/view.store"
import { getEffectiveSize, usePlannerStore } from "@/stores/planner.store"
import { useMeasuresStore } from "@/stores/measures.store"

interface UseTableSnapParams {
  canvasTables: Array<Table>
  canvasFixtures: Array<Fixture>
  halls: Array<Hall>
  ppm: number
  snapStep: SnapStep
  weddingId: string | undefined
}

/**
 * Subscribes to the shared dnd-kit drag lifecycle and, on drop:
 * - table/fixture: resolves the hall under the entity's center (falling back
 *   to the nearest hall), snaps the new hall-local position to the grid,
 *   clamps it inside that hall, and persists it - reassigning the entity's
 *   hallId when the drop crossed into another hall. Measurement endpoints
 *   anchored to the object are shifted by its world-space delta.
 * - hall (dragged by its label chip): snaps and persists the hall's world
 *   position, shifting measurements anchored to its entities along.
 * Returns the live drag offset (for the measurement overlay) and the hall
 * currently under the dragged entity (for the drop-target highlight).
 */
export function useTableSnap({
  canvasTables,
  canvasFixtures,
  halls,
  ppm,
  snapStep,
  weddingId,
}: UseTableSnapParams) {
  const { updateTablePosition, updateFixturePosition, updateHallPosition } =
    usePlannerStore(
      useShallow((state) => ({
        updateTablePosition: state.updateTablePosition,
        updateFixturePosition: state.updateFixturePosition,
        updateHallPosition: state.updateHallPosition,
      }))
    )
  const shiftMeasurementPoints = useMeasuresStore(
    (state) => state.shiftMeasurementPoints
  )

  const [activeDrag, setActiveDrag] = useState<{
    id: string
    dx: number
    dy: number
  } | null>(null)
  const [dropTargetHallId, setDropTargetHallId] = useState<string | null>(null)

  const hallOf = (hallId: string) => halls.find((h) => h.id === hallId)

  const findEntity = (
    type: unknown,
    id: string
  ): Table | Fixture | undefined =>
    type === "table-drag"
      ? canvasTables.find((ct) => ct.id === id)
      : type === "fixture-drag"
        ? canvasFixtures.find((cf) => cf.id === id)
        : undefined

  // World-space center of a dragged entity after applying the px delta.
  const draggedWorldRect = (
    entity: Table | Fixture,
    delta: { x: number; y: number }
  ) => {
    const sourceHall = hallOf(entity.hallId)
    const size = getEffectiveSize(entity.size, entity.rotation)
    const topLeft = {
      x: (sourceHall?.position.x ?? 0) + entity.position.x + delta.x / ppm,
      y: (sourceHall?.position.y ?? 0) + entity.position.y + delta.y / ppm,
    }
    return {
      topLeft,
      size,
      center: {
        x: topLeft.x + size.width / 2,
        y: topLeft.y + size.height / 2,
      },
    }
  }

  const resolveTargetHall = (center: Position): Hall | null =>
    hallAtPoint(halls, center) ?? nearestHall(halls, center)

  const dropEntity = (
    type: "table-drag" | "fixture-drag",
    id: string,
    delta: { x: number; y: number }
  ) => {
    const entity = findEntity(type, id)
    if (!entity) return
    const sourceHall = hallOf(entity.hallId)
    const { topLeft, size, center } = draggedWorldRect(entity, delta)
    const target = resolveTargetHall(center)
    if (!target) return

    const rawLocal = {
      x: topLeft.x - target.position.x,
      y: topLeft.y - target.position.y,
    }
    const snapped =
      snapStep === "off" ? rawLocal : snapPositionToGrid(rawLocal, snapStep)
    const next = clampToHall(
      snapped,
      size,
      target.size.width,
      target.size.height
    )
    const crossedHalls = target.id !== entity.hallId

    if (type === "table-drag")
      updateTablePosition(
        id,
        next.x,
        next.y,
        crossedHalls ? target.id : undefined
      )
    else
      updateFixturePosition(
        id,
        next.x,
        next.y,
        crossedHalls ? target.id : undefined
      )

    if (weddingId) {
      // Measurements live in world coords, so shift anchored endpoints by the
      // object's world-space delta (including any hall change).
      const worldDx =
        target.position.x +
        next.x -
        ((sourceHall?.position.x ?? 0) + entity.position.x)
      const worldDy =
        target.position.y +
        next.y -
        ((sourceHall?.position.y ?? 0) + entity.position.y)
      shiftMeasurementPoints(weddingId, id, worldDx, worldDy)
    }
  }

  useDndMonitor({
    onDragStart: ({ active }) => {
      const type = active.data.current?.type
      if (type === "table-drag" || type === "fixture-drag") {
        setActiveDrag({ id: String(active.id), dx: 0, dy: 0 })
      }
    },

    onDragMove: (e) => {
      const type = e.active.data.current?.type
      if (type === "table-drag" || type === "fixture-drag") {
        const id = String(e.active.id)
        setActiveDrag({ id, dx: e.delta.x / ppm, dy: e.delta.y / ppm })
        const entity = findEntity(type, id)
        if (entity) {
          const { center } = draggedWorldRect(entity, e.delta)
          const target = resolveTargetHall(center)
          setDropTargetHallId(
            target && target.id !== entity.hallId ? target.id : null
          )
        }
      }
    },

    onDragEnd: (e) => {
      setActiveDrag(null)
      setDropTargetHallId(null)
      const type = e.active.data.current?.type

      if (type === "table-drag" || type === "fixture-drag") {
        dropEntity(type, String(e.active.id), e.delta)
        return
      }

      if (type === "hall-drag") {
        const hallId = e.active.data.current?.hallId as string | undefined
        const hall = hallId ? hallOf(hallId) : undefined
        if (!hall) return
        const raw = {
          x: hall.position.x + e.delta.x / ppm,
          y: hall.position.y + e.delta.y / ppm,
        }
        const next =
          snapStep === "off" ? raw : snapPositionToGrid(raw, snapStep)
        updateHallPosition(hall.id, next.x, next.y)
        if (weddingId) {
          const dx = next.x - hall.position.x
          const dy = next.y - hall.position.y
          if (dx !== 0 || dy !== 0) {
            // Entities kept their hall-local positions but moved in world
            // space; measurements anchored to them must follow.
            for (const t of canvasTables)
              if (t.hallId === hall.id)
                shiftMeasurementPoints(weddingId, t.id, dx, dy)
            for (const f of canvasFixtures)
              if (f.hallId === hall.id)
                shiftMeasurementPoints(weddingId, f.id, dx, dy)
          }
        }
      }
    },
    onDragCancel: () => {
      setActiveDrag(null)
      setDropTargetHallId(null)
    },
  })

  return { activeDrag, dropTargetHallId }
}
