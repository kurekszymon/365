import { describe, expect, it } from "vitest"
import type { Guest, Table } from "@/stores/planner.store"
import { groupGuestsByTable } from "@/lib/export/guests"

const table = (id: string, name: string, capacity = 8): Table => ({
  id,
  name,
  shape: "round",
  capacity,
  size: { width: 2, height: 2 },
  rotation: 0,
  position: { x: 0, y: 0 },
  hallId: "hall-1",
})

const guest = (
  id: string,
  name: string,
  tableId: string | null,
  seatId?: string | null
): Guest => ({
  id,
  name,
  dietary: [],
  tableId,
  seatId,
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

  it("treats guests pointing at a missing table as unassigned", () => {
    // Optimistic store state can briefly reference a table the DB no longer
    // has; those guests must not silently vanish from the export.
    const tables = [table("t1", "Stół 1")]
    const guests = [
      guest("g1", "Anna", "t1"),
      guest("g2", "Zofia", "t-deleted"),
      guest("g3", "Marek", null),
    ]

    const { groups, unassigned } = groupGuestsByTable(tables, guests, "seat")

    expect(groups[0].guests.map((g) => g.name)).toEqual(["Anna"])
    expect(unassigned.map((g) => g.name)).toEqual(["Marek", "Zofia"])
  })
})

describe("groupGuestsByTable - seat sort", () => {
  const seatNames = (tables: Array<Table>, guests: Array<Guest>) =>
    groupGuestsByTable(tables, guests, "seat").groups[0].guests.map(
      (g) => g.name
    )

  it("orders pinned guests by seat index, not by name", () => {
    const tables = [table("t1", "Stół 1")]
    const guests = [
      guest("g1", "Anna", "t1", "seat-4"),
      guest("g2", "Zofia", "t1", "seat-0"),
      guest("g3", "Marek", "t1", "seat-2"),
    ]

    expect(seatNames(tables, guests)).toEqual(["Zofia", "Marek", "Anna"])
  })

  it("order-fills unpinned guests into free seats in store order", () => {
    const tables = [table("t1", "Stół 1")]
    // Zofia is pinned to seat 2; Anna and Marek fill seats 0 and 1 in the order
    // they appear in the store - the same rule the canvas applies.
    const guests = [
      guest("g1", "Anna", "t1"),
      guest("g2", "Zofia", "t1", "seat-2"),
      guest("g3", "Marek", "t1"),
    ]

    expect(seatNames(tables, guests)).toEqual(["Anna", "Marek", "Zofia"])
  })

  it("keeps guests past capacity instead of dropping them", () => {
    const tables = [table("t1", "Stół 1", 2)]
    const guests = [
      guest("g1", "Anna", "t1"),
      guest("g2", "Zofia", "t1"),
      guest("g3", "Marek", "t1"),
      guest("g4", "Bartek", "t1"),
    ]

    // Anna and Zofia take the two seats; the overflow follows, alphabetized.
    expect(seatNames(tables, guests)).toEqual([
      "Anna",
      "Zofia",
      "Bartek",
      "Marek",
    ])
  })

  it("leaves unassigned guests alphabetical", () => {
    const tables = [table("t1", "Stół 1")]
    const guests = [
      guest("g1", "Zofia", null),
      guest("g2", "Anna", null),
      guest("g3", "Marek", "t1"),
    ]

    const { unassigned } = groupGuestsByTable(tables, guests, "seat")
    expect(unassigned.map((g) => g.name)).toEqual(["Anna", "Zofia"])
  })

  it("defaults to name sort when no mode is passed", () => {
    const tables = [table("t1", "Stół 1")]
    const guests = [
      guest("g1", "Zofia", "t1", "seat-0"),
      guest("g2", "Anna", "t1", "seat-1"),
    ]

    expect(
      groupGuestsByTable(tables, guests).groups[0].guests.map((g) => g.name)
    ).toEqual(["Anna", "Zofia"])
  })
})
