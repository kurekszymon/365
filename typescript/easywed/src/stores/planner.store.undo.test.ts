// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { usePlannerStore } from "./planner.store"
import { useGlobalStore } from "./global.store"
import { useMeasuresStore } from "./measures.store"
import type { Fixture, Guest, Hall, Table } from "./planner.store"
import * as mutations from "@/lib/sync/mutations"

vi.mock("@/lib/sync/mutations", async (importOriginal) => {
  const actual = await importOriginal<typeof mutations>()
  const ok = () => vi.fn(() => Promise.resolve(true))
  return {
    ...actual,
    softDeleteTable: ok(),
    softDeleteFixture: ok(),
    restoreTableRow: ok(),
    restoreFixtureRow: ok(),
  }
})

const WEDDING = "w1"

const hall: Hall = {
  id: "h1",
  name: "Hall",
  preset: "rectangle",
  size: { width: 20, height: 12 },
  position: { x: 0, y: 0 },
}

const table = (id: string): Table => ({
  id,
  name: `Table ${id}`,
  shape: "round",
  capacity: 8,
  size: { width: 1.5, height: 1.5 },
  rotation: 0,
  position: { x: 2, y: 2 },
  hallId: hall.id,
})

const fixture: Fixture = {
  id: "f1",
  name: "Bar",
  shape: "rectangle",
  size: { width: 2, height: 1 },
  rotation: 0,
  position: { x: 5, y: 5 },
  hallId: hall.id,
}

const guest = (id: string, tableId: string | null, seatId?: string): Guest => ({
  id,
  name: id,
  dietary: [],
  tableId,
  seatId: seatId ?? null,
})

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  vi.clearAllMocks()
  useGlobalStore.setState({ weddingId: WEDDING, role: "owner" })
  useMeasuresStore.setState({ byWedding: {} })
  usePlannerStore.setState({
    halls: [hall],
    tables: [table("t1"), table("t2"), table("t3")],
    fixtures: [fixture],
    guests: [guest("g1", "t2", "seat-2"), guest("g2", "t2"), guest("g3", null)],
  })
})

describe("deleteTable / restoreTable", () => {
  it("puts the table back in its place with its guests and seat pins", async () => {
    const deleted = usePlannerStore.getState().deleteTable("t2")!
    expect(usePlannerStore.getState().tables.map((t) => t.id)).toEqual([
      "t1",
      "t3",
    ])
    expect(
      usePlannerStore.getState().guests.filter((g) => g.tableId === "t2")
    ).toEqual([])

    expect(usePlannerStore.getState().restoreTable(deleted)).toBe(true)
    const state = usePlannerStore.getState()
    expect(state.tables.map((t) => t.id)).toEqual(["t1", "t2", "t3"])
    expect(state.guests.find((g) => g.id === "g1")).toMatchObject({
      tableId: "t2",
      seatId: "seat-2",
    })
    expect(state.guests.find((g) => g.id === "g2")?.tableId).toBe("t2")
    expect(state.guests.find((g) => g.id === "g3")?.tableId).toBeNull()

    await flush()
    expect(mutations.restoreTableRow).toHaveBeenCalledWith(table("t2"), [
      { id: "g1", seatId: "seat-2" },
      { id: "g2", seatId: null },
    ])
  })

  it("leaves a guest the user has seated elsewhere since", async () => {
    const deleted = usePlannerStore.getState().deleteTable("t2")!
    usePlannerStore.setState((s) => ({
      guests: s.guests.map((g) =>
        g.id === "g1" ? { ...g, tableId: "t1" } : g
      ),
    }))

    usePlannerStore.getState().restoreTable(deleted)
    const state = usePlannerStore.getState()
    expect(state.guests.find((g) => g.id === "g1")?.tableId).toBe("t1")
    expect(state.guests.find((g) => g.id === "g2")?.tableId).toBe("t2")

    await flush()
    expect(mutations.restoreTableRow).toHaveBeenCalledWith(table("t2"), [
      { id: "g2", seatId: null },
    ])
  })

  it("waits for the delete to land before un-deleting", async () => {
    let landDelete!: (ok: boolean) => void
    vi.mocked(mutations.softDeleteTable).mockReturnValueOnce(
      new Promise((r) => (landDelete = r))
    )
    const deleted = usePlannerStore.getState().deleteTable("t2")!
    usePlannerStore.getState().restoreTable(deleted)

    await flush()
    expect(mutations.restoreTableRow).not.toHaveBeenCalled()
    landDelete(true)
    await flush()
    expect(mutations.restoreTableRow).toHaveBeenCalledTimes(1)
  })

  it("refuses once another wedding is loaded", () => {
    const deleted = usePlannerStore.getState().deleteTable("t2")!
    useGlobalStore.setState({ weddingId: "w2" })
    expect(usePlannerStore.getState().restoreTable(deleted)).toBe(false)
    expect(usePlannerStore.getState().tables.map((t) => t.id)).toEqual([
      "t1",
      "t3",
    ])
  })

  it("refuses when the hall is gone or the table is already back", () => {
    const deleted = usePlannerStore.getState().deleteTable("t2")!
    expect(usePlannerStore.getState().restoreTable(deleted)).toBe(true)
    expect(usePlannerStore.getState().restoreTable(deleted)).toBe(false)

    const again = usePlannerStore.getState().deleteTable("t2")!
    usePlannerStore.setState({ halls: [] })
    expect(usePlannerStore.getState().restoreTable(again)).toBe(false)
  })

  it("brings back the measure lines attached to the table", () => {
    const measures = useMeasuresStore.getState()
    measures.addMeasurement(
      WEDDING,
      { x: 0, y: 0, objectId: "t2" },
      { x: 1, y: 1 }
    )
    measures.addMeasurement(
      WEDDING,
      { x: 0, y: 0 },
      {
        x: 2,
        y: 2,
      }
    )

    const deleted = usePlannerStore.getState().deleteTable("t2")!
    expect(useMeasuresStore.getState().byWedding[WEDDING]).toHaveLength(1)
    usePlannerStore.getState().restoreTable(deleted)
    expect(useMeasuresStore.getState().byWedding[WEDDING]).toHaveLength(2)
  })
})

describe("deleteFixture / restoreFixture", () => {
  it("round-trips", async () => {
    const deleted = usePlannerStore.getState().deleteFixture("f1")!
    expect(usePlannerStore.getState().fixtures).toEqual([])
    expect(usePlannerStore.getState().restoreFixture(deleted)).toBe(true)
    expect(usePlannerStore.getState().fixtures).toEqual([fixture])
    await flush()
    expect(mutations.restoreFixtureRow).toHaveBeenCalledWith("f1")
  })

  it("returns null for an unknown id", () => {
    expect(usePlannerStore.getState().deleteFixture("nope")).toBeNull()
  })
})
