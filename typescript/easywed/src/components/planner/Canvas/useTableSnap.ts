import { useDndMonitor } from "@dnd-kit/core"
import { useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { clampToHall, snapPositionToGrid } from "./utils"
import type { Fixture, Table } from "@/stores/planner.store"
import type { SnapStep } from "@/stores/view.store"
import { getEffectiveSize, usePlannerStore } from "@/stores/planner.store"
import { useMeasuresStore } from "@/stores/measures.store"

interface UseTableSnapParams {
  canvasTables: Array<Table>
  canvasFixtures: Array<Fixture>
  ppm: number
  snapStep: SnapStep
  hallDimensions: { width: number; height: number }
  weddingId: string | undefined
}

/**
 * Subscribes to the shared dnd-kit drag lifecycle and, on drop of a table or
 * fixture, snaps the new position to the grid, clamps it inside the hall, and
 * persists it (dragging measurement endpoints along with the object). Returns
 * the live drag offset (for the overlay) and whether a guest is being dragged.
 */
export function useTableSnap({
  canvasTables,
  canvasFixtures,
  ppm,
  snapStep,
  hallDimensions,
  weddingId,
}: UseTableSnapParams) {
  const { updateTablePosition, updateFixturePosition } = usePlannerStore(
    useShallow((state) => ({
      updateTablePosition: state.updateTablePosition,
      updateFixturePosition: state.updateFixturePosition,
    }))
  )
  const shiftMeasurementPoints = useMeasuresStore(
    (state) => state.shiftMeasurementPoints
  )

  const [isDraggingGuest, setIsDraggingGuest] = useState(false)
  const [activeDrag, setActiveDrag] = useState<{
    id: string
    dx: number
    dy: number
  } | null>(null)

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

  return { activeDrag, isDraggingGuest }
}
