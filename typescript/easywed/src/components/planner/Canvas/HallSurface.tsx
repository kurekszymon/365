import { useDndMonitor, useDroppable } from "@dnd-kit/core"
import { useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { DraggableTable } from "./DraggableTable"
import { HallBackground } from "./HallBackground"
import { clampToHall, snapPositionToGrid } from "./utils"
import type { GridSpacing, GridStyle, SnapStep } from "@/stores/view.store"
import { getEffectiveSize, usePlannerStore } from "@/stores/planner.store"

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

  const { tables, guests, hallDimensions, updateTablePosition } =
    usePlannerStore(
      useShallow((state) => ({
        tables: state.tables,
        guests: state.guests,
        hallDimensions: state.hall.dimensions,
        updateTablePosition: state.updateTablePosition,
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

  const [isDraggingGuest, setIsDraggingGuest] = useState(false)
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
    </HallBackground>
  )
}
