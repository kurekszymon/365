import type { FieldGeometry, ResizeHandle } from '#/lib/invitation/types'
import { MIN_FIELD_H, MIN_FIELD_W } from '#/lib/invitation/defaults'

export interface Point {
  x: number
  y: number
}

// When SHIFT is held, lock drag to the dominant axis.
export function applyAxisLock(
  start: Point,
  current: Point,
  shiftHeld: boolean,
): { dx: number; dy: number } {
  const dx = current.x - start.x
  const dy = current.y - start.y
  if (!shiftHeld) return { dx, dy }
  if (Math.abs(dx) >= Math.abs(dy)) return { dx, dy: 0 }
  return { dx: 0, dy }
}

export function snapToGrid(
  value: number,
  gridSize: number,
  enabled: boolean,
): number {
  if (!enabled || gridSize <= 0) return value
  return Math.round(value / gridSize) * gridSize
}

export interface ResizeOpts {
  minW?: number
  minH?: number
  // When true (corner handles on text), compute font scale ratio via fontScaleFromResize
  lockAspect?: boolean
}

// Compute new geometry when dragging a resize handle.
export function resizeRect(
  initial: FieldGeometry,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  opts: ResizeOpts = {},
): FieldGeometry {
  const minW = opts.minW ?? MIN_FIELD_W
  const minH = opts.minH ?? MIN_FIELD_H

  let { x, y, w, h } = initial

  // Which edges are moved by this handle
  const movesLeft = handle === 'nw' || handle === 'w' || handle === 'sw'
  const movesRight = handle === 'ne' || handle === 'e' || handle === 'se'
  const movesTop = handle === 'nw' || handle === 'n' || handle === 'ne'
  const movesBottom = handle === 'sw' || handle === 's' || handle === 'se'

  if (movesRight) w = Math.max(minW, w + dx)
  if (movesBottom) h = Math.max(minH, h + dy)

  if (movesLeft) {
    const newW = Math.max(minW, w - dx)
    x = x + (w - newW)
    w = newW
  }

  if (movesTop) {
    const newH = Math.max(minH, h - dy)
    y = y + (h - newH)
    h = newH
  }

  if (opts.lockAspect) {
    // Maintain aspect ratio for corner drags (font-scaling mode)
    const scaleX = w / initial.w
    const scaleY = h / initial.h
    const scale = (scaleX + scaleY) / 2
    w = Math.max(minW, Math.round(initial.w * scale))
    h = Math.max(minH, Math.round(initial.h * scale))
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.round(h),
  }
}

// Ratio to scale fontSize by when a corner handle is dragged.
export function fontScaleFromResize(
  initial: FieldGeometry,
  next: FieldGeometry,
): number {
  const scaleX = next.w / initial.w
  const scaleY = next.h / initial.h
  return Math.sqrt(scaleX * scaleY)
}

// Clamp geometry so the field stays inside the card.
export function clampToBounds(
  geom: FieldGeometry,
  dims: { w: number; h: number },
): FieldGeometry {
  const w = Math.max(MIN_FIELD_W, Math.min(geom.w, dims.w))
  const h = Math.max(MIN_FIELD_H, Math.min(geom.h, dims.h))
  const x = Math.max(0, Math.min(geom.x, dims.w - w))
  const y = Math.max(0, Math.min(geom.y, dims.h - h))
  return { x, y, w, h }
}
