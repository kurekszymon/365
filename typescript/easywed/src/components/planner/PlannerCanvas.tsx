import { useRef, useState, useCallback, useEffect } from "react"
import { PlusCircle } from "lucide-react"
import type { HallConfig, PlannerGuest, PlannerTable } from "@/lib/planner/types"
import { loadViewport, saveViewport } from "@/lib/planner/storage"
import { PlannerTableCard } from "./PlannerTable"
import { HallOverlay } from "./HallOverlay"

interface Props {
  tables: PlannerTable[]
  guests: PlannerGuest[]
  selectedGuestId: string | null
  onMoveTable: (id: string, x: number, y: number) => void
  onEditTable: (table: PlannerTable) => void
  onDeleteTable: (id: string) => void
  onUnassignGuest: (guestId: string) => void
  onAssignGuest: (tableId: string) => void
  hall: HallConfig | null
  chairSizePx: number
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
  hall,
  chairSizePx,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState(() => {
    const v = loadViewport()
    return v ? { x: v.panX, y: v.panY } : { x: 0, y: 0 }
  })
  const [scale, setScale] = useState(() => {
    const v = loadViewport()
    return v ? v.scale : 1
  })
  const panState = useRef<{
    startX: number
    startY: number
    startPanX: number
    startPanY: number
  } | null>(null)

  // Persist viewport to localStorage on change
  useEffect(() => {
    saveViewport({ panX: pan.x, panY: pan.y, scale })
  }, [pan, scale])

  // Expose pan + scale + snap to child via data attributes so PlannerTableCard can read them
  const snapGridPx = hall ? hall.pixelsPerMeter / 4 : 0
  if (canvasRef.current) {
    canvasRef.current.dataset.scale = String(scale)
    canvasRef.current.dataset.panx = String(pan.x)
    canvasRef.current.dataset.pany = String(pan.y)
    canvasRef.current.dataset.snap = String(snapGridPx)
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
    [pan]
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
    []
  )

  const onCanvasPointerUp = useCallback(() => {
    panState.current = null
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      // Cursor position relative to the container
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      setScale((prevScale) => {
        const newScale = Math.min(2, Math.max(0.4, prevScale - e.deltaY * 0.001))
        // Adjust pan so the canvas point under the cursor stays fixed
        setPan((prevPan) => ({
          x: cx - ((cx - prevPan.x) / prevScale) * newScale,
          y: cy - ((cy - prevPan.y) / prevScale) * newScale,
        }))
        return newScale
      })
    }
    el.addEventListener("wheel", handler, { passive: false })
    return () => el.removeEventListener("wheel", handler)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative flex-1 cursor-grab overflow-hidden bg-[radial-gradient(circle,_hsl(var(--border))_1px,_transparent_1px)] bg-[length:24px_24px] active:cursor-grabbing"
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
    >
      {/* Inner canvas that gets transformed */}
      <div
        ref={canvasRef}
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
        }}
      >
        {/* Hall overlay */}
        {hall && <HallOverlay hall={hall} />}

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
              chairSizePx={chairSizePx}
            />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {tables.length === 0 && !hall && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <PlusCircle className="h-10 w-10 opacity-30" />
          <p className="text-sm">
            No tables yet — add one with the toolbar above
          </p>
        </div>
      )}

      {/* Zoom indicator */}
      <div className="absolute right-3 bottom-3 rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground tabular-nums backdrop-blur-sm">
        {Math.round(scale * 100)}%
      </div>
    </div>
  )
}
