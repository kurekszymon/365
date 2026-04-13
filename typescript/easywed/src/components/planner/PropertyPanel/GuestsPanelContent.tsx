import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import {
  DragOverlay,
  useDroppable,
  useDraggable,
  useDndMonitor,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { usePlannerStore } from "@/stores/planner.store"
import { useDialogStore } from "@/stores/dialog.store"
import type { Guest } from "@/stores/planner.store"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const UNASSIGNED_ID = "__unassigned__"

// — Draggable guest row —

const DraggableGuest = ({ guest }: { guest: Guest }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: guest.id, data: { type: "guest" } })

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
        !isDragging && transform
          ? { transform: CSS.Translate.toString(transform) }
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

  // Monitor the shared DndContext created in Planner.tsx for local visual state
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
          {t("guests.add")}
        </Button>
      </div>
    )
  }

  const sections: Array<{ id: string | null; label: string }> = [
    { id: null, label: t("guests.unassigned") },
    ...tables.map((table) => ({
      id: table.id,
      label: `${table.name} (${t("tables.capacity_count", { count: table.capacity })})`,
    })),
  ]

  return (
    <>
      <div className="flex flex-col gap-4">
        <Button variant="outline" onClick={() => openDialog("Guest.Add")}>
          {t("guests.add")}
        </Button>
        {sections.map((section) => {
          const droppableId = section.id ?? UNASSIGNED_ID
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

      {/* DragOverlay renders at pointer position (portal to body), guest name follows cursor */}
      <DragOverlay>
        {activeGuest && (
          <div className="flex cursor-grabbing items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-lg">
            <span className="flex-1 truncate">{activeGuest.name}</span>
          </div>
        )}
      </DragOverlay>
    </>
  )
}
