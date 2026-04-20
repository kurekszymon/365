import { useTranslation } from "react-i18next"
import { useRef } from "react"
import { useShallow } from "zustand/react/shallow"
import {
  DotIcon,
  Grid2x2XIcon,
  Grid3x3Icon,
  SquarePlusIcon,
  TableIcon,
} from "lucide-react"
import { ScalePill } from "./ScalePill"
import { DimensionLabel } from "./DimensionLabel"
import { CanvasContextMenu } from "./CanvasContextMenu"
import { CanvasContextMenuItem } from "./CanvasContextMenuItem"
import { CanvasEmptyState } from "./CanvasEmptyState"
import { HallSurface } from "./HallSurface"
import { findCapturedElement, snapPositionToGrid } from "./utils"
// TODO hooks dir?
import { useHallGeometry } from "./useHallGeometry"
import { useCanvasZoom } from "./useCanvasZoom"
import { useCanvasPan } from "./useCanvasPan"
import { useLongPress } from "./useLongPress"
import type { GridStyle, SnapStep } from "@/stores/view.store"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DEFAULT_TABLE, usePlannerStore } from "@/stores/planner.store"
import { useViewStore } from "@/stores/view.store"
import { usePanelStore } from "@/stores/panel.store"
import { useElementSize } from "@/hooks/useElementSize"
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
  const pan = useViewStore((state) => state.pan)
  const snapStep = useViewStore((state) => state.snapStep)
  const gridStyle = useViewStore((state) => state.gridStyle)
  const gridSpacing = useViewStore((state) => state.gridSpacing)
  const stepZoom = useViewStore((state) => state.stepZoom)
  const setPan = useViewStore((state) => state.setPan)
  const resetZoomAndPan = useViewStore((state) => state.resetZoomAndPan)
  const setSnapStep = useViewStore((state) => state.setSnapStep)
  const setGridStyle = useViewStore((state) => state.setGridStyle)

  const openHall = useOpenHall()

  const addTable = usePlannerStore((state) => state.addTable)
  const panel = usePanelStore(
    useShallow((state) => ({
      openHall: state.openHall,
      openTablesBatchAdd: state.openTablesBatchAdd,
      openTableEdit: state.openTableEdit,
      deselect: state.deselect,
    }))
  )

  const pointerMovedRef = useRef(false)

  const {
    width: containerWidth,
    height: containerHeight,
    ref: containerRef,
    element: containerEl,
  } = useElementSize()

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

  useCanvasZoom(containerEl, stepZoom)

  const { isPanning, onPointerDown, onPointerMove, onPointerUp } = useCanvasPan(
    pan,
    setPan
  )
  const longPress = useLongPress()

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
          </>
        )
      }}
    >
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-gradient-to-br from-slate-100 via-zinc-50 to-emerald-50/70"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onPointerDown={(e) => {
          pointerMovedRef.current = false
          longPress.start(e)
          onPointerDown(e)
        }}
        onPointerMove={(e) => {
          if (isPanning) pointerMovedRef.current = true
          longPress.cancel()
          onPointerMove(e)
        }}
        onPointerUp={() => {
          longPress.cancel()
          onPointerUp()
        }}
        onPointerCancel={() => {
          longPress.cancel()
          onPointerUp()
        }}
        onClick={(e) => {
          if (pointerMovedRef.current) return
          if ((e.target as Element).closest("[data-no-pan]")) return

          const captured = findCapturedElement(e.target)
          if (captured?.kind === "table") {
            panel.openTableEdit(captured.id)
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
          className="absolute top-3 right-3 z-20 flex items-center gap-2"
        >
          <Tooltip>
            {/* TODO extract to a seperate component */}
            <TooltipTrigger asChild>
              <div className="flex items-center rounded-md border bg-background/80 text-[10px] text-muted-foreground backdrop-blur-sm">
                <button
                  type="button"
                  className="cursor-pointer px-1.5 py-1 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
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
                  className="cursor-pointer px-1.5 py-1 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
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
                className="flex w-[3.5rem] cursor-pointer items-center gap-1.5 rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm"
              >
                {GRID_ICON[gridStyle]}
                {t(`canvas.grid.${gridStyle}`)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t("canvas.grid.style")}
            </TooltipContent>
          </Tooltip>

          <ScalePill reset={resetZoomAndPan} scale={zoom} />
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
