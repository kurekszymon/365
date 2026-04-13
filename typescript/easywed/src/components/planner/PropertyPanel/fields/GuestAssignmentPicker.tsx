import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { useRef, useState } from "react"
import type { WheelEvent } from "react"
import { usePlannerStore } from "@/stores/planner.store"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"

type GuestAssignmentPickerProps = {
  capacity: number
  assignedGuestIds: Array<string>
  onAssignedGuestIdsChange: (ids: Array<string>) => void
}

export const GuestAssignmentPicker = ({
  capacity,
  assignedGuestIds,
  onAssignedGuestIdsChange,
}: GuestAssignmentPickerProps) => {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")

  const planner = usePlannerStore(
    useShallow((state) => ({
      guests: state.guests,
    }))
  )

  const assignedGuestIdsWithinCapacity = assignedGuestIds.slice(0, capacity)
  const selectedGuestNames = planner.guests
    .filter((guest) => assignedGuestIdsWithinCapacity.includes(guest.id))
    .map((guest) => guest.name)

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const filteredGuests = planner.guests.filter((guest) =>
    guest.name.toLowerCase().includes(normalizedSearchQuery)
  )
  const hasGuests = planner.guests.length > 0
  const hasFilteredGuests = filteredGuests.length > 0
  const hasReachedCapacity = assignedGuestIdsWithinCapacity.length >= capacity
  const selectedGuestsValue = selectedGuestNames.join(", ")
  const guestsListRef = useRef<HTMLDivElement>(null)

  const handleGuestListWheel = (e: WheelEvent<HTMLDivElement>) => {
    // Explicit wheel handling prevents underlying canvas from hijacking trackpad scroll.
    e.preventDefault()
    e.stopPropagation()

    const listElement = guestsListRef.current
    if (!listElement) return

    listElement.scrollTop += e.deltaY
  }

  const toggleGuest = (guestId: string) => {
    if (assignedGuestIdsWithinCapacity.includes(guestId)) {
      onAssignedGuestIdsChange(
        assignedGuestIdsWithinCapacity.filter((id) => id !== guestId)
      )
      return
    }

    if (assignedGuestIdsWithinCapacity.length >= capacity) {
      onAssignedGuestIdsChange(assignedGuestIdsWithinCapacity)
      return
    }

    onAssignedGuestIdsChange([...assignedGuestIdsWithinCapacity, guestId])
  }

  return (
    <Field>
      <FieldLabel>{t("tables.guests")}</FieldLabel>
      <FieldContent>
        <Popover>
          <PopoverTrigger asChild>
            <Input
              readOnly
              value={selectedGuestsValue}
              placeholder={t("tables.guests_pick")}
              className="w-full cursor-pointer rounded-md border"
            />
          </PopoverTrigger>
          <PopoverContent
            className="max-h-80 w-(--radix-popover-trigger-width) overflow-hidden"
            onWheelCapture={(e) => e.stopPropagation()}
          >
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("tables.guests_search_placeholder")}
              className="w-full rounded-md border"
            />

            {hasReachedCapacity && (
              <p className="text-xs text-amber-700">
                {t("tables.guests_capacity_reached")}
              </p>
            )}

            {!hasGuests && (
              <p className="text-xs text-muted-foreground">
                {t("tables.guests_none")}
              </p>
            )}

            {hasGuests && !hasFilteredGuests && (
              <p className="text-xs text-muted-foreground">
                {t("tables.guests_no_match")}
              </p>
            )}

            {hasFilteredGuests && (
              <div
                ref={guestsListRef}
                className="max-h-52 space-y-1 overflow-y-auto overscroll-contain pr-1"
                onWheel={handleGuestListWheel}
              >
                {filteredGuests.map((guest) => {
                  const isSelected = assignedGuestIdsWithinCapacity.includes(
                    guest.id
                  )
                  const isDisabled = hasReachedCapacity && !isSelected

                  return (
                    <Button
                      key={guest.id}
                      type="button"
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      className="w-full justify-start"
                      disabled={isDisabled}
                      onClick={() => {
                        toggleGuest(guest.id)
                      }}
                    >
                      {guest.name}
                    </Button>
                  )
                })}
              </div>
            )}
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">
          {t("tables.guests_selected_of_capacity", {
            count: assignedGuestIdsWithinCapacity.length,
            capacity,
          })}
        </p>
      </FieldContent>
    </Field>
  )
}
