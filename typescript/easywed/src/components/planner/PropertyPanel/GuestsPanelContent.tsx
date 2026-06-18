import { useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import {
  DragOverlay,
  useDndMonitor,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { FileSpreadsheetIcon, GripVerticalIcon, PlusIcon } from "lucide-react"
import type { Guest } from "@/stores/planner.store"
import { usePlannerStore } from "@/stores/planner.store"
import { useDialogStore } from "@/stores/dialog.store"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const DraggableGuest = ({ guest }: { guest: Guest }) => {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: guest.id, data: { type: "guest" } })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background py-2 pr-3 pl-1 text-sm",
        isDragging && "opacity-40"
      )}
      style={
        !isDragging && transform
          ? { transform: CSS.Translate.toString(transform) }
          : undefined
      }
    >
      {/* Drag handle — listeners live here (not the whole row) so the list can
          still be scrolled by swiping over a guest in the mobile bottom sheet. */}
      <button
        type="button"
        data-vaul-no-drag
        aria-label={t("guests.drag")}
        className="shrink-0 cursor-grab touch-none px-1 text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <span className="flex-1 truncate">{guest.name}</span>
      {guest.dietary.length > 0 && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {guest.dietary.join(", ")}
        </span>
      )}
    </div>
  )
}

const TableSection = ({
  droppableId,
  droppableData,
  label,
  guests,
  isOver,
}: {
  droppableId: string
  droppableData: Record<string, unknown>
  label: string
  guests: Array<Guest>
  isOver: boolean
}) => {
  const { setNodeRef } = useDroppable({ id: droppableId, data: droppableData })

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-10 rounded-md border-2 border-dashed p-1.5 transition-colors",
          isOver
            ? "border-planner-hall bg-planner-soft"
            : "border-transparent bg-muted/40"
        )}
      >
        {guests.length === 0 ? (
          <p className="flex h-7 items-center justify-center text-xs text-muted-foreground/60">
            —
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {guests.map((g) => (
              <DraggableGuest key={g.id} guest={g} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export const GuestsPanelContent = () => {
  const { t } = useTranslation()

  const { guests, tables } = usePlannerStore(
    useShallow((state) => ({
      guests: state.guests,
      tables: state.tables,
    }))
  )

  const openDialog = useDialogStore((state) => state.open)

  const [activeGuestId, setActiveGuestId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const activeGuest = useMemo(
    () => guests.find((g) => g.id === activeGuestId) ?? null,
    [guests, activeGuestId]
  )

  useDndMonitor({
    onDragStart: ({ active }) => {
      if (active.data.current?.type === "guest") {
        setActiveGuestId(String(active.id))
      }
    },
    onDragOver: ({ active, over }) => {
      if (active.data.current?.type === "guest") {
        setOverId(over ? String(over.id) : null)
      }
    },
    onDragEnd: ({ active }) => {
      if (active.data.current?.type === "guest") {
        setActiveGuestId(null)
        setOverId(null)
      }
    },
    onDragCancel: ({ active }) => {
      if (active.data.current?.type === "guest") {
        setActiveGuestId(null)
        setOverId(null)
      }
    },
  })

  const guestsByTable = useMemo(() => {
    const map = new Map<string | null, Array<Guest>>()
    map.set(null, [])
    for (const table of tables) map.set(table.id, [])
    for (const guest of guests) {
      const key = guest.tableId && map.has(guest.tableId) ? guest.tableId : null
      map.get(key)!.push(guest)
    }
    return map
  }, [guests, tables])

  if (guests.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t("guests.none")}</p>
        <Button variant="outline" onClick={() => openDialog("Guest.Add")}>
          <PlusIcon />
          {t("guests.add")}
        </Button>
        <Button variant="outline" onClick={() => openDialog("Guest.Import")}>
          <FileSpreadsheetIcon />
          {t("guests.import")}
        </Button>
      </div>
    )
  }

  const sections: Array<{ id: string | null; label: string }> = [
    { id: null, label: t("guests.unassigned") },
    ...tables.map((table) => ({
      id: table.id,
      label:
        table.name.trim() ||
        `${(guestsByTable.get(table.id) ?? []).length} / ${table.capacity}`,
    })),
  ]

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* The before/after bands extend the background 1rem up and down so the
            scroll container's top padding and the gap-4 below don't let guest
            rows peek through as they scroll under the sticky buttons. */}
        <div className="sticky top-0 z-10 flex flex-col gap-2 bg-background before:pointer-events-none before:absolute before:inset-x-0 before:-top-4 before:h-4 before:bg-background after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-4 after:h-4 after:bg-background">
          <Button variant="outline" onClick={() => openDialog("Guest.Add")}>
            <PlusIcon />
            {t("guests.add")}
          </Button>
          <Button variant="outline" onClick={() => openDialog("Guest.Import")}>
            <FileSpreadsheetIcon />
            {t("guests.import")}
          </Button>
        </div>
        {sections.map((section) => {
          const droppableId =
            section.id !== null
              ? `guest-drop-table-${section.id}`
              : "guest-drop-unassigned"
          const droppableData =
            section.id === null
              ? { type: "unassigned" }
              : { type: "table", tableId: section.id }
          const sectionGuests = guestsByTable.get(section.id) ?? []
          return (
            <TableSection
              key={droppableId}
              droppableId={droppableId}
              droppableData={droppableData}
              label={section.label}
              guests={sectionGuests}
              isOver={overId === droppableId}
            />
          )
        })}
      </div>

      {createPortal(
        // Portal to body so the overlay's position:fixed is relative to the
        //  viewport, not the vaul drawer's transform on mobile (which otherwise
        // offsets the drag preview from the finger).
        <DragOverlay>
          {activeGuest && (
            <div className="flex cursor-grabbing items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-lg">
              <span className="flex-1 truncate">{activeGuest.name}</span>
            </div>
          )}
        </DragOverlay>,
        document.body
      )}
    </>
  )
}
