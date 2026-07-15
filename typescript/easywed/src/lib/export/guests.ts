import type { Guest, Table } from "@/stores/planner.store"

export interface TableGroup {
  table: Table
  guests: Array<Guest>
}

// Table names are overwhelmingly "<word> <number>" ("Stół 1", "Stół 10"), which
// a plain localeCompare orders 1, 10, 2. `numeric` compares digit runs by value
// so embedded numbers sort the way people write them.
const tableCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
})

// Returns tables in natural order (numbers within names sorted by value), each
// paired with their (alphabetized) guests, and the unassigned guests
// separately. Used by CSV and PDF exports to keep grouping semantics identical.
export const groupGuestsByTable = (
  tables: Array<Table>,
  guests: Array<Guest>
): { groups: Array<TableGroup>; unassigned: Array<Guest> } => {
  const byName = (a: Guest, b: Guest) => a.name.localeCompare(b.name)
  const sortedTables = [...tables].sort((a, b) =>
    tableCollator.compare(a.name, b.name)
  )

  const groups = sortedTables.map((table) => ({
    table,
    guests: guests.filter((g) => g.tableId === table.id).sort(byName),
  }))
  const unassigned = guests.filter((g) => !g.tableId).sort(byName)

  return { groups, unassigned }
}
