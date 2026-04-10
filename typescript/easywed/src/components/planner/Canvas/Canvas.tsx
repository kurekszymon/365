import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { ScalePill } from "./ScalePill"
import { DimensionLabel } from "./DimensionLabel"
import { CanvasContextMenu } from "./CanvasContextMenu"
import { CanvasEmptyState } from "./CanvasEmptyState"
import { HallSurface } from "./HallSurface"
import { useHallGeometry } from "./useHallGeometry"
import { useCanvasZoom } from "./useCanvasZoom"
import { useCanvasPan } from "./useCanvasPan"
import { useLongPress } from "./useLongPress"
import { usePlannerStore } from "@/stores/planner.store"
import { useDialogStore } from "@/stores/dialog.store"
import { useElementSize } from "@/hooks/useElementSize"

export const Canvas = () => {
  const { t } = useTranslation()

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
        />
      </div>
    </CanvasContextMenu>
  )
}
