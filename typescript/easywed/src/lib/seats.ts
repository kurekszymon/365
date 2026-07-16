import type { Guest } from "@/stores/planner.store"
import { seatIdForIndex } from "@/stores/planner.store"

export interface PlacedSeat {
  id: string
  x: number
  y: number
}

// Order-based seat ids with no real geometry (x/y are unused placeholders) —
// for list-style seat pickers (the guest list's SeatAssignSheet, the table edit
// form's seat list) and exports where only occupancy bookkeeping matters, not
// screen position. Unlike `effectiveSeats`, this works for `custom` polygon
// tables too, whose auto layout `computeSeatPositions` deliberately leaves empty.
export function seatSlotsForCapacity(capacity: number): Array<PlacedSeat> {
  return Array.from({ length: capacity }, (_, i) => ({
    id: seatIdForIndex(i),
    x: 0,
    y: 0,
  }))
}

// Resolve which guest sits in each placed seat: guests with an explicit `seatId`
// matching a placed seat take it; the rest (order-fill — `seatId` null) fill the
// still-empty seats in list order. This mirrors the table-picker / drag-to-table
// flow, where a guest assigned to a table but not pinned occupies the next free
// seat. Single source of truth so the canvas and any future consumer agree.
export function resolveSeatOccupants(
  placed: Array<PlacedSeat>,
  guests: Array<Guest>
): Map<string, Guest> {
  const placedIds = new Set(placed.map((p) => p.id))
  const occupantBySeat = new Map<string, Guest>()
  const orderFill: Array<Guest> = []
  for (const g of guests) {
    if (g.seatId && placedIds.has(g.seatId)) occupantBySeat.set(g.seatId, g)
    else orderFill.push(g)
  }
  let fillIndex = 0
  for (const p of placed) {
    if (occupantBySeat.has(p.id)) continue
    if (fillIndex < orderFill.length)
      occupantBySeat.set(p.id, orderFill[fillIndex++])
  }
  return occupantBySeat
}
