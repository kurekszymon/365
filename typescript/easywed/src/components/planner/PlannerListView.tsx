import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import type { PlannerGuest, PlannerTable } from "@/lib/planner/types"
import { DIETARY_COLORS, DIETARY_LABELS } from "@/lib/planner/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface Props {
  tables: PlannerTable[]
  guests: PlannerGuest[]
  onEditTable: (table: PlannerTable) => void
  onDeleteTable: (id: string) => void
  onAssignGuest: (guestId: string, tableId: string | null) => void
  onEditGuest: (guest: PlannerGuest) => void
  onDeleteGuest: (id: string) => void
}

function DietaryBadges({ dietary }: { dietary: PlannerGuest["dietary"] }) {
  if (dietary.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {dietary.map((d) => (
        <span
          key={d}
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            DIETARY_COLORS[d]
          )}
        >
          {DIETARY_LABELS[d]}
        </span>
      ))}
    </div>
  )
}

interface SeatedGuestRowProps {
  g: PlannerGuest
  index: number
  tables: PlannerTable[]
  guests: PlannerGuest[]
  onAssignGuest: (guestId: string, tableId: string | null) => void
  onEditGuest: (guest: PlannerGuest) => void
  onDeleteGuest: (id: string) => void
}

function SeatedGuestRow({
  g,
  index,
  tables,
  guests,
  onAssignGuest,
  onEditGuest,
  onDeleteGuest,
}: SeatedGuestRowProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <li className="group flex items-center gap-2 px-4 py-2">
      <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
        {index + 1}.
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm">{g.name}</span>
        <DietaryBadges dietary={g.dietary} />
      </div>
      <Select
        value={g.tableId ?? ""}
        onValueChange={(val) =>
          onAssignGuest(g.id, val === "unassign" ? null : val)
        }
        onOpenChange={setDropdownOpen}
      >
        <SelectTrigger className="h-7 w-32 shrink-0 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {tables.map((t) => {
            const seatedCount = guests.filter((x) => x.tableId === t.id).length
            const full = seatedCount >= t.capacity && t.id !== g.tableId
            return (
              <SelectItem key={t.id} value={t.id} disabled={full}>
                {t.name}
                {full ? " (full)" : ""}
              </SelectItem>
            )
          })}
          <SelectItem value="unassign" className="text-muted-foreground">
            Unassign
          </SelectItem>
        </SelectContent>
      </Select>
      <div
        className={cn(
          "flex items-center gap-1 transition-opacity",
          dropdownOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
        )}
      >
        <button
          className="rounded p-0.5 text-muted-foreground hover:bg-muted"
          onClick={() => onEditGuest(g)}
          aria-label="Edit guest"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          className="rounded p-0.5 text-destructive hover:bg-destructive/10"
          onClick={() => onDeleteGuest(g.id)}
          aria-label="Delete guest"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </li>
  )
}

interface UnassignedGuestRowProps {
  g: PlannerGuest
  tables: PlannerTable[]
  guests: PlannerGuest[]
  onAssignGuest: (guestId: string, tableId: string | null) => void
  onEditGuest: (guest: PlannerGuest) => void
  onDeleteGuest: (id: string) => void
}

function UnassignedGuestRow({
  g,
  tables,
  guests,
  onAssignGuest,
  onEditGuest,
  onDeleteGuest,
}: UnassignedGuestRowProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <li className="group flex items-center gap-2 px-4 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm">{g.name}</span>
        <DietaryBadges dietary={g.dietary} />
      </div>
      <Select
        value=""
        onValueChange={(val) => onAssignGuest(g.id, val)}
        onOpenChange={setDropdownOpen}
      >
        <SelectTrigger className="h-7 w-32 shrink-0 text-xs text-muted-foreground">
          <SelectValue placeholder="Assign…" />
        </SelectTrigger>
        <SelectContent>
          {tables.map((t) => {
            const seatedCount = guests.filter((x) => x.tableId === t.id).length
            const full = seatedCount >= t.capacity
            return (
              <SelectItem key={t.id} value={t.id} disabled={full}>
                {t.name}
                {full ? " (full)" : ""}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
      <div
        className={cn(
          "flex items-center gap-1 transition-opacity",
          dropdownOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
        )}
      >
        <button
          className="rounded p-0.5 text-muted-foreground hover:bg-muted"
          onClick={() => onEditGuest(g)}
          aria-label="Edit guest"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          className="rounded p-0.5 text-destructive hover:bg-destructive/10"
          onClick={() => onDeleteGuest(g.id)}
          aria-label="Delete guest"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </li>
  )
}

export function PlannerListView({
  tables,
  guests,
  onEditTable,
  onDeleteTable,
  onAssignGuest,
  onEditGuest,
  onDeleteGuest,
}: Props) {
  const unassigned = guests.filter((g) => g.tableId === null)

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-3">
        {tables.map((table) => {
          const tableGuests = guests.filter((g) => g.tableId === table.id)
          const isFull = tableGuests.length >= table.capacity
          return (
            <div
              key={table.id}
              className="rounded-xl border bg-white shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-semibold">{table.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground capitalize">
                    {table.shape}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-medium tabular-nums",
                      isFull ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {tableGuests.length}/{table.capacity}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => onEditTable(table)}
                    aria-label="Edit table"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onDeleteTable(table.id)}
                    aria-label="Delete table"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {tableGuests.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground italic">
                  No guests assigned
                </p>
              ) : (
                <ul className="divide-y">
                  {tableGuests.map((g, i) => (
                    <SeatedGuestRow
                      key={g.id}
                      g={g}
                      index={i}
                      tables={tables}
                      guests={guests}
                      onAssignGuest={onAssignGuest}
                      onEditGuest={onEditGuest}
                      onDeleteGuest={onDeleteGuest}
                    />
                  ))}
                </ul>
              )}
            </div>
          )
        })}

        {/* Unassigned */}
        {unassigned.length > 0 && (
          <div className="rounded-xl border border-dashed bg-muted/20 shadow-sm">
            <div className="border-b px-4 py-2.5">
              <span className="font-semibold text-muted-foreground">
                Unassigned ({unassigned.length})
              </span>
            </div>
            <ul className="divide-y">
              {unassigned.map((g) => (
                <UnassignedGuestRow
                  key={g.id}
                  g={g}
                  tables={tables}
                  guests={guests}
                  onAssignGuest={onAssignGuest}
                  onEditGuest={onEditGuest}
                  onDeleteGuest={onDeleteGuest}
                />
              ))}
            </ul>
          </div>
        )}

        {tables.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No tables yet. Add one from the toolbar above.
          </p>
        )}
      </div>
    </div>
  )
}
