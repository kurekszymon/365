import { describe, expect, it } from "vitest"
import {
  SEAT_MAX_OFFSET_M,
  SEAT_MIN_OFFSET_M,
  computeSeatPositions,
  constrainSeatPosition,
  effectiveSeats,
  resolveSeatOccupants,
} from "./seatLayout"
import type { Guest } from "@/stores/planner.store"

const guest = (id: string, seatId: string | null = null): Guest => ({
  id,
  name: id,
  dietary: [],
  tableId: "t1",
  seatId,
})

describe("computeSeatPositions", () => {
  it("returns one slot per seat for round tables", () => {
    const slots = computeSeatPositions("round", 200, 200, 8, 10)
    expect(slots).toHaveLength(8)
  })

  it("places round seats on the expected radius around the center", () => {
    const width = 200
    const offset = 10
    const slots = computeSeatPositions("round", width, width, 6, offset)
    const cx = width / 2
    const cy = width / 2
    const expectedRadius = width / 2 + offset
    for (const slot of slots) {
      const r = Math.hypot(slot.x - cx, slot.y - cy)
      expect(r).toBeCloseTo(expectedRadius)
    }
  })

  it("starts the first round seat at the top", () => {
    const width = 200
    const [first] = computeSeatPositions("round", width, width, 4, 10)
    expect(first.x).toBeCloseTo(width / 2)
    expect(first.y).toBeLessThan(0) // above the table top edge
  })

  it("returns one slot per seat for rectangular tables", () => {
    const slots = computeSeatPositions("rectangular", 300, 100, 7, 10)
    expect(slots).toHaveLength(7)
  })

  it("seats the long (horizontal) edges of a wide rectangular table", () => {
    const width = 300
    const height = 100
    const offset = 10
    const slots = computeSeatPositions("rectangular", width, height, 6, offset)
    // First half above the top edge, second half below the bottom edge.
    expect(slots.slice(0, 3).every((s) => s.y === -offset)).toBe(true)
    expect(slots.slice(3).every((s) => s.y === height + offset)).toBe(true)
  })

  it("seats the long (vertical) edges of a tall rectangular table", () => {
    const width = 100
    const height = 300
    const offset = 10
    const slots = computeSeatPositions("rectangular", width, height, 6, offset)
    expect(slots.slice(0, 3).every((s) => s.x === -offset)).toBe(true)
    expect(slots.slice(3).every((s) => s.x === width + offset)).toBe(true)
  })

  it("returns no slots for custom tables", () => {
    expect(computeSeatPositions("custom", 200, 200, 8, 10)).toEqual([])
  })

  it("returns no slots for zero capacity", () => {
    expect(computeSeatPositions("round", 200, 200, 0, 10)).toEqual([])
  })

  it("produces meter-scale positions for a small round table", () => {
    // 1.5m diameter table, 0.3m offset → seats within a few meters of origin.
    const seats = effectiveSeats("round", 1.5, 1.5, 6, [], 0.3)
    expect(seats).toHaveLength(6)
    for (const s of seats) {
      expect(Math.abs(s.x)).toBeLessThan(3)
      expect(Math.abs(s.y)).toBeLessThan(3)
    }
  })
})

describe("effectiveSeats", () => {
  it("assigns deterministic seat-{i} ids", () => {
    const seats = effectiveSeats("round", 2, 2, 4)
    expect(seats.map((s) => s.id)).toEqual([
      "seat-0",
      "seat-1",
      "seat-2",
      "seat-3",
    ])
  })

  it("applies stored overrides by id, keeping auto positions for the rest", () => {
    const auto = effectiveSeats("round", 2, 2, 4)
    const overridden = effectiveSeats("round", 2, 2, 4, [
      { id: "seat-1", x: 9, y: 9 },
    ])
    expect(overridden[1]).toEqual({ id: "seat-1", x: 9, y: 9 })
    // Untouched seats keep their auto coordinates.
    expect(overridden[0]).toEqual(auto[0])
    expect(overridden[2]).toEqual(auto[2])
  })

  it("returns no seats for custom tables", () => {
    expect(effectiveSeats("custom", 2, 2, 8)).toEqual([])
  })
})

describe("constrainSeatPosition", () => {
  const dist = (x: number, y: number, cx: number, cy: number) =>
    Math.hypot(x - cx, y - cy)

  it("keeps a round seat within the min/max ring, preserving direction", () => {
    const r = 1 // 2m diameter round table
    // Far to the right → reeled back to the max ring, still due right.
    const far = constrainSeatPosition("round", 2, 2, 10, r)
    expect(dist(far.x, far.y, r, r)).toBeCloseTo(r + SEAT_MAX_OFFSET_M)
    expect(far.y).toBeCloseTo(r)
    expect(far.x).toBeGreaterThan(r)
  })

  it("ejects a round seat dropped on the tabletop", () => {
    const r = 1
    const onTable = constrainSeatPosition("round", 2, 2, r + 0.05, r)
    expect(dist(onTable.x, onTable.y, r, r)).toBeCloseTo(r + SEAT_MIN_OFFSET_M)
  })

  it("pushes a round seat dropped dead-center to the top", () => {
    const r = 1
    const center = constrainSeatPosition("round", 2, 2, r, r)
    expect(center.x).toBeCloseTo(r)
    expect(center.y).toBeCloseTo(r - (r + SEAT_MIN_OFFSET_M))
  })

  it("ejects a rectangular seat dragged onto the tabletop", () => {
    // 4x2 table, point near the top edge inside → pushed just above the top.
    const out = constrainSeatPosition("rectangular", 4, 2, 2, 0.3)
    expect(out.x).toBeCloseTo(2)
    expect(out.y).toBeCloseTo(-SEAT_MIN_OFFSET_M)
  })

  it("reels a far rectangular seat back to the max offset", () => {
    const out = constrainSeatPosition("rectangular", 4, 2, 2, -5)
    expect(out.x).toBeCloseTo(2)
    expect(out.y).toBeCloseTo(-SEAT_MAX_OFFSET_M)
  })

  it("leaves custom tables unconstrained", () => {
    expect(constrainSeatPosition("custom", 2, 2, 9, 9)).toEqual({ x: 9, y: 9 })
  })
})

describe("resolveSeatOccupants", () => {
  const placed = effectiveSeats("rectangular", 4, 2, 4)

  it("honors explicit pins, then order-fills the rest", () => {
    // b is pinned to seat-2; a and c order-fill the first free seats in order.
    const occ = resolveSeatOccupants(placed, [
      guest("a"),
      guest("b", "seat-2"),
      guest("c"),
    ])
    expect(occ.get("seat-2")?.id).toBe("b")
    expect(occ.get("seat-0")?.id).toBe("a")
    expect(occ.get("seat-1")?.id).toBe("c")
  })

  it("does not place a pin that isn't among the placed seats", () => {
    // seat-9 is out of range (capacity 4) → the guest order-fills instead.
    const occ = resolveSeatOccupants(placed, [guest("a", "seat-9")])
    expect(occ.get("seat-0")?.id).toBe("a")
    expect([...occ.values()]).toHaveLength(1)
  })

  it("leaves seats empty when there are fewer guests than seats", () => {
    const occ = resolveSeatOccupants(placed, [guest("a")])
    expect(occ.size).toBe(1)
    expect(occ.get("seat-0")?.id).toBe("a")
  })
})
