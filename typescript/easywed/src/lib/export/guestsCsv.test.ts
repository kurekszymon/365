import { describe, expect, it } from "vitest"
import type { TFunction } from "i18next"
import type { Guest, Table } from "@/stores/planner.store"
import { usePlannerStore } from "@/stores/planner.store"
import { buildRows } from "@/lib/export/guestsCsv"

// Keys pass through untouched — these tests assert row order, not copy.
const t = ((key: string) => key) as unknown as TFunction

const table = (id: string, name: string): Table => ({
  id,
  name,
  shape: "round",
  capacity: 4,
  size: { width: 2, height: 2 },
  rotation: 0,
  position: { x: 0, y: 0 },
})

const guest = (
  id: string,
  name: string,
  tableId: string | null,
  seatId?: string | null
): Guest => ({ id, name, dietary: [], tableId, seatId })

// "Stół 10" deliberately precedes "Stół 2" in the store so the natural table
// order is doing real work rather than mirroring insertion order.
const seed = () =>
  usePlannerStore.setState({
    tables: [table("t2", "Stół 10"), table("t1", "Stół 2")],
    guests: [
      guest("g1", "Anna", "t2", "seat-3"),
      guest("g2", "Zofia", "t2", "seat-0"),
      guest("g3", "Piotr", "t1", "seat-1"),
      guest("g4", "Bartek", "t1", "seat-0"),
      guest("g5", "Ola", null),
    ],
  })

describe("buildRows — flat mode", () => {
  it("sorts every guest by name, ignoring tables", () => {
    seed()
    const { rows } = buildRows(["name", "table"], "flat", t, "name")

    expect(rows.map((r) => r.cells[0])).toEqual([
      "Anna",
      "Bartek",
      "Ola",
      "Piotr",
      "Zofia",
    ])
  })

  it("groups by table in natural order, then seat, with unassigned last", () => {
    seed()
    const { rows } = buildRows(["name", "table"], "flat", t, "seat")

    expect(rows.map((r) => r.cells[0])).toEqual([
      "Bartek", // Stół 2, seat 0
      "Piotr", // Stół 2, seat 1
      "Zofia", // Stół 10, seat 0
      "Anna", // Stół 10, seat 3
      "Ola", // unassigned
    ])
  })

  it("keeps the table column under both sorts, so flat stays re-importable", () => {
    seed()
    const byName = buildRows(["name", "table"], "flat", t, "name")
    const bySeat = buildRows(["name", "table"], "flat", t, "seat")

    expect(bySeat.header).toEqual(byName.header)
    expect(bySeat.rows.every((r) => r.cells.length === 2)).toBe(true)
  })
})

describe("buildRows — grouped mode", () => {
  it("orders guests by seat within each table section", () => {
    seed()
    const { rows } = buildRows(["name"], "grouped", t, "seat")

    expect(rows.map((r) => `${r.kind}:${r.cells[0]}`)).toEqual([
      "heading:export.csv.section.table",
      "data:Bartek",
      "data:Piotr",
      "heading:export.csv.section.table",
      "data:Zofia",
      "data:Anna",
      "heading:export.csv.section.unassigned",
      "data:Ola",
    ])
  })
})
