import { useDraggable, useDroppable } from "@dnd-kit/core"
import { useCallback } from "react"
import { CopyIcon, Trash2Icon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { CanvasActionButton } from "./CanvasActionButton"
import { TableVisual } from "./TableVisual"
import type { Table } from "@/stores/planner.store"
import { cn } from "@/lib/utils"

import { usePlannerStore } from "@/stores/planner.store"
import { selectSelectedTableId, usePanelStore } from "@/stores/panel.store"

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
  const deselectPanel = usePanelStore((state) => state.deselect)
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

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      setDragRef(el)
      setDropRef(el)
    },
    [setDragRef, setDropRef]
  )

  return (
    <TableVisual
      ref={setRef}
      table={table}
      guestsAssigned={guestsAssigned}
      ppm={ppm}
      transform={transform}
      hallBounds={{ width: hallWidth, height: hallHeight }}
      className={cn(
        "z-10 cursor-grab touch-none shadow-sm active:cursor-grabbing",
        isSelected && "ring-2 ring-emerald-600 ring-offset-2",
        isDraggingGuest &&
          isOver &&
          "border-blue-300 bg-blue-50 ring-2 ring-blue-500 ring-offset-2"
      )}
      {...listeners}
      {...attributes}
    >
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
              deselectPanel()
            }}
          />
        </div>
      )}
    </TableVisual>
  )
}
