import { useCallback, useMemo } from "react"
import { hallAtPoint, nearestHall, worldBoundsOf } from "./utils"
import type { WorldBounds } from "./utils"
import type { Hall, Position } from "@/stores/planner.store"
import { ZOOM_MAX, ZOOM_MIN } from "@/stores/view.store"

export const PIXELS_PER_METER = 40
const VIEWPORT_MARGIN = 48
// Pixel margin kept around a rect framed via fitRect, leaving room for the
// vertex handles and the floating shape-edit toolbar.
const FIT_MARGIN_PX = 96
// Gutter kept between the world (union of all halls) and the viewport edge
// when clamping pan, so the whole layout (and its dimension labels) stays
// comfortably visible rather than sitting flush against the edge.
const PAN_PADDING = 48

// Start-side (top/left) gutters reserved when the world fits the viewport, so
// the dimension labels that sit just outside a hall's top and left edges (the
// vertical label at hallLeft - 52, the horizontal one at hallTop - 28) stay
// on-screen instead of sliding under the viewport edge when panned to the limit.
const LABEL_GUTTER_X = 64
const LABEL_GUTTER_Y = 36

// Allowed pan range on one axis. The world is centered at offset 0.
//
// When the world is larger than the viewport it may pan symmetrically until
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
  // World smaller than the viewport on this axis. `center` is the distance
  // from the viewport edge to the world edge at pan 0.
  const center = -overflow / 2
  const max = center
  return { min: Math.min(startGutter - center, max), max }
}

