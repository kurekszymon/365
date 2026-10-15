import { describe, expect, it } from "vitest"
import type { LayoutPresetPayload } from "@/lib/sync/layoutPresets"
import { rekeyLayout, snapshotLayout } from "@/lib/sync/layoutPresets"

const hall = (id: string) => ({
  id,
  name: "",
  floor: null,
  preset: "rectangle",
  width: 10,
  height: 8,
  pos_x: 0,
  pos_y: 0,
  geometry: null,
})

const table = (id: string, hallId: string | null) => ({
  id,
  hall_id: hallId,
  name: id,
  shape: "round",
  capacity: 8,
  width: 1.8,
  height: 1.8,
  rotation: 0,
  pos_x: 1,
  pos_y: 1,
  geometry: null,
})

const fixture = (id: string, hallId: string | null) => ({
  id,
  hall_id: hallId,
  name: "",
  shape: "rectangle",
  width: 2,
  height: 1,
  rotation: 0,
  pos_x: 4,
  pos_y: 4,
  geometry: null,
})

const counter = () => {
  let n = 0
  return () => `new-${++n}`
}

describe("rekeyLayout", () => {
  const payload: LayoutPresetPayload = {
    halls: [hall("h1"), hall("h2")],
    tables: [table("t1", "h1"), table("t2", "h2")],
    fixtures: [fixture("f1", "h2")],
  }

  it("gives every row a fresh id and keeps children in their hall", () => {
    const out = rekeyLayout(payload, counter())

    expect(out.halls.map((h) => h.id)).toEqual(["new-1", "new-2"])
    expect(out.tables.map((t) => [t.id, t.hall_id])).toEqual([
      ["new-3", "new-1"],
      ["new-4", "new-2"],
    ])
    expect(out.fixtures.map((f) => [f.id, f.hall_id])).toEqual([
      ["new-5", "new-2"],
    ])
  })

  it("keeps everything but the ids", () => {
    const out = rekeyLayout(payload, counter())
    expect(out.tables[0]).toEqual({
      ...payload.tables[0],
      id: "new-3",
      hall_id: "new-1",
    })
  })

  it("drops rows whose hall is not in the preset", () => {
    const out = rekeyLayout(
      {
        halls: [hall("h1")],
        tables: [
          table("t1", "h1"),
          table("orphan", "gone"),
          table("null", null),
        ],
        fixtures: [fixture("f-orphan", "gone")],
      },
      counter()
    )
    expect(out.tables).toHaveLength(1)
    expect(out.fixtures).toHaveLength(0)
  })

  it("does not mutate its input", () => {
    const before = structuredClone(payload)
    rekeyLayout(payload, counter())
    expect(payload).toEqual(before)
  })
})

describe("snapshotLayout", () => {
  it("leaves the seat overrides out of a preset", () => {
    const { tables } = snapshotLayout(
      [],
      [
        {
          id: "t1",
          name: "Stol 1",
          shape: "round",
          capacity: 8,
          size: { width: 1.8, height: 1.8 },
          rotation: 0,
          position: { x: 1, y: 1 },
          hallId: "h1",
          seats: [{ index: 0 } as never],
        },
      ],
      []
    )
    expect(tables[0]).not.toHaveProperty("seats")
    expect(tables[0]).toMatchObject({ id: "t1", hall_id: "h1", capacity: 8 })
  })
})
