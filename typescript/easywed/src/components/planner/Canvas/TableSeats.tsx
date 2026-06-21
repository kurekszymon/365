import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { clamp } from "./utils"
import {
  constrainSeatPosition,
  effectiveSeats,
  resolveSeatOccupants,
} from "./seatLayout"
import { SeatAssignPopover } from "./SeatAssignPopover"
import type {
  KeyboardEvent as ReactKeyboardEvent,
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
  // When false, empty (unoccupied) seat positions are not rendered. Defaults to
  // true so the canvas is unaffected; used by the print view's "occupied only" mode.
  showEmpty?: boolean
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
  showEmpty = true,
}: TableSeatsProps) => {
  const { t } = useTranslation()
  const isMeasuring = useViewStore((state) => state.isMeasuring)
  const moveSeat = usePlannerStore((state) => state.moveSeat)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [openSeatId, setOpenSeatId] = useState<string | null>(null)
  // Set when a press turns into a drag, so the trailing click doesn't also open
  // the popover (the click fires after pointerup on the same element).
  const draggedRef = useRef(false)

  const placed = effectiveSeats(shape, widthM, heightM, capacity, overrides)
  if (placed.length === 0) return null

  const occupantBySeat = resolveSeatOccupants(placed, guests)

  const seatPx = clamp(ppm * 0.34, 12, 22)
  const showInitials = seatPx >= 14

  const onPointerDown = (seatId: string) => (e: ReactPointerEvent) => {
    if (isMeasuring) return
    // Keep the parent table's dnd-kit drag (and canvas pan) from firing. The
    // click still fires afterwards (separate event) and opens the popover via
    // the Radix trigger — so we don't open it manually here.
    e.stopPropagation()
    draggedRef.current = false
    // Capture immediately, not on the first threshold-crossing move. Seat
    // markers are tiny, so a quick flick onto the table can leave the marker
    // before any pointermove fires on it — without early capture the move/up
    // events route to the table underneath instead, stranding the drag state
    // (it never gets cleared) and leaking a click that opens the table editor.
    e.currentTarget.setPointerCapture(e.pointerId)
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
    // Mark as a real drag once past the threshold so the trailing click is
    // swallowed (a plain click still reaches the popover trigger). Close any
    // open assign popover — the canvas is too busy to drag a seat and keep the
    // menu up. Pointer capture is already established in onPointerDown.
    if (moved && !drag.moved) {
      draggedRef.current = true
      setOpenSeatId(null)
    }
    setDrag({ ...drag, dx, dy, moved: drag.moved || moved })
  }

  const onPointerUp =
    (seatId: string, baseX: number, baseY: number) =>
    (e: ReactPointerEvent) => {
      if (!drag || drag.seatId !== seatId) return
      if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId)
      if (drag.moved) {
        const c = constrainSeatPosition(
          shape,
          widthM,
          heightM,
          baseX + drag.dx / ppm,
          baseY + drag.dy / ppm
        )
        moveSeat(tableId, seatId, c.x, c.y)
      }
      setDrag(null)
    }

  // If the pointer stream is canceled (e.g. the OS steals it, a gesture aborts),
  // pointerup never fires — reset so the seat doesn't get stuck mid-drag.
  const onPointerCancel = () => {
    setDrag(null)
    draggedRef.current = false
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

  // The seat is a div (role="button"), so Enter/Space don't synthesize a click
  // the way they would on a native button — open the assign popover ourselves.
  const onKeyDown = (seatId: string) => (e: ReactKeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setOpenSeatId((current) => (current === seatId ? null : seatId))
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {placed.map((seat) => {
        const guest = occupantBySeat.get(seat.id) ?? null
        const occupied = guest != null
        if (!showEmpty && !occupied) return null
        const isDragging = drag?.seatId === seat.id
        // While dragging, preview the constrained position (band hugging the
        // table edge) so the seat can't visually land on or far from the table.
        const previewed = isDragging
          ? constrainSeatPosition(
              shape,
              widthM,
              heightM,
              seat.x + drag.dx / ppm,
              seat.y + drag.dy / ppm
            )
          : seat
        const left = previewed.x * ppm
        const top = previewed.y * ppm

        const marker = (
          <div
            data-no-pan
            role="button"
            tabIndex={isMeasuring ? -1 : 0}
            aria-label={guest ? guest.name : t("seats.empty")}
            title={guest ? guest.name : undefined}
            onPointerDown={isMeasuring ? undefined : onPointerDown(seat.id)}
            onPointerMove={isMeasuring ? undefined : onPointerMove(seat.id)}
            onPointerUp={
              isMeasuring ? undefined : onPointerUp(seat.id, seat.x, seat.y)
            }
            onPointerCancel={isMeasuring ? undefined : onPointerCancel}
            onKeyDown={isMeasuring ? undefined : onKeyDown(seat.id)}
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
