import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import {
  CheckIcon,
  FileSpreadsheetIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { getInitials } from "../Canvas/utils"
import { SeatingProgress } from "./SeatingProgress"
import { SeatAssignSheet } from "./SeatAssignSheet"
import type { ReactNode } from "react"
import type { Guest } from "@/stores/planner.store"
import { usePlannerStore } from "@/stores/planner.store"
import { useDialogStore } from "@/stores/dialog.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { normalize } from "@/lib/import/guestsImport"
import { dietaryLabel, sortDietaryTags } from "@/lib/dietary"
import { ageGroupLabel, childAgeGroup } from "@/lib/ageGroup"

// A user-typed tag could literally be "all", so the sentinels can't be bare
// strings sharing the tag namespace.
type Filter =
  | { kind: "all" }
  | { kind: "unseated" }
  | { kind: "dietary"; tag: string }

// True if every char of `needle` appears in `haystack` in order (a classic
// fuzzy subsequence match), so "vgn" still finds "vegan" and a dropped letter
// in a name doesn't hide the guest. Both sides are expected pre-normalized.
const isSubsequence = (needle: string, haystack: string): boolean => {
  let i = 0
  for (const ch of haystack) {
    if (i < needle.length && ch === needle[i]) i += 1
  }
  return i === needle.length
}

// Each whitespace-separated query token must fuzzily match the haystack, so
// "ann veg" matches a vegan guest named Anna regardless of token order.
const fuzzyMatch = (query: string, haystack: string): boolean =>
  query
    .split(/\s+/)
    .every((token) => token === "" || isSubsequence(token, haystack))

// One chip in the scrollable filter row - All/Unseated plus one per dietary
// category actually in use, replacing the old single "Dieta" toggle so a diner
// can filter down to (say) just the vegan guests instead of "has any diet".
const FilterChip = ({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground hover:bg-muted/70"
    )}
  >
    {children}
  </button>
)

/**
 * Guests-first list: search + filter chips + seating progress, replacing the
 * old drag-and-drop reassignment view. Shared by the desktop
 * `Sidebar/SidebarRail` (Guests tab) and mobile `Sidebar/MobileTabBar`. Tapping a row
 * opens `SeatAssignSheet` (table → seat picker) for that guest.
 */
export const GuestListContent = () => {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<Filter>({ kind: "all" })
  const [assigningGuest, setAssigningGuest] = useState<Guest | null>(null)

  const { guests, tables } = usePlannerStore(
    useShallow((state) => ({ guests: state.guests, tables: state.tables }))
  )
  const deleteGuest = usePlannerStore((state) => state.deleteGuest)
  const openDialog = useDialogStore((state) => state.open)

  const tableById = useMemo(
    () => new Map(tables.map((table, index) => [table.id, { table, index }])),
    [tables]
  )

  const seatedCount = guests.filter((g) => g.tableId).length
  const unseatedCount = guests.length - seatedCount

  const dietaryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const guest of guests) {
      for (const d of guest.dietary) {
        counts.set(d, (counts.get(d) ?? 0) + 1)
      }
    }
    return counts
  }, [guests])
  // Only tags actually in use, presets-first then alphabetical.
  const activeDietaryFilters = sortDietaryTags(dietaryCounts.keys(), t)

  // Fold the name, each dietary preference - both the raw tag ("vegan") and
  // its displayed label ("Wegańska") - and the age bracket into one normalized
  // blob so a fuzzy query can hit any of them.
  const guestHaystack = (guest: Guest) => {
    const child = childAgeGroup(guest.ageGroup)
    return normalize(
      [
        guest.name,
        ...guest.dietary.flatMap((d) => [d, dietaryLabel(t, d)]),
        ...(child ? [child, ageGroupLabel(t, child)] : []),
      ].join(" ")
    )
  }

  const normalizedQuery = normalize(searchQuery)
  const filteredGuests = guests.filter((guest) => {
    if (filter.kind === "unseated" && guest.tableId) return false
    if (filter.kind === "dietary" && !guest.dietary.includes(filter.tag))
      return false
    if (normalizedQuery && !fuzzyMatch(normalizedQuery, guestHaystack(guest)))
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
      {/* Sticky controls: progress, search, filters, add/import - kept above the
          scrolling list so they stay reachable in a long guest list. */}
      <div className="sticky top-0 z-10 flex flex-col gap-3 bg-background before:pointer-events-none before:absolute before:inset-x-0 before:-top-4 before:h-4 before:bg-background after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-4 after:h-4 after:bg-background">
        <SeatingProgress seated={seatedCount} total={guests.length} />

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("guests.search_placeholder")}
            className="w-full rounded-md border pr-8 pl-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label={t("common.clear")}
              className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-0.5">
          <FilterChip
            active={filter.kind === "all"}
            onClick={() => setFilter({ kind: "all" })}
          >
            {t("guests.filter.all", { count: guests.length })}
          </FilterChip>
          <FilterChip
            active={filter.kind === "unseated"}
            onClick={() => setFilter({ kind: "unseated" })}
          >
            {t("guests.filter.unseated", { count: unseatedCount })}
          </FilterChip>
          {activeDietaryFilters.map((d) => (
            <FilterChip
              key={d}
              active={filter.kind === "dietary" && filter.tag === d}
              onClick={() => setFilter({ kind: "dietary", tag: d })}
            >
              {dietaryLabel(t, d)} ({dietaryCounts.get(d)})
            </FilterChip>
          ))}
        </div>

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
            const ageBadge = childAgeGroup(guest.ageGroup)
            return (
              <div
                key={guest.id}
                className="flex items-center gap-1 rounded-2xl border pr-2 transition-colors hover:bg-accent/50"
              >
                <button
                  type="button"
                  onClick={() => setAssigningGuest(guest)}
                  className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {getInitials(guest.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    {/* Adults are the default, so only child brackets earn a
                        badge - same rule as the printed guest list. It rides
                        alongside the name rather than with the dietary tags:
                        it's who the guest is, not what they eat. */}
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">
                        {guest.name}
                      </p>
                      {ageBadge && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          {ageGroupLabel(t, ageBadge)}
                        </span>
                      )}
                    </div>
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
                    {guest.dietary.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {guest.dietary.map((d) => (
                          <span
                            key={d}
                            className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
                          >
                            {dietaryLabel(t, d)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openDialog("Guest.Edit", { guestId: guest.id })
                  }
                  aria-label={t("guests.edit")}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <PencilIcon className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteGuest(guest.id)}
                  aria-label={t("guests.delete")}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2Icon className="size-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <SeatAssignSheet
        guest={assigningGuest}
        onAssigned={() => setSearchQuery("")}
        onOpenChange={(open) => {
          if (!open) setAssigningGuest(null)
        }}
      />
    </div>
  )
}
