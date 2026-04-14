import { useDraggable, useDroppable } from "@dnd-kit/core"
import { useCallback, useMemo } from "react"
import { CSS } from "@dnd-kit/utilities"
import { clamp } from "./utils"
import { cn } from "@/lib/utils"
import type { Table } from "@/stores/planner.store"

type DraggableTableProps = {
  table: Table
  guestsAssigned: number
  hallWidth: number
  hallHeight: number
  ppm: number
  onSelect?: (tableId: string) => void
  isSelected?: boolean
  isDraggingGuest?: boolean
}

export const DraggableTable = ({
  table,
  guestsAssigned,
  hallWidth,
  hallHeight,
  ppm,
  onSelect,
  isSelected,
  isDraggingGuest,
}: DraggableTableProps) => {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
  } = useDraggable({
    id: table.id,
    data: { type: "table-drag" },
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `table-drop-${table.id}`,
    data: { type: "table", tableId: table.id },
  })

  const { size, shape, position } = table
  const tableLabel =
    table.name.trim() || `${guestsAssigned} / ${table.capacity}`

  const clampedTransform = useMemo(() => {
    if (!transform) return null

    const minX = -position.x * ppm
    const maxX = (hallWidth - size.width - position.x) * ppm
    const minY = -position.y * ppm
    const maxY = (hallHeight - size.height - position.y) * ppm

    return {
      ...transform,
      x: clamp(transform.x, minX, maxX),
      y: clamp(transform.y, minY, maxY),
    }
  }, [hallHeight, hallWidth, size, position, ppm, transform])

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      setDragRef(el)
      setDropRef(el)
    },
    [setDragRef, setDropRef]
  )

  return (
    <div
      ref={setRef}
      data-canvas-element-kind="table"
      data-canvas-element-id={table.id}
      className={cn(
        "absolute z-10 flex cursor-grab touch-none items-center justify-center border border-emerald-300 bg-emerald-100 text-emerald-800 shadow-sm active:cursor-grabbing",
        shape === "round" ? "rounded-full" : "rounded-lg",
        isSelected && "ring-2 ring-emerald-600 ring-offset-2",
        isDraggingGuest &&
          isOver &&
          "border-blue-300 bg-blue-50 ring-2 ring-blue-500 ring-offset-2"
      )}
      style={{
        left: position.x * ppm,
        top: position.y * ppm,
        width: size.width * ppm,
        height: (shape === "round" ? size.width : size.height) * ppm,
        transform: clampedTransform
          ? CSS.Translate.toString(clampedTransform)
          : undefined,
      }}
      aria-label={tableLabel}
      onClick={() => onSelect?.(table.id)}
      {...listeners}
      {...attributes}
    >
      <span className="max-w-full truncate px-1 text-xs font-medium">
        {tableLabel}
      </span>
    </div>
  )
}
