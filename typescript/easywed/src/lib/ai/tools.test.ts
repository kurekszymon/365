// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { tools } from "./tools"
import type { ToolResult } from "./tools"
import { usePlannerStore } from "@/stores/planner.store"

const HALL = "11111111-1111-1111-1111-111111111111"

const seedHall = () =>
  usePlannerStore.setState({
    halls: [
      {
        id: HALL,
        name: "Sala",
        preset: "rectangle",
        size: { width: 20, height: 12 },
        position: { x: 0, y: 0 },
      },
    ],
    tables: [],
    fixtures: [],
    guests: [],
    hallZOrder: [],
  })

// Calls a tool the way the SDK would. The second argument is its tool-call
// metadata - none of our tools read it, so it's stubbed rather than built, and
// the cast keeps that stub from having to track the SDK's generic option type.
const run = async (
  name: keyof typeof tools,
  input: unknown
): Promise<ToolResult> =>
  (await tools[name].execute(
    input as never,
    {
      toolCallId: "test",
      messages: [],
    } as never
  )) as ToolResult

const tableCount = () => usePlannerStore.getState().tables.length
const fixtureCount = () => usePlannerStore.getState().fixtures.length
const hallCount = () => usePlannerStore.getState().halls.length

afterEach(() => {
  usePlannerStore.setState({
    halls: [],
    tables: [],
    fixtures: [],
    guests: [],
    hallZOrder: [],
  })
  localStorage.clear()
})

describe("measure validation", () => {
  // Each of these violates a CHECK constraint the DB would reject, and the
  // store write is fire-and-forget - so letting one through leaves the canvas
  // showing something the database refused.
  const badValues: Array<[string, number]> = [
    ["zero", 0],
    ["negative", -4],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ]

  describe.each(badValues)("width of %s", (_label, value) => {
    it("is refused by add_table and adds nothing", async () => {
      seedHall()
      const result = await run("add_table", { width: value })

      expect(result.status).toBe("cancelled")
      expect(result.message).toContain("width")
      expect(tableCount()).toBe(0)
    })

    it("is refused by add_fixture and adds nothing", async () => {
      seedHall()
      const result = await run("add_fixture", { width: value })

      expect(result.status).toBe("cancelled")
      expect(fixtureCount()).toBe(0)
    })

    it("is refused by add_hall and adds nothing", async () => {
      seedHall()
      const result = await run("add_hall", { width: value })

      expect(result.status).toBe("cancelled")
      expect(hallCount()).toBe(1)
    })
  })

  it("names every offending field, not just the first", async () => {
    seedHall()
    const result = await run("add_table", { width: 0, height: -1 })

    expect(result.status).toBe("cancelled")
    expect(result.message).toContain("width")
    expect(result.message).toContain("height")
  })

  it("refuses a non-positive capacity", async () => {
    seedHall()
    const result = await run("add_table", { capacity: 0 })

    expect(result.status).toBe("cancelled")
    expect(result.message).toContain("capacity")
    expect(tableCount()).toBe(0)
  })

  it("accepts omitted measures and falls back to the presets", async () => {
    seedHall()
    const result = await run("add_table", {})

    expect(result.status).toBe("ok")
    expect(tableCount()).toBe(1)
  })

  it("leaves an existing table untouched when update_table is refused", async () => {
    seedHall()
    await run("add_table", { name: "Stol 1", capacity: 8, width: 2, height: 1 })
    const before = usePlannerStore.getState().tables[0]

    const result = await run("update_table", { id: before.id, width: -3 })

    expect(result.status).toBe("cancelled")
    expect(usePlannerStore.getState().tables[0]).toEqual(before)
  })
})

describe("capacity rounding", () => {
  it("rounds a fractional capacity to whole seats", async () => {
    seedHall()
    const result = await run("add_table", { capacity: 8.4 })

    expect(result.status).toBe("ok")
    expect(usePlannerStore.getState().tables[0].capacity).toBe(8)
  })

  // Rounding runs before the positivity check, so a value that rounds to zero
  // is refused rather than silently becoming a 0-seat table the DB would reject.
  it("refuses a capacity that rounds down to zero", async () => {
    seedHall()
    const result = await run("add_table", { capacity: 0.4 })

    expect(result.status).toBe("cancelled")
    expect(result.message).toContain("capacity")
    expect(tableCount()).toBe(0)
  })
})

describe("hall floor", () => {
  it("truncates a fractional floor", async () => {
    seedHall()
    await run("add_hall", { name: "Piętro", floor: 2.7, width: 10, height: 8 })

    const added = usePlannerStore
      .getState()
      .halls.find((h) => h.name === "Piętro")
    expect(added?.floor).toBe(2)
  })

  // A basement is floor -1, so floors are truncated but never sign-checked.
  it("keeps a negative floor", async () => {
    seedHall()
    await run("add_hall", { name: "Piwnica", floor: -1, width: 10, height: 8 })

    const added = usePlannerStore
      .getState()
      .halls.find((h) => h.name === "Piwnica")
    expect(added?.floor).toBe(-1)
  })
})

