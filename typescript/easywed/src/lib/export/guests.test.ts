import { describe, expect, it } from "vitest"
import type { Guest, Table } from "@/stores/planner.store"
import { groupGuestsByTable } from "@/lib/export/guests"

const table = (id: string, name: string): Table => ({
  id,
  name,
  shape: "round",
  capacity: 8,
  size: { width: 2, height: 2 },
  rotation: 0,
  position: { x: 0, y: 0 },
})

const guest = (id: string, name: string, tableId: string | null): Guest => ({
  id,
  name,
  dietary: [],
  tableId,
})

const namesOf = (tables: Array<Table>, guests: Array<Guest> = []) =>
  groupGuestsByTable(tables, guests).groups.map((g) => g.table.name)

describe("groupGuestsByTable", () => {
  it("orders embedded numbers by value, not lexicographically", () => {
    const tables = ["Stół 10", "Stół 2", "Stół 1", "Stół 21", "Stół 3"].map(
      (name, i) => table(`t${i}`, name)
    )

    expect(namesOf(tables)).toEqual([
      "Stół 1",
      "Stół 2",
      "Stół 3",
      "Stół 10",
      "Stół 21",
    ])
  })

  it("keeps alphabetical order across differing names", () => {
    const tables = [
      table("t1", "Stół 2"),
      table("t2", "Ławka 10"),
      table("t3", "Ławka 2"),
    ]

    expect(namesOf(tables)).toEqual(["Ławka 2", "Ławka 10", "Stół 2"])
  })

  it("sorts numbered names ahead of their suffixed variants", () => {
    const tables = ["Stół 1b", "Stół 10", "Stół 1", "Stół 1a"].map((name, i) =>
      table(`t${i}`, name)
    )

    expect(namesOf(tables)).toEqual(["Stół 1", "Stół 1a", "Stół 1b", "Stół 10"])
  })

  it("pairs each table with its alphabetized guests and splits unassigned", () => {
    const tables = [table("t1", "Stół 2"), table("t2", "Stół 10")]
    const guests = [
      guest("g1", "Zofia", "t1"),
      guest("g2", "Anna", "t1"),
      guest("g3", "Piotr", "t2"),
      guest("g4", "Marek", null),
    ]

    const { groups, unassigned } = groupGuestsByTable(tables, guests)

    expect(groups.map((g) => g.table.name)).toEqual(["Stół 2", "Stół 10"])
    expect(groups[0].guests.map((g) => g.name)).toEqual(["Anna", "Zofia"])
    expect(groups[1].guests.map((g) => g.name)).toEqual(["Piotr"])
    expect(unassigned.map((g) => g.name)).toEqual(["Marek"])
  })
})
