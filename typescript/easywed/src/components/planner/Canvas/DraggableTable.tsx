import { memo } from "react"
import { useDraggable } from "@dnd-kit/core"
import {
  ClipboardCopyIcon,
  CopyIcon,
  SquarePenIcon,
  Trash2Icon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { CanvasActionButton } from "./CanvasActionButton"
import { TableVisual } from "./TableVisual"
import { seatSizePx } from "./utils"
import { SEAT_OFFSET_M } from "./seatLayout"
import type { Guest, Table } from "@/stores/planner.store"
import { cn } from "@/lib/utils"

import { usePlannerStore } from "@/stores/planner.store"
import { usePanelStore } from "@/stores/panel.store"
import { useClipboardStore } from "@/stores/clipboard.store"
import { useViewStore } from "@/stores/view.store"
import { useIsMobile } from "@/hooks/useMediaQuery"

type DraggableTableProps = {
  table: Table
  guestsAssigned: number
  hallWidth: number
  hallHeight: number
  ppm: number
  seatGuests?: Array<Guest>
  showSeats?: boolean
}

const DraggableTableBase = ({
  table,
  guestsAssigned,
  hallWidth,
  hallHeight,
  ppm,
  seatGuests,
  showSeats,
}: DraggableTableProps) => {
  const { t } = useTranslation()
  const isSelected = usePanelStore((state) => state.selectedId === table.id)
  const isMobile = useIsMobile()
  // While measuring, the canvas owns the pointer: tapping a table snaps the
  // measurement to it. Keep dnd-kit out of the way so a tap can't both drag the
  // table and drop a measurement point at the same time.
  const isMeasuring = useViewStore((state) => state.isMeasuring)

  const openTableEdit = usePanelStore((state) => state.openTableEdit)
  const deselectPanel = usePanelStore((state) => state.deselect)
  const duplicateTable = usePlannerStore((state) => state.duplicateTable)
  const deleteTable = usePlannerStore((state) => state.deleteTable)
  const copyToClipboard = useClipboardStore((state) => state.copy)

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
  } = useDraggable({
    id: table.id,
    data: { type: "table-drag" },
    disabled: isMeasuring,
  })

  return (
    <TableVisual
      ref={setDragRef}
      table={table}
      guestsAssigned={guestsAssigned}
      ppm={ppm}
      transform={transform}
      hallBounds={{ width: hallWidth, height: hallHeight }}
      seatGuests={seatGuests}
      showSeats={showSeats}
      className={cn(
        "z-10 cursor-grab touch-none active:cursor-grabbing",
        isSelected && "planner-selected-glow"
      )}
      {...listeners}
      {...attributes}
    >
      {isSelected && (
        <div
          className="absolute left-1/2 flex -translate-x-1/2 gap-1"
          // The toolbar normally sits 2rem above the table. When seats are shown
          // the top row sits SEAT_OFFSET_M above the edge plus half a marker —
          // lift the toolbar by that protrusion so it clears the seat ring.
          style={{
            top: showSeats
              ? `calc(-2rem - ${SEAT_OFFSET_M * ppm + seatSizePx(ppm) / 2}px)`
              : "-2rem",
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {isMobile && (
            <CanvasActionButton
              icon={<SquarePenIcon className="size-3.5" />}
              label={t("tables.edit")}
              onClick={(e) => {
                e.stopPropagation()
                openTableEdit(table.id)
              }}
            />
          )}
          <CanvasActionButton
            icon={<ClipboardCopyIcon className="size-3.5" />}
            label={t("tables.copy")}
            onClick={(e) => {
              e.stopPropagation()
              copyToClipboard({ kind: "table", table })
            }}
          />
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

// Memoized: `HallSurface` re-renders on every pan/zoom frame, and its props
// here (memoized table objects, ppm, guest arrays) are referentially stable
// during a pan — without memo every table and its seats would reconcile per
// frame. Store subscriptions (selection, drag state) still re-render as usual.
export const DraggableTable = memo(DraggableTableBase)
