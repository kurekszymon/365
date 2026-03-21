import { useRef, useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { X, Pencil, Trash2 } from "lucide-react"
import type { PlannerGuest, PlannerTable } from "@/lib/planner/types"
import { DIETARY_COLORS } from "@/lib/planner/types"
import { cn } from "@/lib/utils"

interface Props {
  table: PlannerTable
  guests: PlannerGuest[]
  selectedGuestId: string | null
  onMove: (id: string, x: number, y: number) => void
  onEdit: (table: PlannerTable) => void
  onDelete: (id: string) => void
  onUnassign: (guestId: string) => void
  onAssign: (tableId: string) => void
  canvasRef: React.RefObject<HTMLDivElement | null>
}

export function PlannerTableCard({
  table,
  guests,
  selectedGuestId,
  onMove,
  onEdit,
  onDelete,
  onUnassign,
  onAssign,
  canvasRef,
}: Props) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: table.id })

  const dragState = useRef<{
    startMouseX: number
    startMouseY: number
    startTableX: number
    startTableY: number
    scale: number
    moved: boolean
  } | null>(null)

  const [showActions, setShowActions] = useState(false)

  const isRound = table.shape === "round"
  const isFull = guests.length >= table.capacity
  const canAcceptGuest = selectedGuestId !== null && !isFull
  const dropHighlight = isOver && !isFull
  const dropBlocked = isOver && isFull

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return
    e.stopPropagation()
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    // Capture scale once at drag start — no getBoundingClientRect() needed.
    const scale = parseFloat(canvasRef.current?.dataset.scale ?? "1")
    dragState.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startTableX: table.x,
      startTableY: table.y,
      scale,
      moved: false,
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current) return
    const { startMouseX, startMouseY, startTableX, startTableY, scale } =
      dragState.current
    const dx = e.clientX - startMouseX
    const dy = e.clientY - startMouseY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragState.current.moved = true
    }
    if (dragState.current.moved) {
      const newX = startTableX + dx / scale
      const newY = startTableY + dy / scale
      onMove(table.id, Math.max(0, newX), Math.max(0, newY))
    }
  }

  function onPointerUp() {
    if (!dragState.current) return
    if (!dragState.current.moved) {
      if (selectedGuestId && canAcceptGuest) {
        onAssign(table.id)
      } else {
        setShowActions((v) => !v)
      }
    }
    dragState.current = null
  }

  const commonWrapperProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }

  const actionBar = showActions && !selectedGuestId && (
    <div
      className="absolute -top-8 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-lg border bg-white px-1.5 py-1 shadow-lg"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        className="rounded p-1 hover:bg-muted"
        onClick={(e) => {
          e.stopPropagation()
          setShowActions(false)
          onEdit(table)
        }}
        aria-label="Edit table"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        className="rounded p-1 text-destructive hover:bg-destructive/10"
        onClick={(e) => {
          e.stopPropagation()
          setShowActions(false)
          onDelete(table.id)
        }}
        aria-label="Delete table"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )

  if (isRound) {
    return (
      <div
        ref={setDropRef}
        className={cn(
          "absolute touch-none select-none",
          "h-40 w-40 rounded-full",
          "border-2 bg-white shadow-md transition-[border-color,box-shadow]",
          "flex flex-col items-center justify-center",
          "cursor-grab active:cursor-grabbing",
          dropHighlight && "border-primary shadow-lg ring-4 ring-primary/20",
          dropBlocked && "border-destructive ring-4 ring-destructive/20",
          canAcceptGuest && !isOver && "cursor-pointer border-primary/50",
          !dropHighlight && !dropBlocked && !canAcceptGuest && "border-border"
        )}
        style={{ transform: `translate(${table.x}px, ${table.y}px)` }}
        {...commonWrapperProps}
      >
        {actionBar}

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
                  DIETARY_COLORS[g.dietary]
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
        "min-h-[80px] w-[184px] rounded-xl",
        "border bg-white shadow-md transition-[border-color,box-shadow]",
        "cursor-grab active:cursor-grabbing",
        dropHighlight && "border-primary shadow-lg ring-4 ring-primary/20",
        dropBlocked && "border-destructive ring-4 ring-destructive/20",
        canAcceptGuest && !isOver && "cursor-pointer border-primary/50",
        !dropHighlight && !dropBlocked && !canAcceptGuest && "border-border"
      )}
      style={{ transform: `translate(${table.x}px, ${table.y}px)` }}
      {...commonWrapperProps}
    >
      {actionBar}

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
                DIETARY_COLORS[g.dietary]
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
}
