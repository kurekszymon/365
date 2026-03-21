import { useRef, useState, useCallback } from "react"
import { PlusCircle } from "lucide-react"
import type { PlannerGuest, PlannerTable } from "@/lib/planner/types"
import { PlannerTableCard } from "./PlannerTable"

interface Props {
  tables: PlannerTable[]
  guests: PlannerGuest[]
  selectedGuestId: string | null
  onMoveTable: (id: string, x: number, y: number) => void
  onEditTable: (table: PlannerTable) => void
  onDeleteTable: (id: string) => void
  onUnassignGuest: (guestId: string) => void
  onAssignGuest: (tableId: string) => void
}

export function PlannerCanvas({
  tables,
  guests,
  selectedGuestId,
  onMoveTable,
  onEditTable,
  onDeleteTable,
  onUnassignGuest,
  onAssignGuest,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const panState = useRef<{
    startX: number
    startY: number
    startPanX: number
    startPanY: number
  } | null>(null)

  // Expose pan + scale to child via data attributes so PlannerTableCard can read them
  if (canvasRef.current) {
    canvasRef.current.dataset.scale = String(scale)
    canvasRef.current.dataset.panx = String(pan.x)
    canvasRef.current.dataset.pany = String(pan.y)
  }

  const onCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("[data-table]")) return
      ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
      panState.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      }
    },
    [pan],
  )

  const onCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!panState.current) return
      const dx = e.clientX - panState.current.startX
      const dy = e.clientY - panState.current.startY
      setPan({
        x: panState.current.startPanX + dx,
        y: panState.current.startPanY + dy,
      })
    },
    [],
  )

  const onCanvasPointerUp = useCallback(() => {
    panState.current = null
  }, [])

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    setScale((s) => Math.min(2, Math.max(0.4, s - e.deltaY * 0.001)))
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden bg-[radial-gradient(circle,_hsl(var(--border))_1px,_transparent_1px)] bg-[length:24px_24px] cursor-grab active:cursor-grabbing"
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
      onWheel={onWheel}
    >
      {/* Inner canvas that gets transformed */}
      <div
        ref={canvasRef}
        className="absolute inset-0 origin-top-left"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
      >
        {tables.map((table) => (
          <div key={table.id} data-table>
            <PlannerTableCard
              table={table}
              guests={guests.filter((g) => g.tableId === table.id)}
              selectedGuestId={selectedGuestId}
              onMove={onMoveTable}
              onEdit={onEditTable}
              onDelete={onDeleteTable}
              onUnassign={onUnassignGuest}
              onAssign={onAssignGuest}
              canvasRef={canvasRef}
            />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {tables.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <PlusCircle className="h-10 w-10 opacity-30" />
          <p className="text-sm">
            No tables yet — add one with the toolbar above
          </p>
        </div>
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 rounded-md border bg-background/80 px-2 py-1 text-[10px] tabular-nums text-muted-foreground backdrop-blur-sm">
        {Math.round(scale * 100)}%
      </div>
    </div>
  )
}
