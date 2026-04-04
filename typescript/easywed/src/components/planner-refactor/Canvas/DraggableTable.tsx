import { useDraggable } from "@dnd-kit/core"
import { useMemo } from "react"
import { PlusCircleIcon } from "lucide-react"
import { CSS } from "@dnd-kit/utilities"
import { clamp } from "./utils"
import { HALL_PADDING_M, PIXELS_PER_METER } from "./consts"
import type { Table } from "@/stores/planner.store"

type DraggableTableProps = {
  table: Table
  hallWidth: number
  hallHeight: number
  scale: number
}

export const DraggableTable = ({
  table,
  hallWidth,
  hallHeight,
  scale,
}: DraggableTableProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: table.id,
  })

  const { size, shape, position } = table

  const ppm = PIXELS_PER_METER * scale

  const clampedTransform = useMemo(() => {
    if (!transform) return null

    const minX = (HALL_PADDING_M - position.x) * ppm
    const maxX = (hallWidth - size.width - HALL_PADDING_M - position.x) * ppm
    const minY = (HALL_PADDING_M - position.y) * ppm
    const maxY = (hallHeight - size.height - HALL_PADDING_M - position.y) * ppm

    return {
      ...transform,
      x: clamp(transform.x, minX, maxX),
      y: clamp(transform.y, minY, maxY),
    }
  }, [hallHeight, hallWidth, size, position, ppm, transform])

  const iconSize = clamp(
    Math.min(size.width, size.height) * ppm * 0.35,
    12,
    20
  )

  return (
    <button
      ref={setNodeRef}
      type="button"
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
      <PlusCircleIcon style={{ width: iconSize, height: iconSize }} />
    </button>
  )
}
