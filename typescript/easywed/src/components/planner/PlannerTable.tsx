import { memo, useRef } from "react"
import { useDroppable } from "@dnd-kit/core"
import { X } from "lucide-react"
import type { HallConfig, PlannerGuest, PlannerTable } from "@/lib/planner/types"
import { DIETARY_COLORS, getPolygonBounds, isRectInPolygon } from "@/lib/planner/types"
import { cn } from "@/lib/utils"

interface Props {
  table: PlannerTable
  guests: PlannerGuest[]
  selectedGuestId: string | null
  isSelected: boolean
  onSelect: (id: string | null) => void
  onMove: (id: string, x: number, y: number) => void
  onEdit: (table: PlannerTable) => void
  onDelete: (id: string) => void
  onUnassign: (guestId: string) => void
  onAssign: (tableId: string) => void
  canvasRef: React.RefObject<HTMLDivElement | null>
  chairSizePx: number
  hall: HallConfig | null
}

// ---------------------------------------------------------------------------
// Chair position calculators
// ---------------------------------------------------------------------------

/**
 * Returns SVG centre-points for chairs evenly distributed around a round table.
 * Coordinates are relative to the table's top-left corner (0,0).
 * The first chair sits at the top (−π/2) and the rest follow clockwise.
 */
function getChairPositionsRound(
  capacity: number,
  diameter: number,
  chairSize: number
): { cx: number; cy: number }[] {
  const radius = diameter / 2 + chairSize / 2 + 4 // 4px gap
  const positions: { cx: number; cy: number }[] = []
  for (let i = 0; i < capacity; i++) {
    const angle = (2 * Math.PI * i) / capacity - Math.PI / 2
    positions.push({
      cx: diameter / 2 + radius * Math.cos(angle),
      cy: diameter / 2 + radius * Math.sin(angle),
    })
  }
  return positions
}

/**
 * Returns SVG centre-points for chairs evenly distributed around a rectangular table.
 * Chairs are spread by arc-length along the perimeter (top → right → bottom → left),
 * offset outward by half the chair diameter + 4 px gap.
 * Coordinates are relative to the table's top-left corner (0,0).
 */
