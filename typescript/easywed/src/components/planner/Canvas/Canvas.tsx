import { DndContext, useDroppable } from "@dnd-kit/core"

import { useTranslation } from "react-i18next"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { clampToHall } from "./utils"
import { ScalePill } from "./ScalePill"
import { DimensionLabel } from "./DimensionLabel"
import { CanvasContextMenu } from "./CanvasContextMenu"

import { CanvasEmptyState } from "./CanvasEmptyState"
import { PIXELS_PER_METER, VIEWPORT_MARGIN } from "./consts"
import { DraggableTable } from "./DraggableTable"
import type { DragEndEvent } from "@dnd-kit/core"
import type { Position, Table } from "@/stores/planner.store"
import { usePlannerStore } from "@/stores/planner.store"
import { useDialogStore } from "@/stores/dialog.store"
import { useElementSize } from "@/hooks/useElementSize"

export const Canvas = () => {
  const { t } = useTranslation()
  const { setNodeRef: setDropRef } = useDroppable({ id: "hall-identifier" })

  const {
    hall,
    tables,
    updateTablePosition,
    resetZoomAndPan,
    stepZoom,
    setPan,
  } = usePlannerStore(
    useShallow((state) => ({
      hall: state.hall,
      tables: state.tables,
      updateTablePosition: state.updateTablePosition,
      resetZoomAndPan: state.resetHallZoomAndPan,
      stepZoom: state.stepHallZoom,
      setPan: state.setHallPan,
    }))
  )

  const dialog = useDialogStore(
    useShallow((state) => ({
      open: state.open,
    }))
  )

  const {
    width: containerWidth,
    height: containerHeight,
    ref: containerRef,
    element: containerEl,
  } = useElementSize()

  const [isPanning, setIsPanning] = useState(false)
  const panOffsetRef = useRef<Position | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTouchRef = useRef<{ clientX: number; clientY: number } | null>(
    null
  )

  const hallWidth = Math.round(hall.dimensions.width * PIXELS_PER_METER)
  const hallHeight = Math.round(hall.dimensions.height * PIXELS_PER_METER)

  const baseScale = useMemo(() => {
    if (containerWidth <= 0 || containerHeight <= 0) return 1

    return Math.max(
      0.01,
      Math.min(
        (containerWidth - VIEWPORT_MARGIN * 2) / hallWidth,
        (containerHeight - VIEWPORT_MARGIN * 2) / hallHeight
      )
    )
  }, [containerWidth, containerHeight, hallWidth, hallHeight])

  const scale = baseScale * hall.zoom
  const scaledWidth = hallWidth * scale
  const scaledHeight = hallHeight * scale
  const hallLeft = (containerWidth - scaledWidth) / 2 + hall.pan.x
  const hallTop = (containerHeight - scaledHeight) / 2 + hall.pan.y

  const ppm = PIXELS_PER_METER * scale

  const canvasTables: Array<Table> = useMemo(
    () =>
      tables.map((table) => ({
        ...table,
        position: clampToHall(
          table.position,
          table.size,
          hall.dimensions.width,
          hall.dimensions.height
        ),
      })),
    [tables, hall.dimensions]
  )

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest("button, [data-no-pan]")) return

    panOffsetRef.current = {
      x: e.clientX - hall.pan.x,
      y: e.clientY - hall.pan.y,
    }

    setIsPanning(true)
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!panOffsetRef.current) return

    setPan({
      x: e.clientX - panOffsetRef.current.x,
      y: e.clientY - panOffsetRef.current.y,
    })
  }
  function endPan() {
    if (!panOffsetRef.current) return
    panOffsetRef.current = null
    setIsPanning(false)
  }

  function viewportToHall(clientX: number, clientY: number): Position {
    return {
      x: Math.max(0, (clientX - hallLeft) / ppm),
      y: Math.max(0, (clientY - hallTop) / ppm),
    }
  }

  function handleAddTable(hallPosition: Position) {
    dialog.open("Table.Add", { spawnPosition: hallPosition })
  }

  function handleTouchStart(e: React.TouchEvent) {
    if ((e.target as HTMLElement).closest("button, [data-no-pan]")) return
    const touch = e.touches[0]
    longPressTouchRef.current = {
      clientX: touch.clientX,
      clientY: touch.clientY,
    }
    longPressTimerRef.current = setTimeout(() => {
      if (!longPressTouchRef.current) return
      const t = longPressTouchRef.current
      e.currentTarget.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          clientX: t.clientX,
          clientY: t.clientY,
          button: 2,
        })
      )
    }, 500)
  }

  function handleTouchEnd() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressTouchRef.current = null
  }

  function handleTouchMove() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressTouchRef.current = null
  }

  function handleDragEnd(e: DragEndEvent) {
    const id = String(e.active.id)
    const table = canvasTables.find((ct) => ct.id === id)

    if (!table) return

    const next = clampToHall(
      {
        x: table.position.x + e.delta.x / ppm,
        y: table.position.y + e.delta.y / ppm,
      },
      table.size,
      hall.dimensions.width,
      hall.dimensions.height
    )

    updateTablePosition(id, next.x, next.y)
  }

  const onWheel = useCallback(
    (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      e.stopPropagation()
      stepZoom(e.deltaY > 0 ? -1 : 1)
    },
    [stepZoom]
  )

  useEffect(() => {
    if (!containerEl) return

    containerEl.addEventListener("wheel", onWheel, { passive: false })

    return () => containerEl.removeEventListener("wheel", onWheel)
  }, [containerEl, onWheel])

  if (!hall.preset) {
    return (
      <CanvasEmptyState
        onClick={() => dialog.open("Hall.Configure")}
        message={t("hall.empty_state")}
      />
    )
  }

  return (
    <CanvasContextMenu
      onAddTable={handleAddTable}
      viewportToHall={viewportToHall}
    >
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-gradient-to-br from-slate-100 via-zinc-50 to-emerald-50/70"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onMouseUp={endPan}
        onMouseLeave={endPan}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        <ScalePill reset={resetZoomAndPan} scale={hall.zoom} />

        <DimensionLabel
          orientation="horizontal"
          value={hall.dimensions.width}
          left={hallLeft}
          top={hallTop - 28}
          span={scaledWidth}
        />

        <DimensionLabel
          orientation="vertical"
          value={hall.dimensions.height}
          left={hallLeft - 52}
          top={hallTop}
          span={scaledHeight}
        />

        <DndContext onDragEnd={handleDragEnd}>
          <div
            ref={setDropRef}
            className="absolute z-10 bg-white shadow-md ring-2 ring-emerald-400"
            style={{
              left: hallLeft,
              top: hallTop,
              width: scaledWidth,
              height: scaledHeight,
              backgroundImage: `radial-gradient(circle, rgb(156 163 175 / ${hall.zoom}) 1px, transparent 1px)`,
              // can be adjusted if we want a different grid spacing or something, but it seems to work well for now
              backgroundSize: `${ppm}px ${ppm}px`, // ppm is (scaled) pixels per meter, so this creates a grid with 1m spacing -
              // let user decide if they want to start the grid offset at half a meter or not - maybe add a toggle for it in the future
              // backgroundPosition: `${ppm / 2}px ${ppm / 2}px`,
            }}
          >
            {canvasTables.map((ct) => (
              <DraggableTable
                key={ct.id}
                table={ct}
                hallWidth={hall.dimensions.width}
                hallHeight={hall.dimensions.height}
                ppm={ppm}
              />
            ))}
          </div>
        </DndContext>
      </div>
    </CanvasContextMenu>
  )
}
