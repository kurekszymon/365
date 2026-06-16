import { describe, expect, it } from "vitest"
import { computeSeatPositions, effectiveSeats } from "./seatLayout"

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
