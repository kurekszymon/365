import { describe, expect, it } from "vitest"
import type { Table } from "@/stores/planner.store"
import {
  autoDetectMapping,
  buildGuests,
  normalize,
  parseDietary,
} from "@/lib/import/guestsImport"

const table = (id: string, name: string): Table => ({
  id,
  name,
  shape: "round",
  capacity: 8,
  size: { width: 1.6, height: 1.6 },
  rotation: 0,
  position: { x: 0, y: 0 },
})

const TABLES = [table("t1", "Head Table"), table("t2", "Stół 2")]

describe("normalize", () => {
  it("lowercases, trims and strips diacritics", () => {
    expect(normalize("  Gość ")).toBe("gosc")
    expect(normalize("STÓŁ")).toBe("stol")
  })
})

describe("autoDetectMapping", () => {
  it("detects english headers", () => {
    expect(autoDetectMapping(["Name", "Table", "Dietary", "Note"])).toEqual({
      name: 0,
      table: 1,
      dietary: 2,
      note: 3,
    })
  })

  it("detects polish headers (diacritic-insensitive)", () => {
    expect(autoDetectMapping(["Imię", "Stół", "Dieta", "Uwagi"])).toEqual({
      name: 0,
      table: 1,
      dietary: 2,
      note: 3,
    })
  })

  it("falls back to column 0 for name when nothing matches", () => {
    expect(autoDetectMapping(["foo", "bar"])).toEqual({
      name: 0,
      table: null,
      dietary: null,
      note: null,
    })
  })

  it("returns all null for empty headers", () => {
    expect(autoDetectMapping([])).toEqual({
      name: null,
      table: null,
      dietary: null,
      note: null,
    })
  })
})

describe("parseDietary", () => {
  it("keeps valid values across mixed separators", () => {
    expect(parseDietary("vegan, gluten-free; halal / kosher")).toEqual([
      "vegan",
      "gluten-free",
      "halal",
      "kosher",
    ])
  })

  it("drops unknown tokens and dedupes", () => {
    expect(parseDietary("Vegan, paleo, vegan")).toEqual(["vegan"])
  })

  it("matches space-separated 'gluten free' as gluten-free", () => {
    expect(parseDietary("Gluten Free, vegan")).toEqual(["gluten-free", "vegan"])
  })

  it("returns empty for blank input", () => {
    expect(parseDietary("")).toEqual([])
  })
})

describe("buildGuests", () => {
  const mapping = { name: 0, table: 1, dietary: 2, note: 3 }

  it("matches table names case/diacritic-insensitively, else unassigned", () => {
    const { guests } = buildGuests(
      [
        ["Anna", "head table", "vegan", "near stage"],
        ["Bob", "stol 2", "", ""],
        ["Cara", "Unknown Table", "", ""],
      ],
      mapping,
      TABLES
    )
    expect(guests).toEqual([
      {
        name: "Anna",
        tableId: "t1",
        dietary: ["vegan"],
        note: "near stage",
      },
      { name: "Bob", tableId: "t2", dietary: [] },
      { name: "Cara", tableId: null, dietary: [] },
    ])
  })

  it("skips and counts rows with a blank name", () => {
    const { guests, skipped } = buildGuests(
      [
        ["", "Head Table", "", ""],
        ["  ", "", "", ""],
        ["Dan", "", "", ""],
      ],
      mapping,
      TABLES
    )
    expect(guests).toHaveLength(1)
    expect(guests[0].name).toBe("Dan")
    expect(skipped).toBe(2)
  })

  it("omits note when unmapped or empty", () => {
    const { guests } = buildGuests(
      [["Eve", "", "", ""]],
      { name: 0, table: null, dietary: null, note: null },
      TABLES
    )
    expect(guests[0]).toEqual({ name: "Eve", tableId: null, dietary: [] })
    expect("note" in guests[0]).toBe(false)
  })
})
