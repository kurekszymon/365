import { useDraggable } from "@dnd-kit/core"
import { useMemo } from "react"
import { CSS } from "@dnd-kit/utilities"
import { clamp } from "./utils"
import type { Table } from "@/stores/planner.store"

type DraggableTableProps = {
  table: Table
  hallWidth: number
  hallHeight: number
  ppm: number
}

export const DraggableTable = ({
  table,
  hallWidth,
  hallHeight,
  ppm,
}: DraggableTableProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: table.id,
  })

  const { size, shape, position } = table

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

  return (
    // TODO: use Button?
    <button
      ref={setNodeRef}
      type="button"
      data-canvas-element-kind="table"
      data-canvas-element-id={table.id}
      className={`absolute z-10 flex cursor-grab touch-none items-center justify-center border border-emerald-300 bg-emerald-100 text-emerald-800 shadow-sm active:cursor-grabbing ${
        shape === "round" ? "rounded-full" : "rounded-lg"
      }`}
      style={{
        left: position.x * ppm,
        top: position.y * ppm,
        width: size.width * ppm,
        height: (shape === "round" ? size.width : size.height) * ppm,
        transform: clampedTransform
          ? CSS.Translate.toString(clampedTransform)
          : undefined,
      }}
      aria-label={table.name}
      {...listeners}
      {...attributes}
    >
      {table.capacity}
    </button>
  )
}
