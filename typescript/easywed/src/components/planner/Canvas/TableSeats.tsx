import { useRef, useState } from "react"
import { clamp } from "./utils"
import { effectiveSeats } from "./seatLayout"
import { SeatAssignPopover } from "./SeatAssignPopover"
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react"
import type { Guest, Seat, TableShape } from "@/stores/planner.store"
import { cn } from "@/lib/utils"
import { usePlannerStore } from "@/stores/planner.store"
import { useViewStore } from "@/stores/view.store"

type TableSeatsProps = {
  tableId: string
  shape: TableShape
  widthM: number
  heightM: number
  capacity: number
  // Guests assigned to this table (some pinned via seatId, some order-fill).
  guests: Array<Guest>
  overrides: Array<Seat>
  ppm: number
}

type DragState = {
  seatId: string
  startX: number
  startY: number
  dx: number
  dy: number
  moved: boolean
}

const DRAG_THRESHOLD = 4

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "•"
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
}

export const TableSeats = ({
  tableId,
  shape,
  widthM,
  heightM,
  capacity,
  guests,
  overrides,
  ppm,
}: TableSeatsProps) => {
  const isMeasuring = useViewStore((state) => state.isMeasuring)
  const moveSeat = usePlannerStore((state) => state.moveSeat)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [openSeatId, setOpenSeatId] = useState<string | null>(null)
  // Set when a press turns into a drag, so the trailing click doesn't also open
  // the popover (the click fires after pointerup on the same element).
  const draggedRef = useRef(false)

  const placed = effectiveSeats(shape, widthM, heightM, capacity, overrides)
  if (placed.length === 0) return null

  // Resolve who sits where: explicit seatId pins first, then guests with no seat
  // fill remaining seats in order (matches the table-picker / drag-to-table flow).
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

  const seatPx = clamp(ppm * 0.34, 12, 22)
  const showInitials = seatPx >= 14

  const onPointerDown = (seatId: string) => (e: ReactPointerEvent) => {
    if (isMeasuring) return
    // Keep the parent table's dnd-kit drag (and canvas pan) from firing. The
    // click still fires afterwards (separate event) and opens the popover via
    // the Radix trigger — so we don't open it manually here.
    e.stopPropagation()
    draggedRef.current = false
    setDrag({
      seatId,
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      dy: 0,
      moved: false,
    })
  }

  const onPointerMove = (seatId: string) => (e: ReactPointerEvent) => {
    if (!drag || drag.seatId !== seatId) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    const moved = Math.hypot(dx, dy) > DRAG_THRESHOLD
    // Only capture once it's a real drag, so a plain click still reaches the
    // popover trigger.
    if (moved && !drag.moved) {
      e.currentTarget.setPointerCapture(e.pointerId)
      draggedRef.current = true
    }
    setDrag({ ...drag, dx, dy, moved: drag.moved || moved })
  }

  const onPointerUp =
    (seatId: string, baseX: number, baseY: number) =>
    (e: ReactPointerEvent) => {
      if (!drag || drag.seatId !== seatId) return
      if (drag.moved) {
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId)
        moveSeat(tableId, seatId, baseX + drag.dx / ppm, baseY + drag.dy / ppm)
      }
      setDrag(null)
    }

  const onClick = (e: ReactMouseEvent) => {
    // Don't let the seat click bubble up and select the table.
    e.stopPropagation()
    // After a drag, swallow the click so the popover trigger doesn't toggle.
    if (draggedRef.current) {
      e.preventDefault()
      draggedRef.current = false
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {placed.map((seat) => {
        const guest = occupantBySeat.get(seat.id) ?? null
        const occupied = guest != null
        const isDragging = drag?.seatId === seat.id
        const left = seat.x * ppm + (isDragging ? drag.dx : 0)
        const top = seat.y * ppm + (isDragging ? drag.dy : 0)

        const marker = (
          <div
            data-no-pan
            role="button"
            tabIndex={-1}
            aria-label={guest ? guest.name : undefined}
            title={guest ? guest.name : undefined}
            onPointerDown={isMeasuring ? undefined : onPointerDown(seat.id)}
            onPointerMove={isMeasuring ? undefined : onPointerMove(seat.id)}
            onPointerUp={
              isMeasuring ? undefined : onPointerUp(seat.id, seat.x, seat.y)
            }
            onClick={isMeasuring ? undefined : onClick}
            className={cn(
              "absolute flex items-center justify-center rounded-full font-medium select-none",
              !isMeasuring &&
                "pointer-events-auto cursor-grab touch-none active:cursor-grabbing",
              occupied
                ? "border border-emerald-600 bg-emerald-500 text-white shadow-sm"
                : "border border-emerald-300/70 bg-white/60 text-emerald-700",
              isDragging && "z-30 ring-2 ring-emerald-500"
            )}
            style={{
              left: left - seatPx / 2,
              top: top - seatPx / 2,
              width: seatPx,
              height: seatPx,
              fontSize: Math.max(7, seatPx * 0.42),
              printColorAdjust: "exact",
              WebkitPrintColorAdjust: "exact",
            }}
          >
            {occupied && showInitials ? getInitials(guest.name) : null}
          </div>
        )

        if (isMeasuring) return <div key={seat.id}>{marker}</div>

        return (
          <SeatAssignPopover
            key={seat.id}
            tableId={tableId}
            seatId={seat.id}
            occupantId={guest?.id ?? null}
            open={openSeatId === seat.id}
            onOpenChange={(o) => setOpenSeatId(o ? seat.id : null)}
          >
            {marker}
          </SeatAssignPopover>
        )
      })}
    </div>
  )
}
