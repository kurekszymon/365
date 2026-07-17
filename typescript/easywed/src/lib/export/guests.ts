import type { Guest, Table } from "@/stores/planner.store"
import { resolveSeatOccupants, seatSlotsForCapacity } from "@/lib/seats"

export interface TableGroup {
  table: Table
  guests: Array<Guest>
}

export const GUEST_SORTS = ["name", "seat"] as const
export type GuestSort = (typeof GUEST_SORTS)[number]
export const DEFAULT_GUEST_SORT: GuestSort = "name"

export const byGuestName = (a: Guest, b: Guest) => a.name.localeCompare(b.name)

// Order a table's guests by the chair they sit in, matching the canvas and the
// table form's numbered seat list. `resolveSeatOccupants` order-fills unpinned
// guests in array order, so `tableGuests` must arrive in store order - sorting
// before this point would seat people differently than the app shows them.
const bySeat = (table: Table, tableGuests: Array<Guest>): Array<Guest> => {
  const placed = seatSlotsForCapacity(table.capacity)
  const occupantBySeat = resolveSeatOccupants(placed, tableGuests)
  const seated = placed
    .map((slot) => occupantBySeat.get(slot.id))
    .filter((g): g is Guest => g != null)

  // Guests past capacity get no seat from the resolver, and would otherwise
  // drop out of the export entirely. Append them after the seated ones.
  const seatedIds = new Set(seated.map((g) => g.id))
  const overflow = tableGuests
    .filter((g) => !seatedIds.has(g.id))
    .sort(byGuestName)
  return [...seated, ...overflow]
}

// Table names are overwhelmingly "<word> <number>" ("Stół 1", "Stół 10"), which
// a plain localeCompare orders 1, 10, 2. `numeric` compares digit runs by value
// so embedded numbers sort the way people write them.
const tableCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
})

// Returns tables in natural order (numbers within names sorted by value), each
// paired with their guests, and the unassigned guests separately. Used by the
// CSV and PDF/print exports to keep grouping semantics identical.
//
// `sort` orders guests *within* each table: "name" alphabetically, "seat" by
// chair order. Unassigned guests occupy no seat, so they stay alphabetical
// under either mode.
export const groupGuestsByTable = (
  tables: Array<Table>,
  guests: Array<Guest>,
  sort: GuestSort = DEFAULT_GUEST_SORT
): { groups: Array<TableGroup>; unassigned: Array<Guest> } => {
  const sortedTables = [...tables].sort((a, b) =>
    tableCollator.compare(a.name, b.name)
  )

  const groups = sortedTables.map((table) => {
    const tableGuests = guests.filter((g) => g.tableId === table.id)
    return {
      table,
      guests:
        sort === "seat"
          ? bySeat(table, tableGuests)
          : tableGuests.sort(byGuestName),
    }
  })
  // A guest pointing at a table that no longer exists (optimistic store state
  // that diverged from the DB) lands in no group; treat them as unassigned
  // rather than silently dropping them from the export.
  const tableIds = new Set(tables.map((tbl) => tbl.id))
  const unassigned = guests
    .filter((g) => !g.tableId || !tableIds.has(g.tableId))
    .sort(byGuestName)

  return { groups, unassigned }
}
