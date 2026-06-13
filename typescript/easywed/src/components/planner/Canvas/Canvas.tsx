import { useTranslation } from "react-i18next"
import { useEffect, useRef } from "react"
import { useShallow } from "zustand/react/shallow"
import {
  DotIcon,
  Grid2x2XIcon,
  Grid3x3Icon,
  LayoutPanelLeftIcon,
  RulerIcon,
  SquarePlusIcon,
  TableIcon,
} from "lucide-react"
import { usePinch } from "@use-gesture/react"
import { ScalePill } from "./ScalePill"
import { DimensionLabel } from "./DimensionLabel"
import { CanvasContextMenu } from "./CanvasContextMenu"
import { CanvasContextMenuItem } from "./CanvasContextMenuItem"
import { CanvasEmptyState } from "./CanvasEmptyState"
import { HallSurface } from "./HallSurface"
import { findCapturedElement, snapPositionToGrid } from "./utils"
import { useHallGeometry } from "./useHallGeometry"
import { useCanvasPan } from "./useCanvasPan"
import type { HallSurfaceMethods } from "./HallSurface"
import type { GridStyle, SnapStep } from "@/stores/view.store"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DEFAULT_FIXTURE,
  DEFAULT_TABLE,
  usePlannerStore,
} from "@/stores/planner.store"
import { ZOOM_MAX, ZOOM_MIN, useViewStore } from "@/stores/view.store"
import { usePanelStore } from "@/stores/panel.store"
import { useElementSize } from "@/hooks/useElementSize"
import { useIsMobile } from "@/hooks/useMediaQuery"
import { useOpenHall } from "@/hooks/useOpenHall"

const GRID_ICON: Record<GridStyle, React.ReactNode> = {
  dots: <DotIcon className="size-3.5" />,
  grid: <Grid3x3Icon className="size-3.5" />,
  off: <Grid2x2XIcon className="size-3.5" />,
}

const NEXT_GRID_STYLE: Record<GridStyle, GridStyle> = {
  dots: "off",
  grid: "dots",
  off: "grid",
}

const SNAP_STEPS: Array<SnapStep> = ["off", 0.1, 0.25, 0.5, 1]

