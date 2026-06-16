import { useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { XIcon } from "lucide-react"
import type { ReactNode, WheelEvent } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { usePlannerStore } from "@/stores/planner.store"
import { cn } from "@/lib/utils"

type SeatAssignPopoverProps = {
  tableId: string
  seatId: string
  occupantId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  // The seat marker — used as the popover trigger.
  children: ReactNode
}

// Single-seat variant of GuestAssignmentPicker: pick one guest for this seat (or
// clear it). Anchored to the seat marker on the canvas.
export const SeatAssignPopover = ({
  tableId,
  seatId,
  occupantId,
  open,
  onOpenChange,
  children,
}: SeatAssignPopoverProps) => {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const listRef = useRef<HTMLDivElement>(null)

  const guests = usePlannerStore((state) => state.guests)
  const assignGuestToSeat = usePlannerStore((state) => state.assignGuestToSeat)
  const clearSeat = usePlannerStore((state) => state.clearSeat)

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredGuests = useMemo(
    () =>
      guests
        .filter((g) => g.name.toLowerCase().includes(normalizedQuery))
        .sort((a, b) => {
          const aElsewhere = a.tableId != null && a.tableId !== tableId
          const bElsewhere = b.tableId != null && b.tableId !== tableId
          if (aElsewhere !== bElsewhere) return aElsewhere ? 1 : -1
          return a.name.localeCompare(b.name)
        }),
    [guests, normalizedQuery, tableId]
  )

  const hasGuests = guests.length > 0
  const hasFiltered = filteredGuests.length > 0

  const handleListWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (listRef.current) listRef.current.scrollTop += e.deltaY
  }

  const assign = (guestId: string) => {
    assignGuestToSeat(guestId, tableId, seatId)
    onOpenChange(false)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="center"
        side="top"
        data-no-pan
        className="max-h-80 w-64 overflow-hidden"
        onWheelCapture={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Input
          autoFocus
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("tables.guests_search_placeholder")}
          className="w-full rounded-md border"
        />

        {occupantId && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full justify-start gap-1.5 text-muted-foreground"
            onClick={() => {
              clearSeat(tableId, seatId)
              onOpenChange(false)
            }}
          >
            <XIcon className="size-3.5" />
            {t("seats.clear")}
          </Button>
        )}

        {!hasGuests && (
          <p className="text-xs text-muted-foreground">
            {t("tables.guests_none")}
          </p>
        )}

        {hasGuests && !hasFiltered && (
          <p className="text-xs text-muted-foreground">
            {t("tables.guests_no_match")}
          </p>
        )}

        {hasFiltered && (
          <div
            ref={listRef}
            className="max-h-52 space-y-1 overflow-y-auto overscroll-contain pr-1"
            onWheel={handleListWheel}
          >
            {filteredGuests.map((guest) => {
              const isOccupant = guest.id === occupantId
              const seatedElsewhere =
                guest.tableId != null && guest.tableId !== tableId
              return (
                <Button
                  key={guest.id}
                  type="button"
                  size="sm"
                  variant={isOccupant ? "default" : "outline"}
                  className={cn(
                    "w-full justify-start",
                    seatedElsewhere &&
                      "border-amber-300/80 bg-amber-50/70 text-amber-900 hover:bg-amber-100/70 dark:border-amber-700/70 dark:bg-amber-950/20 dark:text-amber-200"
                  )}
                  onClick={() => assign(guest.id)}
                >
                  <span className="truncate">{guest.name}</span>
                </Button>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
