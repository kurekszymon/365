import { useCallback, useMemo } from "react"
import type { Position } from "@/stores/planner.store"

const PIXELS_PER_METER = 40
const VIEWPORT_MARGIN = 48
// Gutter kept between the hall and the viewport edge when clamping pan, so the
// whole hall (and its dimension labels) stays comfortably visible rather than
// sitting flush against the edge.
const PAN_PADDING = 48

// Start-side (top/left) gutters reserved when the hall fits the viewport, so the
// dimension labels that sit just outside the hall's top and left edges (the
// vertical label at hallLeft - 52, the horizontal one at hallTop - 28) stay
// on-screen instead of sliding under the viewport edge when panned to the limit.
const LABEL_GUTTER_X = 64
const LABEL_GUTTER_Y = 36

// Allowed pan range on one axis. The hall is centered at offset 0.
//
// When the hall is larger than the viewport it may pan symmetrically until
// either edge sits PAN_PADDING inside the opposite viewport edge (so the edge
// stays visible). When it's smaller, it may slide until its far (right/bottom)
// edge reaches the viewport edge, but the near (top/left) side stops
// `startGutter` short so the dimension labels there remain visible. Passing
// startGutter = 0 restores a plain edge-to-edge slide.
function axisPanBounds(scaled: number, container: number, startGutter: number) {
  const overflow = scaled - container
  if (overflow >= 0) {
    const m = overflow / 2 + PAN_PADDING
    return { min: -m, max: m }
  }
  // Hall smaller than the viewport on this axis. `center` is the distance from
  // the viewport edge to the hall edge at pan 0 (= hallLeft/hallTop then).
  // Previously the near side used -center too (mirroring `max`), which let the
  // labelled edge slide flush to the viewport edge and clipped the labels.
  const center = -overflow / 2
  const max = center
  return { min: Math.min(startGutter - center, max), max }
}

type HallDimensions = { width: number; height: number }

export function useHallGeometry(
  containerEl: HTMLElement | null,
  containerWidth: number,
  containerHeight: number,
  dimensions: HallDimensions,
  zoom: number,
  pan: Position
) {
  const hallWidth = Math.round(dimensions.width * PIXELS_PER_METER)
  const hallHeight = Math.round(dimensions.height * PIXELS_PER_METER)

  const baseScale = useMemo(() => {
    if (containerWidth <= 0 || containerHeight <= 0) return 1
    return Math.min(
      (containerWidth - VIEWPORT_MARGIN * 2) / hallWidth,
      (containerHeight - VIEWPORT_MARGIN * 2) / hallHeight
    )
  }, [containerWidth, containerHeight, hallWidth, hallHeight])

  const scale = baseScale * zoom
  const scaledWidth = hallWidth * scale
  const scaledHeight = hallHeight * scale
  const hallLeft = (containerWidth - scaledWidth) / 2 + pan.x
  const hallTop = (containerHeight - scaledHeight) / 2 + pan.y
  const ppm = PIXELS_PER_METER * scale

  function toContainerCoords(clientX: number, clientY: number) {
    const rect = containerEl?.getBoundingClientRect()
    return {
      x: clientX - (rect?.left ?? 0),
      y: clientY - (rect?.top ?? 0),
    }
  }

  function viewportToHall(clientX: number, clientY: number): Position {
    const { x, y } = toContainerCoords(clientX, clientY)
    return {
      x: Math.max(0, (x - hallLeft) / ppm),
      y: Math.max(0, (y - hallTop) / ppm),
    }
  }

  function isInHallBounds(clientX: number, clientY: number): boolean {
    const { x, y } = toContainerCoords(clientX, clientY)
    return (
      x >= hallLeft &&
      x <= hallLeft + scaledWidth &&
      y >= hallTop &&
      y <= hallTop + scaledHeight
    )
  }

  // Constrain pan so the hall always stays within the visible canvas rect, with
  // a PAN_PADDING gutter to the edge (see axisPanBounds).
  const clampPan = useCallback(
    (p: Position): Position => {
      const boundsX = axisPanBounds(scaledWidth, containerWidth, LABEL_GUTTER_X)
      const boundsY = axisPanBounds(
        scaledHeight,
        containerHeight,
        LABEL_GUTTER_Y
      )
      return {
        x: Math.max(boundsX.min, Math.min(boundsX.max, p.x)),
        y: Math.max(boundsY.min, Math.min(boundsY.max, p.y)),
      }
    },
    [scaledWidth, scaledHeight, containerWidth, containerHeight]
  )

  // The pan that, at `newZoom`, keeps the hall point currently under `focal`
  // (client coords; defaults to the container centre) pinned in place. Without
  // this, zooming always grows the hall from its centre, so the spot you're
  // looking at slides away — the "clumsy" feeling. Returns a clamped pan.
  function zoomToPan(
    newZoom: number,
    focal?: { x: number; y: number }
  ): Position {
    const rect = containerEl?.getBoundingClientRect()
    const fx = focal ? focal.x - (rect?.left ?? 0) : containerWidth / 2
    const fy = focal ? focal.y - (rect?.top ?? 0) : containerHeight / 2

    // Hall-space point (metres) currently under the focal.
    const mX = ppm > 0 ? (fx - hallLeft) / ppm : 0
    const mY = ppm > 0 ? (fy - hallTop) / ppm : 0

    const newScale = baseScale * newZoom
    const newScaledWidth = hallWidth * newScale
    const newScaledHeight = hallHeight * newScale
    const newPpm = PIXELS_PER_METER * newScale

    // Invert hallLeft = (container - scaledWidth) / 2 + pan for the new zoom,
    // requiring fx === newHallLeft + mX * newPpm.
    const rawX = fx - mX * newPpm - (containerWidth - newScaledWidth) / 2
    const rawY = fy - mY * newPpm - (containerHeight - newScaledHeight) / 2

    const boundsX = axisPanBounds(
      newScaledWidth,
      containerWidth,
      LABEL_GUTTER_X
    )
    const boundsY = axisPanBounds(
      newScaledHeight,
      containerHeight,
      LABEL_GUTTER_Y
    )
    return {
      x: Math.max(boundsX.min, Math.min(boundsX.max, rawX)),
      y: Math.max(boundsY.min, Math.min(boundsY.max, rawY)),
    }
  }

  return {
    scaledWidth,
    scaledHeight,
    hallLeft,
    hallTop,
    ppm,
    viewportToHall,
    isInHallBounds,
    clampPan,
    zoomToPan,
  }
}
