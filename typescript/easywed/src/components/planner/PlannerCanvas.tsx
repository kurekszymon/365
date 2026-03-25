import { useRef, useState, useCallback, useEffect, useMemo } from "react"
import { PlusCircle } from "lucide-react"
import type { HallConfig, PlannerGuest, PlannerTable } from "@/lib/planner/types"
import { isPointInPolygon } from "@/lib/planner/types"
import { loadViewport, saveViewport } from "@/lib/planner/storage"
import { PlannerTableCard } from "./PlannerTable"
import { HallOverlay } from "./HallOverlay"

interface Props {
  tables: PlannerTable[]
  guests: PlannerGuest[]
  selectedGuestId: string | null
  selectedTableId: string | null
  onMoveTable: (id: string, x: number, y: number) => void
  onEditTable: (table: PlannerTable) => void
  onDeleteTable: (id: string) => void
  onUnassignGuest: (guestId: string) => void
  onAssignGuest: (tableId: string) => void
  onSelectTable: (id: string | null) => void
  onSelectHall: () => void
  onCursorMove: (canvasX: number, canvasY: number) => void
  hall: HallConfig | null
  hallSelected: boolean
  chairSizePx: number
}

export function PlannerCanvas({
  tables,
  guests,
  selectedGuestId,
  selectedTableId,
  onMoveTable,
  onEditTable,
  onDeleteTable,
  onUnassignGuest,
  onAssignGuest,
  onSelectTable,
  onSelectHall,
  onCursorMove,
  hall,
  hallSelected,
  chairSizePx,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Pan and scale as a single atomic state — keeps them in sync and avoids
  // the nested-setState anti-pattern that broke zoom-to-cursor.
  const [viewport, setViewport] = useState(() => {
    const v = loadViewport()
    return v ? { x: v.panX, y: v.panY, scale: v.scale } : { x: 0, y: 0, scale: 1 }
  })

  const panState = useRef<{
    startX: number
    startY: number
    startPanX: number
    startPanY: number
  } | null>(null)
  // Tracks whether the pointer moved enough to count as a pan (not a click).
  const didPan = useRef(false)

  useEffect(() => {
    saveViewport({ panX: viewport.x, panY: viewport.y, scale: viewport.scale })
  }, [viewport])

  const guestsByTable = useMemo(() => {
    const map: Record<string, PlannerGuest[]> = {}
    for (const g of guests) {
      if (g.tableId) (map[g.tableId] ??= []).push(g)
    }
    return map
  }, [guests])

  // Expose viewport scale to PlannerTableCard via data attribute (used for drag dx/dy conversion)
  if (canvasRef.current) {
    canvasRef.current.dataset.scale = String(viewport.scale)
  }

  const onCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("[data-table]")) return
      didPan.current = false
      ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
      panState.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPanX: viewport.x,
        startPanY: viewport.y,
      }
    },
    [viewport.x, viewport.y]
  )

  const onCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!panState.current) return
      // If the primary button was released outside the browser window we never
      // received a pointerup — detect it here and cancel the pan.
      if (!e.buttons) {
        panState.current = null
        return
      }
      const dx = e.clientX - panState.current.startX
      const dy = e.clientY - panState.current.startY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didPan.current = true
      // Capture values into locals before entering the updater — panState.current
      // could be nulled by a concurrent pointerup before the updater runs.
      const { startPanX, startPanY } = panState.current
      setViewport((prev) => ({
        ...prev,
        x: startPanX + dx,
        y: startPanY + dy,
      }))
    },
    []
  )

  const onCanvasPointerUp = useCallback(() => {
    panState.current = null
  }, [])

  const onCanvasPointerCancel = useCallback(() => {
    panState.current = null
  }, [])

  // Zoom to cursor — single atomic viewport update avoids nested setState
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      setViewport((prev) => {
        const newScale = Math.min(2, Math.max(0.4, prev.scale - e.deltaY * 0.001))
        return {
          scale: newScale,
          x: cx - ((cx - prev.x) / prev.scale) * newScale,
          y: cy - ((cy - prev.y) / prev.scale) * newScale,
        }
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
      onPointerCancel={onCanvasPointerCancel}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        onCursorMove(
          (e.clientX - rect.left - viewport.x) / viewport.scale,
          (e.clientY - rect.top - viewport.y) / viewport.scale,
        )
      }}
      // Table clicks stop propagation on their [data-table] wrapper so they
      // never reach here. Skip if pointer moved (pan gesture, not a click).
      onClick={(e) => {
        if (didPan.current) return
        const rect = e.currentTarget.getBoundingClientRect()
        const cx = (e.clientX - rect.left - viewport.x) / viewport.scale
        const cy = (e.clientY - rect.top - viewport.y) / viewport.scale
        if (hall && isPointInPolygon(cx, cy, hall.points)) {
          onSelectHall()
        } else {
          onSelectTable(null)
        }
      }}
    >
      {/* Inner canvas that gets transformed */}
      <div
        ref={canvasRef}
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        }}
      >
        {hall && <HallOverlay hall={hall} isSelected={hallSelected} />}

        {tables.map((table) => (
          <div key={table.id} data-table onClick={(e) => e.stopPropagation()}>
            <PlannerTableCard
              table={table}
              guests={guestsByTable[table.id] ?? []}
              selectedGuestId={selectedGuestId}
              isSelected={selectedTableId === table.id}
              onSelect={onSelectTable}
              onMove={onMoveTable}
              onEdit={onEditTable}
              onDelete={onDeleteTable}
              onUnassign={onUnassignGuest}
              onAssign={onAssignGuest}
              canvasRef={canvasRef}
              chairSizePx={chairSizePx}
              hall={hall}
            />
          </div>
        ))}
      </div>

      {tables.length === 0 && !hall && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <PlusCircle className="h-10 w-10 opacity-30" />
          <p className="text-sm">
            No tables yet — add one with the toolbar above
          </p>
        </div>
      )}

      <div className="absolute right-3 bottom-3 rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground tabular-nums backdrop-blur-sm">
        {Math.round(viewport.scale * 100)}%
      </div>
    </div>
  )
}
