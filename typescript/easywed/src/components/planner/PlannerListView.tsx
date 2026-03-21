import { Pencil, Trash2, X } from "lucide-react"
import type { PlannerGuest, PlannerTable } from "@/lib/planner/types"
import { DIETARY_COLORS, DIETARY_LABELS } from "@/lib/planner/types"
import { cn } from "@/lib/utils"

interface Props {
  tables: PlannerTable[]
  guests: PlannerGuest[]
  onEditTable: (table: PlannerTable) => void
  onDeleteTable: (id: string) => void
  onUnassignGuest: (guestId: string) => void
  onEditGuest: (guest: PlannerGuest) => void
  onDeleteGuest: (id: string) => void
}

export function PlannerListView({
  tables,
  guests,
  onEditTable,
  onDeleteTable,
  onUnassignGuest,
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
                    <li
                      key={g.id}
                      className="group flex items-center gap-2 px-4 py-2"
                    >
                      <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
                        {i + 1}.
                      </span>
                      <span className="flex-1 truncate text-sm">{g.name}</span>
                      {g.dietary !== "none" && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            DIETARY_COLORS[g.dietary]
                          )}
                        >
                          {DIETARY_LABELS[g.dietary]}
                        </span>
                      )}
                      <div className="hidden items-center gap-1 group-hover:flex">
                        <button
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                          onClick={() => onEditGuest(g)}
                          aria-label="Edit guest"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                          onClick={() => onUnassignGuest(g.id)}
                          aria-label="Unassign guest"
                        >
                          <X className="h-3 w-3" />
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
                <li
                  key={g.id}
                  className="group flex items-center gap-2 px-4 py-2"
                >
                  <span className="flex-1 truncate text-sm">{g.name}</span>
                  {g.dietary !== "none" && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        DIETARY_COLORS[g.dietary]
                      )}
                    >
                      {DIETARY_LABELS[g.dietary]}
                    </span>
                  )}
                  <div className="hidden items-center gap-1 group-hover:flex">
                    <button
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                      onClick={() => onEditGuest(g)}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      className="rounded p-0.5 text-destructive hover:bg-destructive/10"
                      onClick={() => onDeleteGuest(g.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </li>
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
