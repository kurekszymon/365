import type { Seat, TableShape } from "@/stores/planner.store"
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