describe("non-finite numbers", () => {
  // How this actually arrives: JSON has no Infinity literal, but an
  // out-of-range exponent parses to one, and tool arguments reach us through
  // JSON.parse. Written as the parse rather than the bare literal so it reads
  // as the real path.
  const JSON_INFINITY = JSON.parse("1e309") as number

  // JSON has no Infinity or NaN literal, but 1e309 parses to Infinity - so a
  // model can put one into an integer/numeric column that Postgres will refuse.
  it("drops a non-finite hall floor rather than persisting it", async () => {
    seedHall()
    await run("add_hall", {
      name: "Wieza",
      floor: JSON_INFINITY,
      width: 10,
      height: 8,
    })

    const added = usePlannerStore
      .getState()
      .halls.find((h) => h.name === "Wieza")
    expect(added?.floor).toBeNull()
  })

  it("drops a non-finite floor on update_hall too", async () => {
    seedHall()
    await run("update_hall", { id: HALL, floor: Number.NaN })

    expect(usePlannerStore.getState().halls[0].floor).toBeNull()
  })

  // clampRectIntoHall folds +/-Infinity back inside the hall, but NaN survives
  // its Math.min/Math.max and would reach the numeric column intact.
  it("falls back to the origin for a NaN position on add", async () => {
    seedHall()
    const result = await run("add_table", { x: Number.NaN, y: Number.NaN })

    expect(result.status).toBe("ok")
    const table = usePlannerStore.getState().tables[0]
    expect(Number.isFinite(table.position.x)).toBe(true)
    expect(Number.isFinite(table.position.y)).toBe(true)
    expect(table.position).toEqual({ x: 0, y: 0 })
  })

  it("keeps a table where it is when asked to move it to NaN", async () => {
    seedHall()
    await run("add_table", { x: 4, y: 3 })
    const before = usePlannerStore.getState().tables[0].position

    const result = await run("move_table", {
      id: usePlannerStore.getState().tables[0].id,
      x: Number.NaN,
      y: Number.NaN,
    })

    expect(result.status).toBe("ok")
    expect(usePlannerStore.getState().tables[0].position).toEqual(before)
  })

  // Asserted exactly, not just "inside the hall": a <= bound also passes when
  // the value falls back to the origin, which is precisely the regression this
  // needs to catch. A 2x1 table in the 20x12 seeded hall pins to (18, 11).
  it("clamps an infinite position to the hall edge rather than falling back", async () => {
    seedHall()
    await run("add_table", {
      x: JSON_INFINITY,
      y: JSON_INFINITY,
      width: 2,
      height: 1,
    })

    expect(usePlannerStore.getState().tables[0].position).toEqual({
      x: 18,
      y: 11,
    })
  })

  it("clamps a negative-infinite position to the near edge", async () => {
    seedHall()
    await run("add_table", {
      x: -JSON_INFINITY,
      y: -JSON_INFINITY,
      width: 2,
      height: 1,
    })

    expect(usePlannerStore.getState().tables[0].position).toEqual({
      x: 0,
      y: 0,
    })
  })
})

// getSizeForShape / fixtureSize collapse height into width for these shapes and
// never read the value passed in, so refusing over it would cancel a request on
// a number that was already going to be discarded.
describe("height is only validated for shapes that use it", () => {
  it("accepts a round table with a junk height", async () => {
    seedHall()
    const result = await run("add_table", {
      shape: "round",
      width: 1.6,
      height: 0,
    })

    expect(result.status).toBe("ok")
    expect(usePlannerStore.getState().tables[0].size).toEqual({
      width: 1.6,
      height: 1.6,
    })
  })

  it("accepts a circle fixture with a junk height", async () => {
    seedHall()
    const result = await run("add_fixture", {
      shape: "circle",
      width: 2,
      height: Number.NaN,
    })

    expect(result.status).toBe("ok")
    expect(usePlannerStore.getState().fixtures[0].size).toEqual({
      width: 2,
      height: 2,
    })
  })

  it("still refuses a junk height on a rectangular table", async () => {
    seedHall()
    const result = await run("add_table", {
      shape: "rectangular",
      width: 2,
      height: 0,
    })

    expect(result.status).toBe("cancelled")
    expect(result.message).toContain("height")
  })

  // width IS the diameter for these shapes, so it is still checked.
  it("still refuses a junk width on a round table", async () => {
    seedHall()
    const result = await run("add_table", { shape: "round", width: 0 })

    expect(result.status).toBe("cancelled")
    expect(result.message).toContain("width")
    expect(tableCount()).toBe(0)
  })

  it("accepts a junk height when update_table switches to round", async () => {
    seedHall()
    await run("add_table", { shape: "rectangular", width: 2, height: 1 })
    const id = usePlannerStore.getState().tables[0].id

    const result = await run("update_table", { id, shape: "round", height: 0 })

    expect(result.status).toBe("ok")
    expect(usePlannerStore.getState().tables[0].shape).toBe("round")
  })

  it("accepts a junk height when update_fixture targets a circle", async () => {
    seedHall()
    await run("add_fixture", { shape: "circle", width: 2 })
    const id = usePlannerStore.getState().fixtures[0].id

    const result = await run("update_fixture", { id, height: 0 })

    expect(result.status).toBe("ok")
  })
})
