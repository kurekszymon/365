import { useDraggable, useDroppable } from "@dnd-kit/core"
import { useCallback, useMemo } from "react"
import { CSS } from "@dnd-kit/utilities"
import { CopyIcon, Trash2Icon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { clamp } from "./utils"
import { cn } from "@/lib/utils"

import { usePlannerStore, type Table } from "@/stores/planner.store"
import { usePanelStore, selectSelectedTableId } from "@/stores/panel.store"
import { CanvasActionButton } from "./CanvasActionButton"

type DraggableTableProps = {
  table: Table
  guestsAssigned: number
  hallWidth: number
  hallHeight: number
  ppm: number
  isDraggingGuest?: boolean
}

export const DraggableTable = ({
  table,
  guestsAssigned,
  hallWidth,
  hallHeight,
  ppm,
  isDraggingGuest,
}: DraggableTableProps) => {
  const { t } = useTranslation()
  const isSelected = usePanelStore(
    (state) => selectSelectedTableId(state) === table.id
  )

  const openTableEdit = usePanelStore((state) => state.openTableEdit)
  const closePanel = usePanelStore((state) => state.close)
  const duplicateTable = usePlannerStore((state) => state.duplicateTable)
  const deleteTable = usePlannerStore((state) => state.deleteTable)

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
  const hasName = table.name.trim().length > 0
  const guestCountLabel = `${guestsAssigned} / ${table.capacity}`
  const ariaLabel = hasName
    ? `${table.name} — ${guestCountLabel}`
    : guestCountLabel

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
      aria-label={ariaLabel}
      {...listeners}
      {...attributes}
    >
      <div className="flex max-w-full flex-col items-center justify-center px-1 leading-tight">
        {hasName && (
          <span className="max-w-full truncate text-xs font-medium">
            {table.name}
          </span>
        )}
        <span className="max-w-full truncate text-[10px] text-emerald-700">
          {guestCountLabel}
        </span>
      </div>

      {isSelected && (
        <div
          className="absolute -top-8 right-0 flex gap-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <CanvasActionButton
            icon={<CopyIcon className="size-3.5" />}
            label={t("tables.duplicate")}
            onClick={(e) => {
              e.stopPropagation()
              const newId = duplicateTable(table.id)
              if (newId) openTableEdit(newId)
            }}
          />
          <CanvasActionButton
            icon={<Trash2Icon className="size-3.5" />}
            label={t("tables.delete")}
            variant="danger"
            onClick={(e) => {
              e.stopPropagation()
              deleteTable(table.id)
              closePanel()
            }}
          />
        </div>
      )}
    </div>
  )
}
