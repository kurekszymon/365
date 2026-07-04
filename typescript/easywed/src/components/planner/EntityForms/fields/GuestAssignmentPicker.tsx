import { useTranslation } from "react-i18next"
import { InfoIcon } from "lucide-react"
import { useMemo, useRef, useState } from "react"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type GuestAssignmentPickerProps = {
  tableId: string | null
  capacity: number
  assignedGuestIds: Array<string>
  onAssignedGuestIdsChange: (ids: Array<string>) => void
}

export const GuestAssignmentPicker = ({
  tableId,
  capacity,
  assignedGuestIds,
  onAssignedGuestIdsChange,
}: GuestAssignmentPickerProps) => {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")

  const guests = usePlannerStore((state) => state.guests)
  const tables = usePlannerStore((state) => state.tables)

  const tableById = useMemo(
    () => new Map(tables.map((table) => [table.id, table])),
    [tables]
  )

  const guestNamesByTableId = useMemo(
    () =>
      guests.reduce<Partial<Record<string, Array<string>>>>((acc, guest) => {
        if (!guest.tableId) return acc

        const guestName = guest.name.trim()
        if (!guestName) return acc

        const namesAtTable = (acc[guest.tableId] ??= [])
        namesAtTable.push(guestName)
        return acc
      }, {}),
    [guests]
  )

  const assignedGuestIdsWithinCapacity = assignedGuestIds.slice(0, capacity)
  const selectedGuestNames = guests
    .filter((guest) => assignedGuestIdsWithinCapacity.includes(guest.id))
    .map((guest) => guest.name)

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const filteredGuests = guests
    .filter((guest) => guest.name.toLowerCase().includes(normalizedSearchQuery))
    .sort((a, b) => {
      const aIsSeatedElsewhere = a.tableId != null && a.tableId !== tableId
      const bIsSeatedElsewhere = b.tableId != null && b.tableId !== tableId

      if (aIsSeatedElsewhere !== bIsSeatedElsewhere) {
        return aIsSeatedElsewhere ? 1 : -1
      }

      return a.name.localeCompare(b.name)
    })
  const hasGuests = guests.length > 0
  const hasFilteredGuests = filteredGuests.length > 0
  const hasReachedCapacity = assignedGuestIdsWithinCapacity.length >= capacity
  const selectedGuestsValue = selectedGuestNames.join(", ")
  const guestsListRef = useRef<HTMLDivElement>(null)

  const handleGuestListWheel = (e: WheelEvent<HTMLDivElement>) => {
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

  const getSeatedElsewhereMessage = (sourceTableId: string) => {
    const sourceTable = tableById.get(sourceTableId)
    if (!sourceTable) return t("tables.seated_elsewhere.unknown")

    const tableName = sourceTable.name.trim()
    if (tableName)
      return t("tables.seated_elsewhere.named", { name: tableName })

    const guestsAtTable = guestNamesByTableId[sourceTableId] ?? []
    if (guestsAtTable.length === 0) return t("tables.seated_elsewhere.unknown")

    const preview = guestsAtTable.slice(0, 3).join(", ")
    const extra = guestsAtTable.length - 3
    return extra > 0
      ? t("tables.seated_elsewhere.with_preview_extra", { preview, extra })
      : t("tables.seated_elsewhere.with_preview", { preview })
  }

  return (
    <Field>
      <FieldLabel>{t("tables.guests")}</FieldLabel>
      <FieldContent>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full cursor-pointer justify-start rounded-md border px-2.5 font-normal"
            >
              {selectedGuestsValue ? (
                selectedGuestsValue
              ) : (
                <span className="text-muted-foreground">
                  {t("tables.guests_pick")}
                </span>
              )}
            </Button>
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
                  const seatedElsewhereAt =
                    guest.tableId && guest.tableId !== tableId
                      ? guest.tableId
                      : null

                  return (
                    <Button
                      key={guest.id}
                      type="button"
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "w-full justify-between",
                        seatedElsewhereAt &&
                          "border-amber-300/80 bg-amber-50/70 text-amber-900 hover:bg-amber-100/70 dark:border-amber-700/70 dark:bg-amber-950/20 dark:text-amber-200"
                      )}
                      onClick={() => {
                        toggleGuest(guest.id)
                      }}
                    >
                      <span className="truncate">{guest.name}</span>
                      {seatedElsewhereAt && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex shrink-0 items-center">
                              <InfoIcon
                                className="size-3.5 shrink-0 text-amber-700 dark:text-amber-300"
                                aria-hidden
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-64">
                            <div className="space-y-1">
                              <p>
                                {getSeatedElsewhereMessage(seatedElsewhereAt)}
                              </p>
                              <p className="text-[11px] opacity-90">
                                {t("tables.seated_elsewhere.hint")}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
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
