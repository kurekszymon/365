import { describe, expect, it } from "vitest"
import type { Guest } from "@/stores/planner.store"
import { resolveSeatOccupants, seatSlotsForCapacity } from "@/lib/seats"

const guest = (id: string, seatId: string | null = null): Guest => ({
  id,
  name: id,
  dietary: [],
  tableId: "t1",
  seatId,
})

describe("seatSlotsForCapacity", () => {
  it("returns one placeholder slot per seat with deterministic ids", () => {
    const slots = seatSlotsForCapacity(3)
    expect(slots.map((s) => s.id)).toEqual(["seat-0", "seat-1", "seat-2"])
  })

  it("returns no slots for zero capacity", () => {
    expect(seatSlotsForCapacity(0)).toEqual([])
  })
})

describe("resolveSeatOccupants", () => {
  const placed = seatSlotsForCapacity(4)

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
