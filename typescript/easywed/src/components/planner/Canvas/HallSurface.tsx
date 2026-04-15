import { useDroppable, useDndMonitor } from "@dnd-kit/core"
import { useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { DraggableTable } from "./DraggableTable"
import { clampToHall } from "./utils"
import {
  usePlannerStore,
  type GridSpacing,
  type GridStyle,
  type SnapStep,
} from "@/stores/planner.store"

export const NICE_INTERVALS: Array<Exclude<GridSpacing, "auto">> = [
  1, 2, 5, 10, 25, 50,
]

function calcGridSpacing(
  width: number,
  height: number
): Exclude<GridSpacing, "auto"> {
  const raw = Math.max(width, height) / 6
  return NICE_INTERVALS.find((n) => n >= raw) ?? 50
}

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
  gridSpacing?: GridSpacing
  onTableClick?: (tableId: string) => void
  selectedTableId?: string | null
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
  onTableClick,
  selectedTableId,
}: HallSurfaceProps) => {
  const resolvedGridSpacing =
    gridSpacing === "auto"
      ? calcGridSpacing(width / ppm, height / ppm)
      : gridSpacing

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
          table.size,
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
            table.size,
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
    <div
      ref={setDropRef}
      data-canvas-element-kind="hall"
      className="absolute z-10 bg-white shadow-md ring-2 ring-emerald-400"
      style={{
        left,
        top,
        width,
        height,
        backgroundSize: `${ppm * resolvedGridSpacing}px ${ppm * resolvedGridSpacing}px`,
        ...gridBackground(gridStyle, zoom),
      }}
    >
      {canvasTables.map((ct) => (
        <DraggableTable
          key={ct.id}
          table={ct}
          guestsAssigned={assignedGuestsByTableId.get(ct.id) ?? 0}
          hallWidth={hallDimensions.width}
          hallHeight={hallDimensions.height}
          ppm={ppm}
          onSelect={onTableClick}
          isSelected={selectedTableId === ct.id}
          isDraggingGuest={isDraggingGuest}
        />
      ))}
    </div>
  )
}
