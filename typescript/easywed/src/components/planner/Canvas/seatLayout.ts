import type { Guest, Seat, TableShape } from "@/stores/planner.store"
import { seatIdForIndex } from "@/stores/planner.store"

// Center of a seat marker, in table-local coordinates (origin = table's
// top-left). Unit-agnostic: callers pass either pixels or meters.
export interface SeatSlot {
  x: number
  y: number
}

export interface PlacedSeat extends SeatSlot {
  id: string
}

// Compute where seat markers sit around a table footprint. Returns `capacity`
// slots for round/rectangular tables; an empty array for custom polygons, whose
// perimeter isn't worth solving here (those tables keep the count label only).
//
// `widthPx`/`heightPx` are the on-screen footprint already adjusted for rotation
// by the caller (see getEffectiveSize). `offsetPx` is the gap from the table edge
// to the seat center.
export function computeSeatPositions(
  shape: TableShape,
  widthPx: number,
  heightPx: number,
  capacity: number,
  offsetPx: number
): Array<SeatSlot> {
  if (capacity <= 0) return []

  if (shape === "round") {
    const cx = widthPx / 2
    const cy = widthPx / 2 // round tables use width as diameter
    const radius = widthPx / 2 + offsetPx
    return Array.from({ length: capacity }, (_, i) => {
      const angle = -Math.PI / 2 + (i / capacity) * 2 * Math.PI
      return {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      }
    })
  }

  if (shape === "rectangular") {
    // Seat the two longer edges, banquet-style. More seats on the first edge
    // when capacity is odd.
    const horizontal = widthPx >= heightPx
    const edgeLen = horizontal ? widthPx : heightPx
    const firstCount = Math.ceil(capacity / 2)
    const secondCount = capacity - firstCount

    const along = (count: number, i: number) =>
      // Evenly spaced, inset from the corners (n+1 gaps).
      ((i + 1) / (count + 1)) * edgeLen

    const slots: Array<SeatSlot> = []
    for (let i = 0; i < firstCount; i++) {
      const d = along(firstCount, i)
      slots.push(horizontal ? { x: d, y: -offsetPx } : { x: -offsetPx, y: d })
    }
    for (let i = 0; i < secondCount; i++) {
      const d = along(secondCount, i)
      slots.push(
        horizontal
          ? { x: d, y: heightPx + offsetPx }
          : { x: widthPx + offsetPx, y: d }
      )
    }
    return slots
  }

  return []
}

// Default gap (meters) between a table edge and the seat center.
export const SEAT_OFFSET_M = 0.3

// How close to / far from the table edge a manually dragged seat may sit. Keeps
// seats off the tabletop (min) and tethered to their table (max), so a stray
// drag can't fling a chair across the hall.
export const SEAT_MIN_OFFSET_M = 0.1
export const SEAT_MAX_OFFSET_M = 0.6

const clampN = (value: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, value))

// Constrain a freely dragged seat center (table-local meters) to a band hugging
// the table's outside edge: it may slide along the perimeter but stays between
// `minOffsetM` and `maxOffsetM` from the nearest edge, and never on the table.
export function constrainSeatPosition(
  shape: TableShape,
  widthM: number,
  heightM: number,
  x: number,
  y: number,
  minOffsetM: number = SEAT_MIN_OFFSET_M,
  maxOffsetM: number = SEAT_MAX_OFFSET_M
): SeatSlot {
  if (shape === "round") {
    const r = widthM / 2
    const dx = x - r
    const dy = y - r
    const dist = Math.hypot(dx, dy)
    const target = clampN(dist, r + minOffsetM, r + maxOffsetM)
    // Dropped dead-center: no direction to push, default to the top.
    if (dist < 1e-6) return { x: r, y: r - target }
    const k = target / dist
    return { x: r + dx * k, y: r + dy * k }
  }

  if (shape === "rectangular") {
    const nx = clampN(x, 0, widthM)
    const ny = clampN(y, 0, heightM)
    const inside = nx === x && ny === y
    if (inside) {
      // Dragged onto the tabletop: eject across the nearest edge.
      const dLeft = x
      const dRight = widthM - x
      const dTop = y
      const dBottom = heightM - y
      const min = Math.min(dLeft, dRight, dTop, dBottom)
      if (min === dLeft) return { x: -minOffsetM, y }
      if (min === dRight) return { x: widthM + minOffsetM, y }
      if (min === dTop) return { x, y: -minOffsetM }
      return { x, y: heightM + minOffsetM }
    }
    // Outside: keep the perimeter contact point, clamp the outward distance.
    const dx = x - nx
    const dy = y - ny
    const dist = Math.hypot(dx, dy)
    const target = clampN(dist, minOffsetM, maxOffsetM)
    const k = dist < 1e-6 ? 0 : target / dist
    return { x: nx + dx * k, y: ny + dy * k }
  }

  return { x, y }
}

// Merge the auto layout with the table's stored position overrides, keyed by the
// deterministic `seat-${i}` id. Inputs/outputs are in **meters** (effective,
// rotation-adjusted footprint; round tables use width as diameter).
export function effectiveSeats(
  shape: TableShape,
  widthM: number,
  heightM: number,
  capacity: number,
  overrides: Array<Seat> = [],
  offsetM: number = SEAT_OFFSET_M
): Array<PlacedSeat> {
  const auto = computeSeatPositions(shape, widthM, heightM, capacity, offsetM)
  if (auto.length === 0) return []
  const overrideById = new Map(overrides.map((s) => [s.id, s]))
  return auto.map((pos, i) => {
    const id = seatIdForIndex(i)
    const override = overrideById.get(id)
    return override
      ? { id, x: override.x, y: override.y }
      : { id, x: pos.x, y: pos.y }
  })
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
