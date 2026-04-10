import { DndContext, useDroppable } from "@dnd-kit/core"
import { useMemo } from "react"
import { useShallow } from "zustand/react/shallow"
import { DraggableTable } from "./DraggableTable"
import { clampToHall } from "./utils"
import { usePlannerStore } from "@/stores/planner.store"
import type { DragEndEvent } from "@dnd-kit/core"

type HallSurfaceProps = {
  left: number
  top: number
  width: number
  height: number
  ppm: number
  zoom: number
}

export const HallSurface = ({
  left,
  top,
  width,
  height,
  ppm,
  zoom,
}: HallSurfaceProps) => {
  const { setNodeRef: setDropRef } = useDroppable({ id: "hall-identifier" })

  const { tables, hallDimensions, updateTablePosition } = usePlannerStore(
    useShallow((state) => ({
      tables: state.tables,
      hallDimensions: state.hall.dimensions,
      updateTablePosition: state.updateTablePosition,
    }))
  )

  const canvasTables = useMemo(
    () =>
      tables.map((table) => ({
        ...table,
        position: clampToHall(
          table.position,
          table.size,
          hallDimensions.width,
          hallDimensions.height
        ),
      })),
    [tables, hallDimensions]
  )

  function handleDragEnd(e: DragEndEvent) {
    const id = String(e.active.id)
    const table = canvasTables.find((ct) => ct.id === id)

    if (!table) return

    const next = clampToHall(
      {
        x: table.position.x + e.delta.x / ppm,
        y: table.position.y + e.delta.y / ppm,
      },
      table.size,
      hallDimensions.width,
      hallDimensions.height
    )

    updateTablePosition(id, next.x, next.y)
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div
        ref={setDropRef}
        className="absolute z-10 bg-white shadow-md ring-2 ring-emerald-400"
        style={{
          left,
          top,
          width,
          height,
          backgroundImage: `radial-gradient(circle, rgb(156 163 175 / ${zoom}) 1px, transparent 1px)`,
          // can be adjusted if we want a different grid spacing or something, but it seems to work well for now
          backgroundSize: `${ppm}px ${ppm}px`, // ppm is (scaled) pixels per meter, so this creates a grid with 1m spacing -
          // let user decide if they want to start the grid offset at half a meter or not - maybe add a toggle for it in the future
          // backgroundPosition: `${ppm / 2}px ${ppm / 2}px`,
        }}
      >
        {canvasTables.map((ct) => (
          <DraggableTable
            key={ct.id}
            table={ct}
            hallWidth={hallDimensions.width}
            hallHeight={hallDimensions.height}
            ppm={ppm}
          />
        ))}
      </div>
    </DndContext>
  )
}
