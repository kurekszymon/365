import { useTranslation } from "react-i18next"
import { useEffect, useRef } from "react"
import { useShallow } from "zustand/react/shallow"
import {
  ClipboardCopyIcon,
  ClipboardPasteIcon,
  LayoutPanelLeftIcon,
  PencilIcon,
  SquarePlusIcon,
  TableIcon,
  Trash2Icon,
} from "lucide-react"
import { usePinch } from "@use-gesture/react"
import { ScalePill } from "./ScalePill"
import { Minimap } from "./Minimap"
import { MobileZoomControl } from "./MobileZoomControl"
import { AddFab } from "./AddFab"
import { DimensionLabel } from "./DimensionLabel"
import { CanvasContextMenu } from "./CanvasContextMenu"
import { CanvasContextMenuItem } from "./CanvasContextMenuItem"
import { CanvasToolbar } from "./CanvasToolbar"
import { CanvasViewMenu } from "./CanvasViewMenu"
import { CanvasEmptyState } from "./CanvasEmptyState"
import { HallSurface } from "./HallSurface"
import { findCapturedElement, isNoPan, snapPositionToGrid } from "./utils"
import { useHallGeometry } from "./useHallGeometry"
import { useCanvasPan } from "./useCanvasPan"
import { useCanvasWheelPan } from "./useCanvasWheelPan"
import { useCanvasClipboard } from "./useCanvasClipboard"
import type { HallSurfaceMethods } from "./HallSurface"
import {
  ContextMenuLabel,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import {
  DEFAULT_FIXTURE,
  DEFAULT_TABLE,
  usePlannerStore,
} from "@/stores/planner.store"
import { ZOOM_MAX, ZOOM_MIN, useViewStore } from "@/stores/view.store"
import { usePanelStore } from "@/stores/panel.store"
import { useClipboardStore } from "@/stores/clipboard.store"
import { useElementSize } from "@/hooks/useElementSize"
import { useIsMobile } from "@/hooks/useMediaQuery"
import { useOpenHall } from "@/hooks/useOpenHall"

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

  const openHall = useOpenHall()
  const isMobile = useIsMobile()

  const addTable = usePlannerStore((state) => state.addTable)
  const addFixture = usePlannerStore((state) => state.addFixture)
  const deleteTable = usePlannerStore((state) => state.deleteTable)
  const deleteFixture = usePlannerStore((state) => state.deleteFixture)
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

  const { copySelected, copyTarget, paste } = useCanvasClipboard()
  const clipboardItem = useClipboardStore((state) => state.item)

  const pointerMovedRef = useRef(false)
  // Last pointer position over the canvas (client coords), so ⌘V can paste under
  // the cursor even though the keyboard event itself carries no position.
  const pointerClientRef = useRef<{ x: number; y: number } | null>(null)

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
      // edit in a panel form) — that's the field's own concern.
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

  const {
    scaledWidth,
    scaledHeight,
    hallLeft,
    hallTop,
    ppm,
    viewportToHall,
    isInHallBounds,
    clampPan,
    zoomToPan,
  } = useHallGeometry(
    containerEl,
    containerWidth,
    containerHeight,
    hall.dimensions,
    zoom,
    pan
  )

  usePinch(
    ({ offset: [scale], origin }) => {
      // Keep the point under the pinch/cursor focal pinned while zooming, then
      // apply the new zoom. Pan first so both land in the same batched render.
      setPan(zoomToPan(scale, { x: origin[0], y: origin[1] }))
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

  const { isPanning, onPointerDown, onPointerUp } = useCanvasPan(pan, (p) =>
    setPan(clampPan(p))
  )

  // Two-finger trackpad / wheel panning, alongside the pointer-drag pan above.
  useCanvasWheelPan(
    containerEl,
    () => pan,
    (p) => setPan(clampPan(p))
  )

  // Re-clamp the existing pan whenever the allowed range can shrink (zoom out,
  // container resize, hall resize) so a previously-valid pan can't leave the
  // hall stranded off-screen.
  useEffect(() => {
    const next = clampPan(pan)
    if (next.x !== pan.x || next.y !== pan.y) setPan(next)
  }, [clampPan, pan, setPan])

  // ⌘/Ctrl+C copies the selected table/fixture; ⌘/Ctrl+V pastes it under the
  // cursor (or hall centre if the pointer hasn't been over the canvas). Disabled
  // while measuring, and ignored when a form field is focused.
  useEffect(() => {
    if (isMeasuring) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest("input, textarea, [contenteditable='true']")) return

      const key = e.key.toLowerCase()
      if (key === "c") {
        copySelected()
      } else if (key === "v") {
        e.preventDefault()
        const client = pointerClientRef.current
        const raw = client
          ? viewportToHall(client.x, client.y)
          : { x: hall.dimensions.width / 2, y: hall.dimensions.height / 2 }
        const clamped = {
          x: Math.max(0, Math.min(raw.x, hall.dimensions.width)),
          y: Math.max(0, Math.min(raw.y, hall.dimensions.height)),
        }
        paste(
          snapStep === "off" ? clamped : snapPositionToGrid(clamped, snapStep)
        )
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [
    isMeasuring,
    copySelected,
    paste,
    viewportToHall,
    snapStep,
    hall.dimensions.width,
    hall.dimensions.height,
  ])

  const hallSurfaceRef = useRef<HallSurfaceMethods>(null)

  const toHallCoords = (clientX: number, clientY: number) => {
    const raw = viewportToHall(clientX, clientY)
    return {
      x: Math.min(raw.x, hall.dimensions.width),
      y: Math.min(raw.y, hall.dimensions.height),
    }
  }

  // The minimap only earns its space when the whole hall isn't already framed:
  // once it's been panned off-centre, or zoomed until it overflows the viewport
  // on either axis. A fully-visible, centred hall needs no navigator.
  const hallOverflows =
    scaledWidth > containerWidth + 1 || scaledHeight > containerHeight + 1
  const showMinimap = hallOverflows || pan.x !== 0 || pan.y !== 0

  if (!hall.preset) {
    return (
      <CanvasEmptyState message={t("hall.empty_state")} onClick={openHall} />
    )
  }

  return (
    <CanvasContextMenu
      viewportToHall={viewportToHall}
      isInHallBounds={isInHallBounds}
      renderItems={({ position, inHall, target }) => {
        const snapped =
          snapStep === "off" ? position : snapPositionToGrid(position, snapStep)

        return (
          <>
            {(target.kind !== "hall" || clipboardItem) && (
              <>
                {target.kind === "table" && (
                  <CanvasContextMenuItem
                    onSelect={() => panel.openTableEdit(target.id)}
                  >
                    <PencilIcon className="size-4" />
                    {t("tables.edit")}
                  </CanvasContextMenuItem>
                )}
                {target.kind === "fixture" && (
                  <CanvasContextMenuItem
                    onSelect={() => panel.openFixtureEdit(target.id)}
                  >
                    <PencilIcon className="size-4" />
                    {t("fixtures.edit")}
                  </CanvasContextMenuItem>
                )}
                {target.kind !== "hall" && (
                  <CanvasContextMenuItem onSelect={() => copyTarget(target)}>
                    <ClipboardCopyIcon className="size-4" />
                    {target.kind === "table"
                      ? t("tables.copy")
                      : t("fixtures.copy")}
                  </CanvasContextMenuItem>
                )}
                {target.kind === "table" && (
                  <CanvasContextMenuItem
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    onSelect={() => {
                      if (panel.selectedId === target.id) panel.deselect()
                      deleteTable(target.id)
                    }}
                  >
                    <Trash2Icon className="size-4" />
                    {t("tables.delete")}
                  </CanvasContextMenuItem>
                )}
                {target.kind === "fixture" && (
                  <CanvasContextMenuItem
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    onSelect={() => {
                      if (panel.selectedId === target.id) panel.deselect()
                      deleteFixture(target.id)
                    }}
                  >
                    <Trash2Icon className="size-4" />
                    {t("fixtures.delete")}
                  </CanvasContextMenuItem>
                )}
                {clipboardItem && (
                  <CanvasContextMenuItem
                    disabled={!inHall}
                    onSelect={() => paste(snapped)}
                  >
                    <ClipboardPasteIcon className="size-4" />
                    {clipboardItem.kind === "table"
                      ? t("canvas.paste_table")
                      : t("canvas.paste_fixture")}
                  </CanvasContextMenuItem>
                )}
                <ContextMenuSeparator />
              </>
            )}
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

            <ContextMenuSeparator />
            <ContextMenuLabel>{t("canvas.view_section")}</ContextMenuLabel>
            <CanvasViewMenu />
          </>
        )
      }}
    >
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 touch-none overflow-hidden bg-background bg-gradient-to-br from-muted/60 via-background to-planner-soft/50"
        style={{
          cursor: isMeasuring ? "crosshair" : isPanning ? "grabbing" : "grab",
        }}
        onPointerDown={(e) => {
          if (isNoPan(e.target)) return
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
          pointerClientRef.current = { x: e.clientX, y: e.clientY }
          if (isMeasuring) {
            const { x, y } = toHallCoords(e.clientX, e.clientY)
            hallSurfaceRef.current?.handleMeasureMove(x, y, e.shiftKey)
            return
          }
          if (isPanning) pointerMovedRef.current = true
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
          if (isNoPan(e.target)) return

          const captured = findCapturedElement(e.target)

          // First click selects; clicking the already-selected element opens its
          // edit panel/drawer. (Editing is also reachable via the right-click
          // context menu.) Same flow on touch and pointer devices.
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
          // Clicking the hall floor deselects; the hall config is reached via
          // the toolbar/header button, not by clicking the floor.
          panel.deselect()
        }}
      >
        {isMobile && (
          <>
            <MobileZoomControl
              zoomIn={() => stepZoom(1)}
              zoomOut={() => stepZoom(-1)}
            />
            <AddFab />
          </>
        )}

        {!isMobile && (
          <>
            <CanvasToolbar />

            <div data-no-pan className="absolute bottom-4 left-4 z-20">
              <ScalePill
                reset={resetZoomAndPan}
                scale={zoom}
                zoomIn={() => stepZoom(1)}
                zoomOut={() => stepZoom(-1)}
              />
            </div>

            {showMinimap && (
              <Minimap
                hallDimensions={hall.dimensions}
                selectedId={panel.selectedId}
                hallLeft={hallLeft}
                hallTop={hallTop}
                ppm={ppm}
                containerWidth={containerWidth}
                containerHeight={containerHeight}
                onNavigate={(p) => setPan(clampPan(p))}
              />
            )}

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
          </>
        )}

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
