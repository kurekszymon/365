import { describe, expect, it } from "vitest"
import type { TFunction } from "i18next"
import type { Guest, Table } from "@/stores/planner.store"
import { usePlannerStore } from "@/stores/planner.store"
import { useMenuStore } from "@/stores/menu.store"
import { buildRows } from "@/lib/export/guestsCsv"
import { autoDetectMapping } from "@/lib/import/guestsImport"

// Keys pass through untouched - these tests assert row order, not copy.
const t = ((key: string) => key) as unknown as TFunction

const table = (id: string, name: string): Table => ({
  id,
  name,
  shape: "round",
  capacity: 4,
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

describe("buildRows - flat mode", () => {
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

describe("buildRows - the dish column", () => {
  const seedMenu = () =>
    useMenuStore.setState({
      options: [
        {
          id: "opt-beef",
          menu_course_id: "course-main",
          name: "Poledwica wolowa",
          note: null,
          position: 1,
          archived_at: null,
        },
        {
          id: "opt-old",
          menu_course_id: "course-main",
          name: "Galareta drobiowa",
          note: null,
          position: 2,
          // Archived, and still named below: the couple ordered it before the
          // venue retired it, and a blank cell on their export would be a lie.
          archived_at: "2026-06-01T00:00:00Z",
        },
      ],
    })

  it("names the dish a guest is assigned", () => {
    seed()
    seedMenu()
    usePlannerStore.setState((state) => ({
      guests: state.guests.map((g) =>
        g.id === "g1" ? { ...g, menuOptionId: "opt-beef" } : g
      ),
    }))

    const { rows } = buildRows(["name", "dish"], "flat", t, "name")

    expect(rows.map((r) => r.cells)).toContainEqual([
      "Anna",
      "Poledwica wolowa",
    ])
    // Everyone else exports an empty cell rather than a placeholder - the
    // column has to stay machine-readable.
    expect(rows.map((r) => r.cells)).toContainEqual(["Zofia", ""])
  })

  it("still names a dish the venue has archived", () => {
    seed()
    seedMenu()
    usePlannerStore.setState((state) => ({
      guests: state.guests.map((g) =>
        g.id === "g1" ? { ...g, menuOptionId: "opt-old" } : g
      ),
    }))

    const { rows } = buildRows(["name", "dish"], "flat", t, "name")

    expect(rows.map((r) => r.cells)).toContainEqual([
      "Anna",
      "Galareta drobiowa",
    ])
  })

  it("exports an empty column for a wedding with no menu", () => {
    seed()
    useMenuStore.setState({ options: [] })

    const { rows } = buildRows(["name", "dish"], "flat", t, "name")

    expect(rows.every((r) => r.cells[1] === "")).toBe(true)
  })

  /**
   * The regression this column could have caused, checked rather than assumed.
   *
   * `guestsImport` maps by column *index* over its own closed
   * `GUEST_IMPORT_FIELDS` list, driven by `HEADER_ALIASES`, and "dish" matches
   * none of them - so the column is ignored and every other column still lands
   * where it did. "The file I exported yesterday no longer imports" would be
   * the worst bug this feature could ship, and it would be silent.
   */
  it.each([
    ["pl", ["Imię", "Stół", "Danie", "Notatka"]],
    ["en", ["Name", "Table", "Dish", "Note"]],
  ])("leaves a flat export re-importable (%s)", (_locale, header) => {
    // The literal header strings a flat export emits, from export.col.* in each
    // locale file - not the stub `t` above, which passes keys through and would
    // make this assertion vacuous.
    const mapping = autoDetectMapping(header)

    expect(mapping.name).toBe(0)
    expect(mapping.table).toBe(1)
    expect(mapping.note).toBe(3)
    // The dish column is at index 2 and matches no alias, so nothing maps to
    // it - which is exactly what keeps the other three where they were.
    expect(Object.values(mapping)).not.toContain(2)
  })
})

describe("buildRows - grouped mode", () => {
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
