import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import {
  CheckIcon,
  FileSpreadsheetIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"
import { getInitials } from "../Canvas/utils"
import { SeatingProgress } from "./SeatingProgress"
import { SeatAssignSheet } from "./SeatAssignSheet"
import type { Guest } from "@/stores/planner.store"
import { usePlannerStore } from "@/stores/planner.store"
import { useDialogStore } from "@/stores/dialog.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ButtonGroup } from "@/components/ui/button-group"

type Filter = "all" | "unseated" | "dietary"

/**
 * Guests-first list: search + filter chips + seating progress, replacing the
 * old drag-and-drop reassignment view. Shared by the desktop `GuestRail` and
 * mobile `GuestPeekBar`. Tapping a row opens `SeatAssignSheet` (table → seat
 * picker) for that guest.
 */
export const GuestListContent = () => {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [assigningGuest, setAssigningGuest] = useState<Guest | null>(null)

  const { guests, tables } = usePlannerStore(
    useShallow((state) => ({ guests: state.guests, tables: state.tables }))
  )
  const openDialog = useDialogStore((state) => state.open)

  const tableById = useMemo(
    () => new Map(tables.map((table, index) => [table.id, { table, index }])),
    [tables]
  )

  const seatedCount = guests.filter((g) => g.tableId).length
  const unseatedCount = guests.length - seatedCount

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredGuests = guests.filter((guest) => {
    if (filter === "unseated" && guest.tableId) return false
    if (filter === "dietary" && guest.dietary.length === 0) return false
    if (normalizedQuery && !guest.name.toLowerCase().includes(normalizedQuery))
      return false
    return true
  })

  const seatedTableLabel = (guest: (typeof guests)[number]) => {
    if (!guest.tableId) return null
    const entry = tableById.get(guest.tableId)
    if (!entry) return null
    return (
      entry.table.name.trim() ||
      t("tables.unnamed_index", { index: entry.index + 1 })
    )
  }

  if (guests.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t("guests.none")}</p>
        <Button variant="outline" onClick={() => openDialog("Guest.Add")}>
          <PlusIcon />
          {t("guests.add")}
        </Button>
        <Button variant="outline" onClick={() => openDialog("Guest.Import")}>
          <FileSpreadsheetIcon />
          {t("guests.import")}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky controls: progress, search, filters, add/import — kept above the
          scrolling list so they stay reachable in a long guest list. */}
      <div className="sticky top-0 z-10 flex flex-col gap-3 bg-background before:pointer-events-none before:absolute before:inset-x-0 before:-top-4 before:h-4 before:bg-background after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-4 after:h-4 after:bg-background">
        <SeatingProgress seated={seatedCount} total={guests.length} />

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("guests.search_placeholder")}
            className="w-full rounded-md border pl-8"
          />
        </div>

        <ButtonGroup className="w-full">
          <Button
            type="button"
            size="xs"
            className="flex-1"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            {t("guests.filter.all", { count: guests.length })}
          </Button>
          <Button
            type="button"
            size="xs"
            className="flex-1"
            variant={filter === "unseated" ? "default" : "outline"}
            onClick={() => setFilter("unseated")}
          >
            {t("guests.filter.unseated", { count: unseatedCount })}
          </Button>
          <Button
            type="button"
            size="xs"
            className="flex-1"
            variant={filter === "dietary" ? "default" : "outline"}
            onClick={() => setFilter("dietary")}
          >
            {t("guests.filter.dietary")}
          </Button>
        </ButtonGroup>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => openDialog("Guest.Add")}
          >
            <PlusIcon />
            {t("guests.add")}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => openDialog("Guest.Import")}
          >
            <FileSpreadsheetIcon />
            {t("guests.import")}
          </Button>
        </div>
      </div>

      {filteredGuests.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("guests.no_match")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredGuests.map((guest) => {
            const seatedAt = seatedTableLabel(guest)
            return (
              <button
                key={guest.id}
                type="button"
                onClick={() => setAssigningGuest(guest)}
                className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors hover:bg-accent/50"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {getInitials(guest.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{guest.name}</p>
                  {seatedAt ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-primary">
                      <CheckIcon className="size-3" />
                      {t("guests.status.seated_at", { table: seatedAt })}
                    </p>
                  ) : (
                    <span className="mt-1 inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
                      {t("guests.status.unseated")}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <SeatAssignSheet
        guest={assigningGuest}
        onOpenChange={(open) => {
          if (!open) setAssigningGuest(null)
        }}
      />
    </div>
  )
}
