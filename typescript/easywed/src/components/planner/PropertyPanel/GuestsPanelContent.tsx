import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { usePlannerStore } from "@/stores/planner.store"
import { useDialogStore } from "@/stores/dialog.store"
import type { Guest, Table } from "@/stores/planner.store"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const UNASSIGNED_ID = "__unassigned__"

// — Draggable guest row —

const DraggableGuest = ({ guest }: { guest: Guest }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: guest.id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
          : undefined
      }
    >
      <span className="flex-1 truncate">{guest.name}</span>
      {guest.dietary.length > 0 && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {guest.dietary.join(", ")}
        </span>
      )}
    </div>
  )
}

// — Droppable table section —

const TableSection = ({
  droppableId,
  label,
  guests,
  isOver,
}: {
  droppableId: string
  label: string
  guests: Array<Guest>
  isOver: boolean
}) => {
  const { setNodeRef } = useDroppable({ id: droppableId })

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-10 rounded-md border-2 border-dashed p-1.5 transition-colors",
          isOver
            ? "border-emerald-400 bg-emerald-50"
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

// — Main component —

export const GuestsPanelContent = () => {
  const { t } = useTranslation()

  const { guests, tables, assignGuestToTable } = usePlannerStore(
    useShallow((state) => ({
      guests: state.guests,
      tables: state.tables,
      assignGuestToTable: state.assignGuestToTable,
    }))
  )

  const openDialog = useDialogStore((state) => state.open)

  const [activeGuestId, setActiveGuestId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const activeGuest = useMemo(
    () => guests.find((g) => g.id === activeGuestId) ?? null,
    [guests, activeGuestId]
  )

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

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveGuestId(String(active.id))
  }

  const handleDragOver = ({ over }: { over: { id: string | number } | null }) => {
    setOverId(over ? String(over.id) : null)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveGuestId(null)
    setOverId(null)
    if (!over) return
    const targetTableId =
      String(over.id) === UNASSIGNED_ID ? null : String(over.id)
    assignGuestToTable(String(active.id), targetTableId)
  }

  if (guests.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t("guests.none")}</p>
        <Button variant="outline" onClick={() => openDialog("Guest.Add")}>
          {t("guests.add")}
        </Button>
      </div>
    )
  }

  const sections: Array<{ id: string | null; label: string; table?: Table }> =
    [
      { id: null, label: t("guests.unassigned") },
      ...tables.map((table) => ({
        id: table.id,
        label: `${table.name} (${t("tables.capacity_count", { count: table.capacity })})`,
        table,
      })),
    ]

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-4">
        <Button variant="outline" onClick={() => openDialog("Guest.Add")}>
          {t("guests.add")}
        </Button>
        {sections.map((section) => {
          const droppableId = section.id ?? UNASSIGNED_ID
          const sectionGuests = guestsByTable.get(section.id) ?? []
          return (
            <TableSection
              key={droppableId}
              droppableId={droppableId}
              label={section.label}
              guests={sectionGuests}
              isOver={overId === droppableId}
            />
          )
        })}
      </div>

      <DragOverlay>
        {activeGuest && (
          <div className="flex cursor-grabbing items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-lg">
            <span className="flex-1 truncate">{activeGuest.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
