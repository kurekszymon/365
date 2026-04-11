import { useTranslation } from "react-i18next"
import { useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { DotIcon, Grid3x3Icon, Grid2x2XIcon } from "lucide-react"
import { ScalePill } from "./ScalePill"
import { DimensionLabel } from "./DimensionLabel"
import { CanvasContextMenu } from "./CanvasContextMenu"
import { CanvasEmptyState } from "./CanvasEmptyState"
import { HallSurface } from "./HallSurface"
import type { GridStyle } from "./HallSurface"
// TODO hooks dir?
import { useHallGeometry } from "./useHallGeometry"
import { useCanvasZoom } from "./useCanvasZoom"
import { useCanvasPan } from "./useCanvasPan"
import { useLongPress } from "./useLongPress"
import { usePlannerStore } from "@/stores/planner.store"
import { useDialogStore } from "@/stores/dialog.store"
import { useElementSize } from "@/hooks/useElementSize"

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

export const Canvas = () => {
  const { t } = useTranslation()
  const [gridStyle, setGridStyle] = useState<GridStyle>("grid")

  const { hall, resetZoomAndPan, stepZoom, setPan } = usePlannerStore(
    useShallow((state) => ({
      hall: state.hall,
      resetZoomAndPan: state.resetHallZoomAndPan,
      stepZoom: state.stepHallZoom,
      setPan: state.setHallPan,
    }))
  )

  const dialog = useDialogStore(useShallow((state) => ({ open: state.open })))

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
      onAddTable={(position) => dialog.open("Table.Add", { position })}
      onEditTable={(tableId) => dialog.open("Table.Edit", { tableId })}
      onConfigureHall={() => dialog.open("Hall.Configure")}
      viewportToHall={viewportToHall}
      isInHallBounds={isInHallBounds}
    >
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-gradient-to-br from-slate-100 via-zinc-50 to-emerald-50/70"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onPointerDown={(e) => {
          longPress.start(e)
          onPointerDown(e)
        }}
        onPointerMove={(e) => {
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
      >
        <ScalePill reset={resetZoomAndPan} scale={hall.zoom} />

        <div
          data-no-pan
          onClick={() => setGridStyle((s) => NEXT_GRID_STYLE[s])}
          className="absolute top-3 right-16 z-20 flex items-center gap-1.5 rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm"
        >
          {/* todo: create an icon button? */}
          {GRID_ICON[gridStyle]}
          {t(`canvas.grid.${gridStyle}`)}
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
          gridStyle={gridStyle}
        />
      </div>
    </CanvasContextMenu>
  )
}
