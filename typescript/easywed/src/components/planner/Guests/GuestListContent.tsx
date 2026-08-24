import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import {
  CheckIcon,
  FileSpreadsheetIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UtensilsIcon,
  XIcon,
} from "lucide-react"
import { SeatingProgress } from "./SeatingProgress"
import { SeatAssignSheet } from "./SeatAssignSheet"
import type { ReactNode } from "react"
import type { Guest } from "@/stores/planner.store"
import type { TagTone } from "@/lib/tagTone"
import { getInitials } from "@/lib/memberIdentity"
import { usePlannerStore } from "@/stores/planner.store"
import { useMenuStore } from "@/stores/menu.store"
import { menuOptionTone, tallyByOption } from "@/lib/menu"
import { useDialogStore } from "@/stores/dialog.store"
import { useEntityListStore } from "@/stores/entityList.store"
import { selectCanEdit, useGlobalStore } from "@/stores/global.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { TagBadge } from "@/components/ui/tag-badge"
import { cn } from "@/lib/utils"
import { normalize } from "@/lib/import/guestsImport"
import { dietaryLabel, dietaryTone, sortDietaryTags } from "@/lib/dietary"
import {
  AGE_GROUP_TONE,
  ageGroupLabel,
  childAgeGroup,
  countKids,
  isKidAgeGroup,
} from "@/lib/ageGroup"
import {
  TAG_TONE_BADGE,
  TAG_TONE_BADGE_HOVER,
  TAG_TONE_SOLID,
} from "@/lib/tagTone"

