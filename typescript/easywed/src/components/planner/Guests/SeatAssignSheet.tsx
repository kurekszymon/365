import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { ArrowLeftIcon } from "lucide-react"
import type { Guest } from "@/stores/planner.store"
import { getInitials } from "@/lib/memberIdentity"
import { resolveSeatOccupants, seatSlotsForCapacity } from "@/lib/seats"
import { seatIndexFromId, usePlannerStore } from "@/stores/planner.store"
import { Button } from "@/components/ui/button"
import { track } from "@/lib/analytics/track"
import { cn } from "@/lib/utils"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"

type SeatAssignSheetProps = {
  // Non-null opens the sheet for this guest; the sheet's own step (table list
  // vs. seat grid) is local state, reset on close (and via the back button), so
  // each open starts on the table list.
  guest: Guest | null
  onOpenChange: (open: boolean) => void
  // Fired after a guest is actually seated (not on a plain close/cancel), so the
  // list can e.g. clear its search now that the searched-for guest is placed.
  onAssigned?: () => void
}

// Guest-first counterpart to `Canvas/SeatAssignPopover`: tap a guest row in the
// list → pick a table → pick an empty seat → confirm. Calls the same
// `assignGuestToSeat` store action so capacity/displacement semantics stay
// identical to the canvas's seat-marker flow.
export const SeatAssignSheet = ({
  guest,
  onOpenChange,
  onAssigned,
}: SeatAssignSheetProps) => {
  const { t } = useTranslation()
  const [tableId, setTableId] = useState<string | null>(null)
  const [seatId, setSeatId] = useState<string | null>(null)

  const { tables, guests, assignGuestToSeat } = usePlannerStore(
    useShallow((state) => ({
      tables: state.tables,
      guests: state.guests,
      assignGuestToSeat: state.assignGuestToSeat,
    }))
  )

  // Excludes the guest being (re)seated so their own current table isn't
  // shown as full because of the seat they're about to vacate.
  const guestCountByTable = useMemo(() => {
    const counts = new Map<string, number>()
    for (const g of guests) {
      if (!g.tableId || g.id === guest?.id) continue
      counts.set(g.tableId, (counts.get(g.tableId) ?? 0) + 1)
    }
    return counts
  }, [guests, guest?.id])

  const selectedTable = tables.find((table) => table.id === tableId) ?? null

  const seats = useMemo(
    () => (selectedTable ? seatSlotsForCapacity(selectedTable.capacity) : []),
    [selectedTable]
  )

  const occupantBySeat = useMemo(() => {
    const tableGuests = tableId
      ? guests.filter((g) => g.tableId === tableId)
      : []
    return resolveSeatOccupants(seats, tableGuests)
  }, [seats, guests, tableId])

  const reset = () => {
    setTableId(null)
    setSeatId(null)
  }

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const confirm = () => {
    if (!guest || !tableId || !seatId) return
    assignGuestToSeat(guest.id, tableId, seatId, null)
    // This sheet only offers free seats, so it can never bump an occupant.
    track("guest_seated", { source: "guest_list", displaced: false })
    onAssigned?.()
    close()
  }

  const seatIndex = seatId ? seatIndexFromId(seatId) : null

  return (
    <ResponsiveDialog
      open={guest != null}
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-sm">
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-2">
            {selectedTable && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={reset}
                aria-label={t("common.back")}
              >
                <ArrowLeftIcon className="size-4" />
              </Button>
            )}
            <ResponsiveDialogTitle>
              {selectedTable
                ? selectedTable.name.trim() ||
                  t("tables.unnamed_index", {
                    index:
                      tables.findIndex((tb) => tb.id === selectedTable.id) + 1,
                  })
                : t("guests.assign.title", { name: guest?.name ?? "" })}
            </ResponsiveDialogTitle>
          </div>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          {!selectedTable ? (
            tables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("guests.assign.no_tables")}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {tables.map((table, index) => {
                  const count = guestCountByTable.get(table.id) ?? 0
                  return (
                    <Button
                      key={table.id}
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                      disabled={count >= table.capacity}
                      onClick={() => setTableId(table.id)}
                    >
                      <span className="truncate">
                        {table.name.trim() ||
                          t("tables.unnamed_index", { index: index + 1 })}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {count}/{table.capacity}
                      </span>
                    </Button>
                  )
                })}
              </div>
            )
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {seats.map((seat, index) => {
                const occupant = occupantBySeat.get(seat.id) ?? null
                const isCurrentGuest = occupant?.id === guest?.id
                const isSelected = seatId === seat.id

                if (occupant && !isCurrentGuest) {
                  return (
                    <div
                      key={seat.id}
                      className="flex flex-col items-center gap-1 rounded-lg border bg-muted/40 px-1 py-2 text-center"
                    >
                      <span className="flex size-8 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                        {getInitials(occupant.name)}
                      </span>
                      <span className="w-full truncate text-[10px] text-muted-foreground">
                        {occupant.name}
                      </span>
                    </div>
                  )
                }

                return (
                  <button
                    key={seat.id}
                    type="button"
                    disabled={isCurrentGuest}
                    onClick={() => setSeatId(seat.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition-colors",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-dashed hover:bg-accent",
                      isCurrentGuest && "border-primary/60 bg-primary/5"
                    )}
                  >
                    <span className="flex size-8 items-center justify-center rounded-full border border-dashed text-[10px] text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="w-full truncate text-[10px] text-muted-foreground">
                      {isCurrentGuest ? t("seats.current") : t("seats.empty")}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </ResponsiveDialogBody>

        {selectedTable && (
          <ResponsiveDialogFooter>
            <Button disabled={!seatId} onClick={confirm} className="w-full">
              {seatId && seatIndex != null
                ? t("seats.assign_at", { n: seatIndex + 1 })
                : t("guests.assign.pick_seat")}
            </Button>
          </ResponsiveDialogFooter>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