// Shared world-space geometry for the multi-hall canvas. All halls live in one
// coordinate system (meters); this hook fits their union (`worldBounds`) into
// the viewport and converts between client px and world meters. Entity
// positions remain hall-local - convert via the hall helpers in utils.ts.
export function useWorldGeometry(
  containerEl: HTMLElement | null,
  containerWidth: number,
  containerHeight: number,
  halls: Array<Hall>,
  zoom: number,
  pan: Position
) {
  const worldBounds = useMemo(() => worldBoundsOf(halls), [halls])

  const worldWidthPx = Math.round(worldBounds.width * PIXELS_PER_METER)
  const worldHeightPx = Math.round(worldBounds.height * PIXELS_PER_METER)

  const baseScale = useMemo(() => {
    if (containerWidth <= 0 || containerHeight <= 0) return 1
    return Math.min(
      (containerWidth - VIEWPORT_MARGIN * 2) / worldWidthPx,
      (containerHeight - VIEWPORT_MARGIN * 2) / worldHeightPx
    )
  }, [containerWidth, containerHeight, worldWidthPx, worldHeightPx])

  const scale = baseScale * zoom
  const scaledWidth = worldWidthPx * scale
  const scaledHeight = worldHeightPx * scale
  // Client px of the world's top-left corner (worldBounds.x/y).
  const worldLeft = (containerWidth - scaledWidth) / 2 + pan.x
  const worldTop = (containerHeight - scaledHeight) / 2 + pan.y
  const ppm = PIXELS_PER_METER * scale

  function toContainerCoords(clientX: number, clientY: number) {
    const rect = containerEl?.getBoundingClientRect()
    return {
      x: clientX - (rect?.left ?? 0),
      y: clientY - (rect?.top ?? 0),
    }
  }

  // Absolute world meters (can be negative - halls may sit left/above the
  // origin). Callers resolve a hall via hallAtPoint/nearestHall and convert
  // to hall-local coords themselves.
  function viewportToWorld(clientX: number, clientY: number): Position {
    const { x, y } = toContainerCoords(clientX, clientY)
    return {
      x: worldBounds.x + (x - worldLeft) / ppm,
      y: worldBounds.y + (y - worldTop) / ppm,
    }
  }

  function hallAtClientPoint(clientX: number, clientY: number): Hall | null {
    return hallAtPoint(halls, viewportToWorld(clientX, clientY))
  }

  function isInAnyHall(clientX: number, clientY: number): boolean {
    return hallAtClientPoint(clientX, clientY) !== null
  }

  // Px offset of a hall's top-left inside the world wrapper (whose origin is
  // worldBounds' top-left).
  const hallScreenOffset = useCallback(
    (hall: Hall) => ({
      left: (hall.position.x - worldBounds.x) * ppm,
      top: (hall.position.y - worldBounds.y) * ppm,
    }),
    [worldBounds, ppm]
  )

  // Constrain pan so the world always stays within the visible canvas rect,
  // with a PAN_PADDING gutter to the edge (see axisPanBounds).
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

  // The pan that, at `newZoom`, keeps the world point currently under `focal`
  // (client coords; defaults to the container centre) pinned in place. Without
  // this, zooming always grows the layout from its centre, so the spot you're
  // looking at slides away. Returns a clamped pan.
  function zoomToPan(
    newZoom: number,
    focal?: { x: number; y: number }
  ): Position {
    const rect = containerEl?.getBoundingClientRect()
    const fx = focal ? focal.x - (rect?.left ?? 0) : containerWidth / 2
    const fy = focal ? focal.y - (rect?.top ?? 0) : containerHeight / 2

    // World-space point (meters, relative to worldBounds origin) under the focal.
    const mX = ppm > 0 ? (fx - worldLeft) / ppm : 0
    const mY = ppm > 0 ? (fy - worldTop) / ppm : 0

    const newScale = baseScale * newZoom
    const newScaledWidth = worldWidthPx * newScale
    const newScaledHeight = worldHeightPx * newScale
    const newPpm = PIXELS_PER_METER * newScale

    // Invert worldLeft = (container - scaledWidth) / 2 + pan for the new zoom,
    // requiring fx === newWorldLeft + mX * newPpm.
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

  // Zoom + clamped pan that frame a world-space rect (meters) with a
  // FIT_MARGIN_PX gutter, centered in the viewport - used to jump the view to
  // an entity (e.g. entering shape-edit mode). Deliberately independent of the
  // current zoom/pan so its identity only changes on resize / world changes,
  // letting effects depend on it without re-firing every pan frame.
  const fitRect = useCallback(
    (rect: WorldBounds): { zoom: number; pan: Position } | null => {
      if (containerWidth <= 0 || containerHeight <= 0) return null
      if (rect.width <= 0 || rect.height <= 0 || baseScale <= 0) return null
      const targetPpm = Math.min(
        (containerWidth - FIT_MARGIN_PX * 2) / rect.width,
        (containerHeight - FIT_MARGIN_PX * 2) / rect.height
      )
      if (targetPpm <= 0) return null
      const newZoom = Math.min(
        ZOOM_MAX,
        Math.max(ZOOM_MIN, targetPpm / (PIXELS_PER_METER * baseScale))
      )
      const newScale = baseScale * newZoom
      const newScaledWidth = worldWidthPx * newScale
      const newScaledHeight = worldHeightPx * newScale
      const newPpm = PIXELS_PER_METER * newScale
      // Rect center relative to the world origin; solve
      // containerCenter === newWorldLeft + c * newPpm for pan (see zoomToPan).
      const cx = rect.x + rect.width / 2 - worldBounds.x
      const cy = rect.y + rect.height / 2 - worldBounds.y
      const rawX = newScaledWidth / 2 - cx * newPpm
      const rawY = newScaledHeight / 2 - cy * newPpm
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
        zoom: newZoom,
        pan: {
          x: Math.max(boundsX.min, Math.min(boundsX.max, rawX)),
          y: Math.max(boundsY.min, Math.min(boundsY.max, rawY)),
        },
      }
    },
    [
      containerWidth,
      containerHeight,
      baseScale,
      worldBounds,
      worldWidthPx,
      worldHeightPx,
    ]
  )

  return {
    worldBounds,
    scaledWidth,
    scaledHeight,
    worldLeft,
    worldTop,
    ppm,
    viewportToWorld,
    hallAtClientPoint,
    isInAnyHall,
    hallScreenOffset,
    clampPan,
    zoomToPan,
    fitRect,
  }
}

export { hallAtPoint, nearestHall }