function getChairPositionsRect(
  capacity: number,
  w: number,
  h: number,
  chairSize: number
): { cx: number; cy: number }[] {
  const gap = chairSize / 2 + 4
  const positions: { cx: number; cy: number }[] = []
  // Distribute chairs around perimeter: top, right, bottom, left
  const perimeter = 2 * (w + h)
  for (let i = 0; i < capacity; i++) {
    const t = ((i + 0.5) / capacity) * perimeter
    let cx: number, cy: number
    if (t < w) {
      // top edge
      cx = t
      cy = -gap
    } else if (t < w + h) {
      // right edge
      cx = w + gap
      cy = t - w
    } else if (t < 2 * w + h) {
      // bottom edge
      cx = w - (t - w - h)
      cy = h + gap
    } else {
      // left edge
      cx = -gap
      cy = h - (t - 2 * w - h)
    }
    positions.push({ cx, cy })
  }
  return positions
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PlannerTableCard = memo(function TableCard({
  table,
  guests,
  selectedGuestId,
  isSelected,
  onSelect,
  onMove,
  onEdit,
  onDelete,
  onUnassign,
  onAssign,
  canvasRef,
  chairSizePx,
  hall,
}: Props) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: table.id })

  const dragState = useRef<{
    startMouseX: number
    startMouseY: number
    startTableX: number
    startTableY: number
    scale: number
    moved: boolean
    lastX: number
    lastY: number
  } | null>(null)


  const isRound = table.shape === "round"
  const isFull = guests.length >= table.capacity
  const canAcceptGuest = selectedGuestId !== null && !isFull
  const dropHighlight = isOver && !isFull
  const dropBlocked = isOver && isFull

  const w = table.widthPx
  const h = table.heightPx

  /**
   * Clamps a desired table position so the table (including chair overflow) stays
   * fully inside the hall polygon, then snaps to the 1/4 m grid.
   *
   * Three-step pipeline:
   *   1. Bounding-box clamp — fast O(1) rejection against the polygon's AABB.
   *      Handles all outer-wall collisions and lets tables slide smoothly along
   *      straight edges without ever entering the binary search.
   *   2. Per-axis binary search (10 iterations, sub-pixel precision) — handles
   *      concave walls (L/U notches). Tries moving each axis independently first:
   *      if X-only fits, keep X and bisect Y; if Y-only fits, keep Y and bisect X;
   *      otherwise bisect both independently. `prevX/Y` (last valid position) is
   *      the "good" anchor so the search always converges toward a reachable point.
   *   3. Snap AFTER constraint — rounds to the nearest 1/4 m grid point and accepts
   *      it only if it also passes `isRectInPolygon`. Doing snap last prevents the
   *      classic fight where snap pushes the table into a wall and the constraint
   *      pushes it back out, causing oscillation.
   *
   * @param desiredX  Raw desired canvas-pixel X (from mouse delta, unsnapped).
   * @param desiredY  Raw desired canvas-pixel Y.
   * @param prevX     Last successfully constrained X — binary search anchor.
   * @param prevY     Last successfully constrained Y — binary search anchor.
   */
  function resolvePosition(
    desiredX: number,
    desiredY: number,
    prevX: number,
    prevY: number,
  ) {
    if (!hall) return { x: desiredX, y: desiredY }

    const co = chairSizePx + 4 // chair overflow beyond table edge
    const poly = hall.points
    const fits = (px: number, py: number) =>
      isRectInPolygon(px - co, py - co, w + 2 * co, h + 2 * co, poly)

    // 1) Clamp to bounding box — smooth sliding along outer walls
    const bounds = getPolygonBounds(poly)
    let cx = desiredX
    let cy = desiredY
    if (bounds) {
      cx = Math.max(bounds.minX + co, Math.min(bounds.maxX - w - co, cx))
      cy = Math.max(bounds.minY + co, Math.min(bounds.maxY - h - co, cy))
    }

    // 2) Per-axis binary search for concave walls (L/U notch)
    if (!fits(cx, cy)) {
      const bisect = (lo: number, hi: number, test: (v: number) => boolean) => {
        for (let i = 0; i < 10; i++) {
          const mid = (lo + hi) / 2
          if (test(mid)) lo = mid
          else hi = mid
        }
        return lo
      }
      if (fits(cx, prevY)) {
        // X movement is valid — binary search Y from last valid position
        cy = bisect(prevY, cy, (y) => fits(cx, y))
      } else if (fits(prevX, cy)) {
        // Y movement is valid — binary search X from last valid position
        cx = bisect(prevX, cx, (x) => fits(x, cy))
      } else {
        // Neither axis individually; search each independently
        cx = bisect(prevX, cx, (x) => fits(x, prevY))
        cy = bisect(prevY, cy, (y) => fits(cx, y))
      }
    }

    // 3) Snap to 1/4 m grid AFTER constraint so snap never fights the wall
    const snap = hall.pixelsPerMeter / 4
    const sx = Math.round(cx / snap) * snap
    const sy = Math.round(cy / snap) * snap
    return fits(sx, sy) ? { x: sx, y: sy } : { x: cx, y: cy }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return
    e.stopPropagation()
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    const scale = parseFloat(canvasRef.current?.dataset.scale ?? "1")
    dragState.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startTableX: table.x,
      startTableY: table.y,
      scale,
      moved: false,
      lastX: table.x,
      lastY: table.y,
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current) return
    // Primary button released outside the browser window — no pointerup was
    // delivered. `e.buttons` is 0 when no buttons are held; cancel the drag.
    if (!e.buttons) {
      dragState.current = null
      return
    }
    const { startMouseX, startMouseY, startTableX, startTableY, scale, lastX, lastY } =
      dragState.current
    const dx = e.clientX - startMouseX
    const dy = e.clientY - startMouseY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragState.current.moved = true
    }
    if (dragState.current.moved) {
      const { x, y } = resolvePosition(
        startTableX + dx / scale,
        startTableY + dy / scale,
        lastX,
        lastY,
      )
      dragState.current.lastX = x
      dragState.current.lastY = y
      // Apply directly to DOM for zero-latency visual update, then commit to state
      e.currentTarget.style.transform = `translate(${x}px, ${y}px)`
      onMove(table.id, x, y)
    }
  }

  function onPointerUp() {
    if (!dragState.current) return
    if (!dragState.current.moved) {
      if (selectedGuestId && canAcceptGuest) {
        onAssign(table.id)
      } else {
        onSelect(isSelected ? null : table.id)
      }
    }
    dragState.current = null
  }

  /** Fires when the pointer capture is forcibly released (e.g. touch interrupted). */
  function onPointerCancel() {
    dragState.current = null
  }

  function onDoubleClick(e: React.MouseEvent) {
    e.stopPropagation()
    onSelect(null)
    onEdit(table)
  }

  const commonWrapperProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onDoubleClick,
  }

  // Chair positions
  const chairs = isRound
    ? getChairPositionsRound(table.capacity, w, chairSizePx)
    : getChairPositionsRect(table.capacity, w, h, chairSizePx)

  // Compute the bounding box expansion for chairs so the outer wrapper is large enough
  const chairR = chairSizePx / 2
  const expandTop = Math.max(0, ...chairs.map((c) => -(c.cy - chairR)))
  const expandLeft = Math.max(0, ...chairs.map((c) => -(c.cx - chairR)))
  const expandRight = Math.max(0, ...chairs.map((c) => c.cx + chairR - w))
  const expandBottom = Math.max(0, ...chairs.map((c) => c.cy + chairR - h))

  const totalW = expandLeft + w + expandRight
  const totalH = expandTop + h + expandBottom

  // Chair SVG layer
  const chairLayer = (
    <svg
      className="pointer-events-none absolute"
      style={{
        left: -expandLeft,
        top: -expandTop,
        width: totalW,
        height: totalH,
      }}
    >
      {chairs.map((c, i) => {
        const seated = i < guests.length
        return (
          <circle
            key={i}
            cx={c.cx + expandLeft}
            cy={c.cy + expandTop}
            r={chairR}
            fill={seated ? "hsl(var(--primary) / 0.15)" : "hsl(var(--muted))"}
            stroke={seated ? "hsl(var(--primary))" : "hsl(var(--border))"}
            strokeWidth={1.5}
          />
        )
      })}
    </svg>
  )

  if (isRound) {
    return (
      <div
        ref={setDropRef}
        className={cn(
          "absolute touch-none select-none",
          "rounded-full",
          "border-2 bg-white shadow-md transition-[border-color,box-shadow]",
          "flex flex-col items-center justify-center",
          "cursor-grab active:cursor-grabbing",
          dropHighlight && "border-primary shadow-lg ring-4 ring-primary/20",
          dropBlocked && "border-destructive ring-4 ring-destructive/20",
          canAcceptGuest && !isOver && "cursor-pointer border-primary/50",
          !dropHighlight && !dropBlocked && !canAcceptGuest && "border-border"
        )}
        style={{
          width: w,
          height: h,
          transform: `translate(${table.x}px, ${table.y}px)`,
        }}
        {...commonWrapperProps}
      >
        {chairLayer}

        {/* Table name */}
        <span className="line-clamp-2 w-full px-6 text-center text-xs leading-tight font-semibold">
          {table.name}
        </span>

        {/* Capacity */}
        <span
          className={cn(
            "mt-0.5 text-[11px] tabular-nums",
            isFull ? "font-medium text-destructive" : "text-muted-foreground"
          )}
        >
          {guests.length}/{table.capacity}
        </span>

        {/* Guest initials */}
        {guests.length > 0 && (
          <div className="mt-1.5 flex max-w-[88px] flex-wrap justify-center gap-0.5">
            {guests.slice(0, 6).map((g) => (
              <span
                key={g.id}
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold",
                  DIETARY_COLORS[g.dietary[0] ?? "empty"]
                )}
                title={g.name}
              >
                {g.name[0]?.toUpperCase()}
              </span>
            ))}
            {guests.length > 6 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] text-muted-foreground">
                +{guests.length - 6}
              </span>
            )}
          </div>
        )}

        {canAcceptGuest && (
          <span className="absolute -bottom-6 text-[10px] font-medium whitespace-nowrap text-primary">
            drop or tap to seat
          </span>
        )}
      </div>
    )
  }

  // Rectangular table
  return (
    <div
      ref={setDropRef}
      className={cn(
        "absolute touch-none select-none",
        "rounded-xl",
        "border bg-white shadow-md transition-[border-color,box-shadow]",
        "cursor-grab active:cursor-grabbing",
        dropHighlight && "border-primary shadow-lg ring-4 ring-primary/20",
        dropBlocked && "border-destructive ring-4 ring-destructive/20",
        canAcceptGuest && !isOver && "cursor-pointer border-primary/50",
        !dropHighlight && !dropBlocked && !canAcceptGuest && "border-border"
      )}
      style={{
        width: w,
        minHeight: h,
        transform: `translate(${table.x}px, ${table.y}px)`,
      }}
      {...commonWrapperProps}
    >
      {chairLayer}

      {/* Header */}
      <div className="flex items-center justify-between gap-1 px-3 pt-2.5 pb-1">
        <span className="truncate text-xs font-semibold">{table.name}</span>
        <span
          className={cn(
            "shrink-0 text-[10px] font-medium tabular-nums",
            isFull ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {guests.length}/{table.capacity}
        </span>
      </div>

      {/* Guest chips */}
      {guests.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pb-2.5">
          {guests.map((g) => (
            <span
              key={g.id}
              className={cn(
                "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                DIETARY_COLORS[g.dietary[0] ?? "empty"]
              )}
            >
              {g.name.split(" ")[0]}
              <button
                className="ml-0.5 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onUnassign(g.id)
                }}
                aria-label={`Unassign ${g.name}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {guests.length === 0 && (
        <p className="px-3 pb-2.5 text-[10px] text-muted-foreground italic">
          No guests yet
        </p>
      )}

      {canAcceptGuest && (
        <div className="absolute inset-x-0 -bottom-6 text-center text-[10px] font-medium text-primary">
          drop or tap to seat
        </div>
      )}
    </div>
  )
})