// A user-typed tag could literally be "all", so the sentinels can't be bare
// strings sharing the tag namespace.
type Filter =
  | { kind: "all" }
  | { kind: "unseated" }
  | { kind: "kids" }
  | { kind: "dietary"; tag: string }
  // The per-guest dish. Keyed on the option id rather than the name, unlike the
  // dietary arm: two dishes of two packages can share a name, and the id is
  // what the guest row actually holds.
  | { kind: "menu"; optionId: string }

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
// `tooltip` is for chips whose count is derived rather than literal (Kids), so
// the rule behind the number is discoverable.
//
// `tone` carries the same hue the matching badges use down in the list, which
// turns the row into a legend: the green chip filters to the green badges. The
// chips that stand for no tag (All / Unseated) pass no tone and keep the neutral
// primary/muted pair.
const FilterChip = ({
  active,
  onClick,
  tone,
  tooltip,
  children,
}: {
  active: boolean
  onClick: () => void
  tone?: TagTone
  tooltip?: string
  children: ReactNode
}) => {
  const chip = (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border border-transparent px-3.5 py-1.5 text-xs font-semibold transition-colors",
        tone
          ? active
            ? TAG_TONE_SOLID[tone]
            : cn(TAG_TONE_BADGE[tone], TAG_TONE_BADGE_HOVER[tone])
          : active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/70"
      )}
    >
      {children}
    </button>
  )
  if (!tooltip) return chip
  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  )
}

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
  const canEdit = useGlobalStore(selectCanEdit)
  // Empty for every wedding with no venue, so the dish badge, the dish filter
  // chips and the dish half of the search haystack all cost nothing and render
  // nothing in guest mode.
  const menuOptions = useMenuStore((state) => state.options)

  // Onboarding's "seat everyone" step asks for this highlight; it fades on its
  // own so the row settles back to three matching icons. The store owns the
  // flag rather than this component so the request survives the panel being
  // opened by the same click.
  const seatHint = useEntityListStore((state) => state.seatHint)
  const clearSeatHint = useEntityListStore((state) => state.clearSeatHint)
  useEffect(() => {
    if (!seatHint) return
    const timer = setTimeout(clearSeatHint, 2600)
    return () => clearTimeout(timer)
  }, [seatHint, clearSeatHint])

  const tableById = useMemo(
    () => new Map(tables.map((table, index) => [table.id, { table, index }])),
    [tables]
  )

  const seatedCount = guests.filter((g) => g.tableId).length
  const unseatedCount = guests.length - seatedCount
  // One number for every under-18, inferred from whichever bracket they were
  // tagged with (preset or custom) rather than a badge of its own. Caterers ask
  // for this total, and no single bracket chip answers it.
  const kidsCount = countKids(guests)

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

  // Dish names, resolved from the venue's catalogue.
  //
  // Read **unfiltered by `archived_at`**: a dish the venue retired after this
  // couple ordered it still has to be nameable on the row of every guest
  // holding it. Filtering is for pickers, which offer a choice; this is
  // rendering one that was already made.
  const dishNameById = useMemo(
    () => new Map(menuOptions.map((option) => [option.id, option.name])),
    [menuOptions]
  )

  // Only dishes somebody is actually having, biggest group first - the same
  // helper the kitchen tally and the printed report use, so the count-then-name
  // sort and the drop-unresolved-ids rule live in exactly one tested place.
  // Empty for a buffet menu, an unlinked wedding and all of guest mode, where
  // nothing carries a dish.
  const dishCounts = useMemo(
    () =>
      tallyByOption(
        guests.map((g) => g.menuOptionId),
        (id) => dishNameById.get(id) ?? null
      ),
    [guests, dishNameById]
  )

  // Fold the name, each dietary preference - both the raw tag ("vegan") and
  // its displayed label ("Wegańska") - the age bracket and the assigned dish
  // into one normalized blob so a fuzzy query can hit any of them. Searching
  // "kaczka" to find everyone having the duck is the whole point of the last
  // one.
  const guestHaystack = (guest: Guest) => {
    const child = childAgeGroup(guest.ageGroup)
    const dish = guest.menuOptionId
      ? dishNameById.get(guest.menuOptionId)
      : null
    return normalize(
      [
        guest.name,
        ...guest.dietary.flatMap((d) => [d, dietaryLabel(t, d)]),
        ...(child ? [child, ageGroupLabel(t, child)] : []),
        ...(dish ? [dish] : []),
      ].join(" ")
    )
  }

  const normalizedQuery = normalize(searchQuery)
  const filteredGuests = guests.filter((guest) => {
    if (filter.kind === "unseated" && guest.tableId) return false
    if (filter.kind === "kids" && !isKidAgeGroup(guest.ageGroup)) return false
    if (filter.kind === "dietary" && !guest.dietary.includes(filter.tag))
      return false
    if (filter.kind === "menu" && guest.menuOptionId !== filter.optionId)
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
        {canEdit && (
          <>
            <Button variant="outline" onClick={() => openDialog("Guest.Add")}>
              <PlusIcon />
              {t("guests.add")}
            </Button>
            <Button
              variant="outline"
              onClick={() => openDialog("Guest.Import")}
            >
              <FileSpreadsheetIcon />
              {t("guests.import")}
            </Button>
          </>
        )}
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
          {/* Only offered once someone is tagged as a kid, like the dietary
              chips - an always-visible "Kids 0" is noise for a wedding
              without children. */}
          {kidsCount > 0 && (
            <FilterChip
              active={filter.kind === "kids"}
              onClick={() => setFilter({ kind: "kids" })}
              tone={AGE_GROUP_TONE}
              tooltip={t("guests.filter.kids_hint")}
            >
              {t("guests.filter.kids", { count: kidsCount })}
            </FilterChip>
          )}
          {activeDietaryFilters.map((d) => (
            <FilterChip
              key={d}
              active={filter.kind === "dietary" && filter.tag === d}
              onClick={() => setFilter({ kind: "dietary", tag: d })}
              tone={dietaryTone(d)}
            >
              {dietaryLabel(t, d)} ({dietaryCounts.get(d)})
            </FilterChip>
          ))}
          {dishCounts.map((dish) => (
            <FilterChip
              key={dish.id}
              active={filter.kind === "menu" && filter.optionId === dish.id}
              onClick={() => setFilter({ kind: "menu", optionId: dish.id })}
              tone={menuOptionTone(dish.name)}
            >
              {dish.name} ({dish.count})
            </FilterChip>
          ))}
        </div>

        {canEdit && (
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
        )}
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
            const dishName = guest.menuOptionId
              ? (dishNameById.get(guest.menuOptionId) ?? null)
              : null
            return (
              <div
                key={guest.id}
                className="flex items-center gap-1 rounded-2xl border pr-2 transition-colors hover:bg-accent/50"
              >
                {/* The row itself opens the seat picker, which is a write.
                    Disabled rather than swapped for a div so the row keeps its
                    shape and the guest's details stay readable. */}
                <button
                  type="button"
                  disabled={!canEdit}
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
                        <TagBadge tone={AGE_GROUP_TONE}>
                          {ageGroupLabel(t, ageBadge)}
                        </TagBadge>
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
                    {/* Sorted rather than shown in storage order, so the same
                        two diets always appear in the same order - and
                        therefore the same color order - on every row. */}
                    {(guest.dietary.length > 0 || dishName) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {sortDietaryTags(guest.dietary, t).map((d) => (
                          <TagBadge key={d} tone={dietaryTone(d)}>
                            {dietaryLabel(t, d)}
                          </TagBadge>
                        ))}
                        {/* Last, after the diets: what the guest eats is the
                            diet's consequence, and the badge is long. */}
                        {dishName && (
                          <TagBadge tone={menuOptionTone(dishName)}>
                            {dishName}
                          </TagBadge>
                        )}
                      </div>
                    )}
                  </div>
                </button>
                {canEdit && (
                  <>
                    {/* Seating is the row's primary action, but the row itself
                        was its only trigger - and next to an explicit pencil
                        and bin, a bare row reads as "open details", not "sit
                        this guest down". Same handler as the row; this just
                        makes the affordance sayable. Tinted, unlike its two
                        neighbours, because it is the action the guest list
                        exists for.

                        Utensils, not a chair: it is already this app's table
                        icon (sidebar tab, table list rows), seating means
                        putting a guest at a table, and lucide's chairs are
                        dense enough at size-4 to read as filled next to the
                        line-weight pencil and bin. Same muted palette as those
                        two - it sits in their row, so a tint of its own just
                        reads as a mismatch. The onboarding hint below is what
                        picks it out, and only for a moment. */}
                    <button
                      type="button"
                      onClick={() => setAssigningGuest(guest)}
                      aria-label={t("guests.assign.action")}
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                        seatHint
                          ? "animate-pulse bg-primary/15 text-primary ring-2 ring-primary/40"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <UtensilsIcon className="size-4" />
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
                  </>
                )}
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
