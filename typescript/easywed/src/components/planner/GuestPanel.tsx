import { useDraggable } from "@dnd-kit/core"
import { UserPlus, Pencil, Trash2, X, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { PlannerGuest, PlannerTable } from "@/lib/planner/types"
import { DIETARY_COLORS, DIETARY_LABELS } from "@/lib/planner/types"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  guests: PlannerGuest[]
  tables: PlannerTable[]
  selectedGuestId: string | null
  onSelectGuest: (id: string | null) => void
  onAddGuest: () => void
  onEditGuest: (guest: PlannerGuest) => void
  onDeleteGuest: (id: string) => void
  onUnassign: (guestId: string) => void
  onClose: () => void
}

export function GuestPanel({
  open,
  guests,
  tables,
  selectedGuestId,
  onSelectGuest,
  onAddGuest,
  onEditGuest,
  onDeleteGuest,
  onUnassign,
  onClose,
}: Props) {
  if (!open) return null

  const unassigned = guests.filter((g) => g.tableId === null)
  const assigned = guests.filter((g) => g.tableId !== null)

  function tableNameFor(tableId: string) {
    return tables.find((t) => t.id === tableId)?.name ?? "Unknown"
  }

  return (
    <aside className="absolute top-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col border-r bg-background shadow-xl">
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-sm font-semibold">
          Guests{" "}
          <span className="font-normal text-muted-foreground">
            ({guests.length})
          </span>
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={onAddGuest}
            title="Add guest"
          >
            <UserPlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={onClose}
            title="Close panel"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {unassigned.length > 0 && (
          <>
            <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Unassigned ({unassigned.length})
            </p>
            {unassigned.map((g) => (
              <GuestRow
                key={g.id}
                guest={g}
                tableName={null}
                isSelected={selectedGuestId === g.id}
                onSelect={() =>
                  onSelectGuest(selectedGuestId === g.id ? null : g.id)
                }
                onEdit={() => onEditGuest(g)}
                onDelete={() => onDeleteGuest(g.id)}
                onUnassign={null}
              />
            ))}
          </>
        )}

        {unassigned.length > 0 && assigned.length > 0 && (
          <Separator className="my-2" />
        )}

        {assigned.length > 0 && (
          <>
            <p className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Seated ({assigned.length})
            </p>
            {assigned.map((g) => (
              <GuestRow
                key={g.id}
                guest={g}
                tableName={tableNameFor(g.tableId!)}
                isSelected={selectedGuestId === g.id}
                onSelect={() =>
                  onSelectGuest(selectedGuestId === g.id ? null : g.id)
                }
                onEdit={() => onEditGuest(g)}
                onDelete={() => onDeleteGuest(g.id)}
                onUnassign={() => onUnassign(g.id)}
              />
            ))}
          </>
        )}

        {guests.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            No guests yet.
            <br />
            <button
              className="mt-1 underline underline-offset-2"
              onClick={onAddGuest}
            >
              Add one
            </button>
          </p>
        )}
      </div>

      {selectedGuestId && (
        <div className="border-t bg-primary/5 px-3 py-2 text-[11px] font-medium text-primary">
          Tap a table to seat ·{" "}
          <button
            className="underline underline-offset-2"
            onClick={() => onSelectGuest(null)}
          >
            cancel
          </button>
        </div>
      )}
    </aside>
  )
}

function GuestRow({
  guest,
  tableName,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onUnassign,
}: {
  guest: PlannerGuest
  tableName: string | null
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onUnassign: (() => void) | null
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: guest.id,
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative flex cursor-pointer items-start gap-1 px-2 py-1.5 hover:bg-muted/60",
        isSelected && "bg-primary/10 hover:bg-primary/15",
        isDragging && "opacity-40"
      )}
    >
      <button
        className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
        aria-label="Drag to assign"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div className="min-w-0 flex-1" onClick={onSelect}>
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-xs font-medium">{guest.name}</span>
          <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
            <button
              className="rounded p-0.5 hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
            {onUnassign && (
              <button
                className="rounded p-0.5 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation()
                  onUnassign()
                }}
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
            <button
              className="rounded p-0.5 hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </button>
          </div>
        </div>
        {guest.dietary.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {guest.dietary.map((d) => (
              <span
                key={d}
                className={cn(
                  "inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  DIETARY_COLORS[d]
                )}
              >
                {DIETARY_LABELS[d]}
              </span>
            ))}
          </div>
        )}
        {tableName && (
          <span className="block text-[10px] text-muted-foreground">
            {tableName}
          </span>
        )}
        {guest.note && (
          <span className="block truncate text-[10px] text-muted-foreground italic">
            {guest.note}
          </span>
        )}
      </div>
    </div>
  )
}
