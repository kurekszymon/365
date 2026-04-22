import type { Guest, Table } from "@/stores/planner.store"

export interface TableGroup {
  table: Table
  guests: Array<Guest>
}

// Returns tables alphabetized, each paired with their (alphabetized) guests,
// and the unassigned guests separately. Used by CSV and PDF exports to keep
// grouping semantics identical.
export const groupGuestsByTable = (
  tables: Array<Table>,
  guests: Array<Guest>
): { groups: Array<TableGroup>; unassigned: Array<Guest> } => {
  const byName = (a: Guest, b: Guest) => a.name.localeCompare(b.name)
  const sortedTables = [...tables].sort((a, b) => a.name.localeCompare(b.name))

  const groups = sortedTables.map((table) => ({
    table,
    guests: guests.filter((g) => g.tableId === table.id).sort(byName),
  }))
  const unassigned = guests.filter((g) => !g.tableId).sort(byName)

  return { groups, unassigned }
}
