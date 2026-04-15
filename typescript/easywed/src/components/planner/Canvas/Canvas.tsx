import { useTranslation } from "react-i18next"
import { useRef } from "react"
import { useShallow } from "zustand/react/shallow"
import { DotIcon, Grid3x3Icon, Grid2x2XIcon } from "lucide-react"
import { ScalePill } from "./ScalePill"
import { DimensionLabel } from "./DimensionLabel"
import { CanvasContextMenu } from "./CanvasContextMenu"
import { CanvasEmptyState } from "./CanvasEmptyState"
import { HallSurface } from "./HallSurface"
import { findCapturedElement } from "./utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
// TODO hooks dir?
import { useHallGeometry } from "./useHallGeometry"
import { useCanvasZoom } from "./useCanvasZoom"
import { useCanvasPan } from "./useCanvasPan"
import { useLongPress } from "./useLongPress"
import {
  usePlannerStore,
  type GridStyle,
  type SnapStep,
} from "@/stores/planner.store"
import { usePanelStore, selectSelectedTableId } from "@/stores/panel.store"
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

const SNAP_STEPS: SnapStep[] = ["off", 0.1, 0.25, 0.5, 1]

export const Canvas = () => {
  const { t } = useTranslation()

  const { hall, updateHall, stepZoom, setPan, resetZoomAndPan, setSnapStep } =
    usePlannerStore(
      useShallow((state) => ({
        hall: state.hall,
        updateHall: state.updateHall,
        stepZoom: state.stepHallZoom,
        setPan: state.setHallPan,
        resetZoomAndPan: state.resetHallZoomAndPan,
        setSnapStep: state.setSnapStep,
      }))
    )

  const openHall = useOpenHall()

  const selectedTableId = usePanelStore(selectSelectedTableId)
  const addTable = usePlannerStore((state) => state.addTable)
  const panel = usePanelStore(
    useShallow((state) => ({
      openHall: state.openHall,
      openTableEdit: state.openTableEdit,
      close: state.close,
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
    containerWidth,
    containerHeight,
    hall.dimensions,
    hall.zoom,
    hall.pan
  )

  useCanvasZoom(containerEl, stepZoom)

  const { isPanning, onPointerDown, onPointerMove, onPointerUp } = useCanvasPan(
    hall.pan,
    setPan
  )
  const longPress = useLongPress()

  const setGridStyle = () => {
    if (!hall.preset) {
      // shouldn't happen, guard regardless
      console.warn("Tried to change grid style without a hall preset")
      return
    }

    updateHall(
      hall.preset,
      hall.dimensions,
      hall.gridSpacing,
      NEXT_GRID_STYLE[hall.gridStyle]
    )
  }

  if (!hall.preset) {
    return (
      <CanvasEmptyState message={t("hall.empty_state")} onClick={openHall} />
    )
  }

  return (
    <CanvasContextMenu
      onAddTable={(position) => {
        const tableId = addTable(
          {
            name: "",
            shape: "rectangular",
            capacity: 8,
            size: { width: 2, height: 1 },
          },
          [],
          position
        )
        panel.openTableEdit(tableId)
      }}
      onEditTable={(tableId) => panel.openTableEdit(tableId)}
      onConfigureHall={() => panel.openHall()}
      viewportToHall={viewportToHall}
      isInHallBounds={isInHallBounds}
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
          if (captured?.kind === "table") return // handled by DraggableTable
          if (captured?.kind === "hall") {
            panel.openHall()
            return
          }
          panel.close()
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
                  disabled={SNAP_STEPS.indexOf(hall.snapStep) === 0}
                  onClick={() =>
                    setSnapStep(
                      SNAP_STEPS[SNAP_STEPS.indexOf(hall.snapStep) - 1]
                    )
                  }
                >
                  −
                </button>
                <span className="w-[2.5rem] text-center">
                  {hall.snapStep === "off"
                    ? t("canvas.snap.off")
                    : t("common.meters", { count: hall.snapStep })}
                </span>
                <button
                  type="button"
                  className="cursor-pointer px-1.5 py-1 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={
                    SNAP_STEPS.indexOf(hall.snapStep) === SNAP_STEPS.length - 1
                  }
                  onClick={() =>
                    setSnapStep(
                      SNAP_STEPS[SNAP_STEPS.indexOf(hall.snapStep) + 1]
                    )
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
                onClick={setGridStyle}
                className="flex w-[3.5rem] cursor-pointer items-center gap-1.5 rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm"
              >
                {GRID_ICON[hall.gridStyle]}
                {t(`canvas.grid.${hall.gridStyle}`)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t("canvas.grid.style")}
            </TooltipContent>
          </Tooltip>

          <ScalePill reset={resetZoomAndPan} scale={hall.zoom} />
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
          zoom={hall.zoom}
          gridStyle={hall.gridStyle}
          snapStep={hall.snapStep}
          gridSpacing={hall.gridSpacing}
          onTableClick={(tableId) => panel.openTableEdit(tableId)}
          selectedTableId={selectedTableId}
        />
      </div>
    </CanvasContextMenu>
  )
}
