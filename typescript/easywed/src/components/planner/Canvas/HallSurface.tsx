import { DndContext, useDroppable } from "@dnd-kit/core"
import { useMemo } from "react"
import { useShallow } from "zustand/react/shallow"
import { DraggableTable } from "./DraggableTable"
import { clampToHall } from "./utils"
import { usePlannerStore } from "@/stores/planner.store"
import type { DragEndEvent } from "@dnd-kit/core"

export type GridStyle = "dots" | "grid" | "off"
export type SnapStep = 0.1 | 0.25 | 0.5 | 1 | "off"

function gridBackground(style: GridStyle, zoom: number): React.CSSProperties {
  const color = `rgb(156 163 175 / ${zoom})`
  if (style === "dots")
    return {
      backgroundImage: `radial-gradient(circle, ${color} 1px, transparent 1px)`,
    }
  if (style === "grid")
    return {
      backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
      backgroundPosition: "-0.5px -0.5px",
    }
  return {}
}

function snap(value: number, step: number) {
  return Math.round(value / step) * step
}

function snapPositionToGrid(position: { x: number; y: number }, step: number) {
  return {
    x: snap(position.x, step),
    y: snap(position.y, step),
  }
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

    const rawNext = {
      x: table.position.x + e.delta.x / ppm,
      y: table.position.y + e.delta.y / ppm,
    }

    const snappedNext =
      snapStep === "off" ? rawNext : snapPositionToGrid(rawNext, snapStep)

    const next = clampToHall(
      snappedNext,
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
          backgroundSize: `${ppm}px ${ppm}px`, // ppm is (scaled) pixels per meter, so this creates a grid with 1m spacing -
          // let user decide if they want to start the grid offset at half a meter or not - maybe add a toggle for it in the future
          // backgroundPosition: `${ppm / 2}px ${ppm / 2}px`,
          ...gridBackground(gridStyle, zoom),
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