export const Canvas = () => {
  const { t } = useTranslation()

  const hall = usePlannerStore((state) => state.hall)

  const zoom = useViewStore((state) => state.zoom)
  const setZoom = useViewStore((state) => state.setZoom)
  const pan = useViewStore((state) => state.pan)
  const snapStep = useViewStore((state) => state.snapStep)
  const gridStyle = useViewStore((state) => state.gridStyle)
  const gridSpacing = useViewStore((state) => state.gridSpacing)
  const stepZoom = useViewStore((state) => state.stepZoom)
  const setPan = useViewStore((state) => state.setPan)
  const resetZoomAndPan = useViewStore((state) => state.resetZoomAndPan)
  const isMeasuring = useViewStore((state) => state.isMeasuring)
  const toggleMeasuring = useViewStore((state) => state.toggleMeasuring)
  const measureMode = useViewStore((state) => state.measureMode)
  const setMeasureMode = useViewStore((state) => state.setMeasureMode)
  const setSnapStep = useViewStore((state) => state.setSnapStep)
  const setGridStyle = useViewStore((state) => state.setGridStyle)

  const openHall = useOpenHall()
  const isMobile = useIsMobile()

  const addTable = usePlannerStore((state) => state.addTable)
  const addFixture = usePlannerStore((state) => state.addFixture)
  const panel = usePanelStore(
    useShallow((state) => ({
      selectedId: state.selectedId,
      openHall: state.openHall,
      openTablesBatchAdd: state.openTablesBatchAdd,
      openTableEdit: state.openTableEdit,
      openFixtureEdit: state.openFixtureEdit,
      select: state.select,
      deselect: state.deselect,
    }))
  )

  const pointerMovedRef = useRef(false)

  useEffect(() => {
    if (!isMeasuring) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleMeasuring()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isMeasuring, toggleMeasuring])

  useEffect(() => {
    if (isMeasuring) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      // Don't hijack Escape from a focused form field (e.g. cancelling an
      // edit in the PropertyPanel) — that's the field's own concern.
      const target = e.target as HTMLElement | null
      if (target?.closest("input, textarea, [contenteditable='true']")) return
      panel.deselect()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isMeasuring, panel])

  const {
    width: containerWidth,
    height: containerHeight,
    ref: containerRef,
    element: containerEl,
  } = useElementSize()

  usePinch(
    ({ offset: [scale] }) => {
      setZoom(scale)
    },
    {
      target: containerEl ?? undefined,
      eventOptions: { passive: false },
      scaleBounds: { min: ZOOM_MIN, max: ZOOM_MAX },
      // Desktop wheel-zoom requires a modifier so plain scrolling isn't hijacked.
      modifierKey: ["ctrlKey", "metaKey"],
      // Read the live zoom at gesture start so the pinch is relative to it.
      from: () => [zoom, 0],
    }
  )

  const {
    scaledWidth,
    scaledHeight,
    hallLeft,
    hallTop,
    ppm,
    viewportToHall,
    isInHallBounds,
  } = useHallGeometry(
    containerEl,
    containerWidth,
    containerHeight,
    hall.dimensions,
    zoom,
    pan
  )

  const { isPanning, onPointerDown, onPointerMove, onPointerUp } = useCanvasPan(
    pan,
    setPan
  )

  const hallSurfaceRef = useRef<HallSurfaceMethods>(null)

  const toHallCoords = (clientX: number, clientY: number) => {
    const raw = viewportToHall(clientX, clientY)
    return {
      x: Math.min(raw.x, hall.dimensions.width),
      y: Math.min(raw.y, hall.dimensions.height),
    }
  }

  const cycleGridStyle = () => setGridStyle(NEXT_GRID_STYLE[gridStyle])

  if (!hall.preset) {
    return (
      <CanvasEmptyState message={t("hall.empty_state")} onClick={openHall} />
    )
  }

  return (
    <CanvasContextMenu
      viewportToHall={viewportToHall}
      isInHallBounds={isInHallBounds}
      renderItems={({ position, inHall }) => {
        const snapped =
          snapStep === "off" ? position : snapPositionToGrid(position, snapStep)

        return (
          <>
            <CanvasContextMenuItem
              disabled={!inHall}
              onSelect={() => {
                const tableId = addTable(DEFAULT_TABLE, [], snapped)
                panel.openTableEdit(tableId)
              }}
            >
              <TableIcon className="size-4" />
              {t("tables.add")}
            </CanvasContextMenuItem>
            <CanvasContextMenuItem
              disabled={!inHall}
              onSelect={() => panel.openTablesBatchAdd(snapped)}
            >
              <SquarePlusIcon className="size-4" />
              {t("tables.add_batch")}
            </CanvasContextMenuItem>
            <CanvasContextMenuItem
              disabled={!inHall}
              onSelect={() => {
                const fixtureId = addFixture(DEFAULT_FIXTURE, snapped)
                panel.openFixtureEdit(fixtureId)
              }}
            >
              <LayoutPanelLeftIcon className="size-4" />
              {t("fixtures.add")}
            </CanvasContextMenuItem>
          </>
        )
      }}
    >
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 touch-none overflow-hidden bg-gradient-to-br from-slate-100 via-zinc-50 to-emerald-50/70"
        style={{
          cursor: isMeasuring ? "crosshair" : isPanning ? "grabbing" : "grab",
        }}
        onPointerDown={(e) => {
          // TODO move to util, use sth else than data-no-pan
          if ((e.target as Element).closest("[data-no-pan]")) return
          if (isMeasuring) {
            if (
              !hallSurfaceRef.current?.hasPendingPoint &&
              !isInHallBounds(e.clientX, e.clientY)
            )
              return

            const { x, y } = toHallCoords(e.clientX, e.clientY)
            hallSurfaceRef.current?.handleMeasureDown(x, y, e.shiftKey)
            return
          }
          pointerMovedRef.current = false
          onPointerDown(e)
        }}
        onPointerMove={(e) => {
          if (isMeasuring) {
            const { x, y } = toHallCoords(e.clientX, e.clientY)
            hallSurfaceRef.current?.handleMeasureMove(x, y, e.shiftKey)
            return
          }
          if (isPanning) pointerMovedRef.current = true
          onPointerMove(e)
        }}
        onPointerUp={(e) => {
          onPointerUp(e)
        }}
        onPointerCancel={(e) => {
          onPointerUp(e)
        }}
        onClick={(e) => {
          if (pointerMovedRef.current) return
          if (isMeasuring) return
          if ((e.target as Element).closest("[data-no-pan]")) return

          const captured = findCapturedElement(e.target)

          if (isMobile) {
            // Touch: first tap selects; tapping the already-selected element opens
            // its edit drawer. Pointer devices: a click opens edit directly.
            if (captured?.kind === "table") {
              if (panel.selectedId === captured.id)
                panel.openTableEdit(captured.id)
              else panel.select(captured.id)
              return
            }
            if (captured?.kind === "fixture") {
              if (panel.selectedId === captured.id)
                panel.openFixtureEdit(captured.id)
              else panel.select(captured.id)
              return
            }
            if (captured?.kind === "hall") {
              // panel.openHall()
              // passthrough? context menu?
              return
            }
            panel.deselect()
            return
          }

          if (captured?.kind === "table") {
            panel.openTableEdit(captured.id)
            return
          }
          if (captured?.kind === "fixture") {
            panel.openFixtureEdit(captured.id)
            return
          }
          if (captured?.kind === "hall") {
            panel.openHall()
            return
          }
          panel.deselect()
        }}
      >
        <div
          data-no-pan
          className="absolute top-3 right-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center justify-end gap-2"
        >
          <Tooltip>
            {/* TODO extract to a seperate component */}
            <TooltipTrigger asChild>
              <div className="flex items-center rounded-md border bg-background/80 text-[10px] text-muted-foreground backdrop-blur-sm">
                <button
                  type="button"
                  className="cursor-pointer px-1.5 py-1 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 max-md:px-2.5 max-md:py-2"
                  disabled={SNAP_STEPS.indexOf(snapStep) === 0}
                  onClick={() =>
                    setSnapStep(SNAP_STEPS[SNAP_STEPS.indexOf(snapStep) - 1])
                  }
                >
                  −
                </button>
                <span className="w-[2.5rem] text-center">
                  {snapStep === "off"
                    ? t("canvas.snap.off")
                    : t("common.meters", { count: snapStep })}
                </span>
                <button
                  type="button"
                  className="cursor-pointer px-1.5 py-1 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 max-md:px-2.5 max-md:py-2"
                  disabled={
                    SNAP_STEPS.indexOf(snapStep) === SNAP_STEPS.length - 1
                  }
                  onClick={() =>
                    setSnapStep(SNAP_STEPS[SNAP_STEPS.indexOf(snapStep) + 1])
                  }
                >
                  +
                </button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t("canvas.snap.tooltip")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div
                onClick={cycleGridStyle}
                className="flex w-[3.5rem] cursor-pointer items-center gap-1.5 rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm max-md:py-2"
              >
                {GRID_ICON[gridStyle]}
                {t(`canvas.grid.${gridStyle}`)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t("canvas.grid.style")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-no-pan
                className={`flex cursor-pointer items-center gap-1.5 rounded-md border bg-background/80 px-2 py-1 text-[10px] backdrop-blur-sm max-md:py-2 ${
                  isMeasuring
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={toggleMeasuring}
                aria-pressed={isMeasuring}
              >
                <RulerIcon className="size-3.5" />
                {t("measure.tool")}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t("measure.tooltip")}
            </TooltipContent>
          </Tooltip>

          {isMeasuring && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-no-pan
                  className="flex cursor-pointer items-center gap-1.5 rounded-md border border-teal-500 bg-teal-50 px-2 py-1 text-[10px] text-teal-700 backdrop-blur-sm max-md:py-2"
                  onClick={() =>
                    setMeasureMode(
                      measureMode === "center" ? "border" : "center"
                    )
                  }
                >
                  {t(`measure.mode.${measureMode}`)}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t("measure.mode.tooltip")}
              </TooltipContent>
            </Tooltip>
          )}

          <ScalePill
            reset={resetZoomAndPan}
            scale={zoom}
            zoomIn={() => stepZoom(1)}
            zoomOut={() => stepZoom(-1)}
          />
        </div>

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

        <HallSurface
          ref={hallSurfaceRef}
          left={hallLeft}
          top={hallTop}
          width={scaledWidth}
          height={scaledHeight}
          ppm={ppm}
          zoom={zoom}
          gridStyle={gridStyle}
          snapStep={snapStep}
          gridSpacing={gridSpacing}
        />
      </div>
    </CanvasContextMenu>
  )
}
