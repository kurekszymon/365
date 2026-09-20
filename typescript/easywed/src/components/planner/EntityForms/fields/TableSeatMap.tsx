import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { SeatAssignPopover } from "../../Canvas/SeatAssignPopover"
import { effectiveSeats } from "../../Canvas/seatLayout"
import type { TableShape } from "@/stores/planner.store"
import { getInitials } from "@/lib/memberIdentity"
import { resolveSeatOccupants } from "@/lib/seats"
import { usePlannerStore } from "@/stores/planner.store"
import { cn } from "@/lib/utils"

type TableSeatMapProps = {
  tableId: string
  shape: TableShape
  // Visible (rotation-adjusted) footprint in meters. For round tables `heightM`
  // equals `widthM` (the diameter) - same convention the canvas uses.
  widthM: number
  heightM: number
  capacity: number
}

// Diagram bounds and marker size, in px.
const MAX_W = 280
const MAX_H = 168
const SEAT_PX = 24
const PAD = SEAT_PX / 2 + 4

// Seats hug the table more tightly here than on the canvas (SEAT_OFFSET_M): this
// is a compact glance-preview, so a smaller gap keeps it short enough to avoid
// an initial scroll. Dragged-seat overrides keep their real positions.
const PREVIEW_SEAT_OFFSET_M = 0.14

// A scaled, top-down diagram of one table with its seats laid out in position
// and numbered 1..capacity - the visual companion to `TableSeatList`. Each seat
// opens the same `SeatAssignPopover` as the canvas/list, so assigning here stays
// in sync. Custom polygon tables (no auto seat geometry) render nothing.
export const TableSeatMap = ({
  tableId,
  shape,
  widthM,
  heightM,
  capacity,
}: TableSeatMapProps) => {
  const { t } = useTranslation()
  const [openSeatId, setOpenSeatId] = useState<string | null>(null)
  const guests = usePlannerStore((state) => state.guests)
  const overrides = usePlannerStore(
    (state) => state.tables.find((table) => table.id === tableId)?.seats
  )

  const tableGuests = useMemo(
    () => guests.filter((g) => g.tableId === tableId),
    [guests, tableId]
  )

  const placed = useMemo(
    () =>
      effectiveSeats(
        shape,
        widthM,
        heightM,
        capacity,
        overrides ?? [],
        PREVIEW_SEAT_OFFSET_M
      ),
    [shape, widthM, heightM, capacity, overrides]
  )
  const occupantBySeat = resolveSeatOccupants(placed, tableGuests)

  // No auto seat geometry (custom polygon, or zero capacity): the list covers it.
  if (placed.length === 0) return null

  // Bounding box (meters) spanning the table footprint *and* the seat centers,
  // which sit outside the edge (and may be dragged further out).
  const xs = placed.map((p) => p.x)
  const ys = placed.map((p) => p.y)
  const minX = Math.min(0, ...xs)
  const maxX = Math.max(widthM, ...xs)
  const minY = Math.min(0, ...ys)
  const maxY = Math.max(heightM, ...ys)
  const contentW = Math.max(maxX - minX, 0.001)
  const contentH = Math.max(maxY - minY, 0.001)

  const scale = Math.min(
    (MAX_W - 2 * PAD) / contentW,
    (MAX_H - 2 * PAD) / contentH
  )
  const boxW = contentW * scale + 2 * PAD
  const boxH = contentH * scale + 2 * PAD
  // Map a meter coordinate to a px offset inside the box (seat markers are then
  // centered by subtracting half their size).
  const toPxX = (m: number) => PAD + (m - minX) * scale
  const toPxY = (m: number) => PAD + (m - minY) * scale

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative mx-auto rounded-lg bg-muted/40"
        style={{ width: boxW, height: boxH }}
      >
        {/* Table footprint */}
        <div
          className={cn(
            "absolute border border-planner-table-border bg-planner-table",
            shape === "round" ? "rounded-full" : "rounded-md"
          )}
          style={{
            left: toPxX(0),
            top: toPxY(0),
            width: widthM * scale,
            height: heightM * scale,
          }}
        />
        {placed.map((seat, index) => {
          const guest = occupantBySeat.get(seat.id) ?? null
          const occupied = guest != null
          return (
            <SeatAssignPopover
              key={seat.id}
              tableId={tableId}
              seatId={seat.id}
              occupantId={guest?.id ?? null}
              open={openSeatId === seat.id}
              onOpenChange={(o) => setOpenSeatId(o ? seat.id : null)}
            >
              <button
                type="button"
                title={
                  guest ? guest.name : t("seats.numbered", { n: index + 1 })
                }
                aria-label={
                  guest
                    ? `${t("seats.numbered", { n: index + 1 })} - ${guest.name}`
                    : t("seats.numbered", { n: index + 1 })
                }
                className={cn(
                  "absolute flex items-center justify-center rounded-full border text-[10px] font-semibold tabular-nums transition-colors",
                  occupied
                    ? "border-seat-filled-border bg-seat-filled text-white"
                    : "border-seat-empty-border bg-seat-empty text-white hover:brightness-110"
                )}
                style={{
                  left: toPxX(seat.x) - SEAT_PX / 2,
                  top: toPxY(seat.y) - SEAT_PX / 2,
                  width: SEAT_PX,
                  height: SEAT_PX,
                }}
              >
                {/* Occupied seats show the guest's initials (with the seat
                    number in the tooltip); empty seats show the number. */}
                {guest ? getInitials(guest.name) : index + 1}
              </button>
            </SeatAssignPopover>
          )
        })}
      </div>
    </div>
  )
}
