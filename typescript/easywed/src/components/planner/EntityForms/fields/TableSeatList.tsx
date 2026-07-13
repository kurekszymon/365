import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { InfoIcon } from "lucide-react"
import { getInitials } from "../../Canvas/utils"
import { SeatAssignPopover } from "../../Canvas/SeatAssignPopover"
import {
  resolveSeatOccupants,
  seatSlotsForCapacity,
} from "../../Canvas/seatLayout"
import { usePlannerStore } from "@/stores/planner.store"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type TableSeatListProps = {
  tableId: string
  capacity: number
  // When true (desktop dialog), fill the available height and scroll only the
  // seat rows, keeping the title pinned. Off = natural flow (mobile drawer).
  fillHeight?: boolean
}

// Numbered seat list for the table edit form's "Szczegóły stołu" sub-view.
// Reuses `SeatAssignPopover` per seat (same search/clear/displacement logic as
// the canvas's seat markers) rather than a third assign UI. Seat ids are
// order-based only (no geometry), so this also works for `custom` polygon
// tables, which have no auto seat layout on the canvas.
export const TableSeatList = ({
  tableId,
  capacity,
  fillHeight = false,
}: TableSeatListProps) => {
  const { t } = useTranslation()
  const [openSeatId, setOpenSeatId] = useState<string | null>(null)
  const guests = usePlannerStore((state) => state.guests)

  const tableGuests = useMemo(
    () => guests.filter((g) => g.tableId === tableId),
    [guests, tableId]
  )

  const placed = useMemo(() => seatSlotsForCapacity(capacity), [capacity])
  const occupantBySeat = resolveSeatOccupants(placed, tableGuests)

  if (capacity <= 0) return null

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        fillHeight && "@xl:min-h-0 @xl:flex-1"
      )}
    >
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium">{t("tables.seat_list_title")}</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center text-muted-foreground">
              <InfoIcon className="size-3.5" aria-hidden />
              <span className="sr-only">{t("tables.seat_order_hint")}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-64">
            {t("tables.seat_order_hint")}
          </TooltipContent>
        </Tooltip>
      </div>
      <div
        className={cn(
          "flex flex-col gap-1.5",
          fillHeight && "@xl:min-h-0 @xl:flex-1 @xl:overflow-y-auto @xl:pr-1"
        )}
      >
        {placed.map((seat, index) => {
          const guest = occupantBySeat.get(seat.id) ?? null
          return (
            <div
              key={seat.id}
              className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5"
            >
              <span className="text-sm text-muted-foreground">
                {t("seats.numbered", { n: index + 1 })}
              </span>
              <SeatAssignPopover
                tableId={tableId}
                seatId={seat.id}
                occupantId={guest?.id ?? null}
                open={openSeatId === seat.id}
                onOpenChange={(o) => setOpenSeatId(o ? seat.id : null)}
              >
                {guest ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                  >
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {getInitials(guest.name)}
                    </span>
                    <span className="max-w-32 truncate">{guest.name}</span>
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm">
                    {t("tables.seat_assign_button")}
                  </Button>
                )}
              </SeatAssignPopover>
            </div>
          )
        })}
      </div>
    </div>
  )
}
