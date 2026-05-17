import { describe, expect, it } from 'vitest'
import {
  applyAxisLock,
  clampToBounds,
  fontScaleFromResize,
  resizeRect,
  snapToGrid,
} from '#/lib/invitation/geometry'

describe('applyAxisLock', () => {
  it('returns full delta when SHIFT not held', () => {
    expect(applyAxisLock({ x: 0, y: 0 }, { x: 30, y: 20 }, false)).toEqual({
      dx: 30,
      dy: 20,
    })
  })

  it('locks to horizontal when dx > dy and SHIFT held', () => {
    expect(applyAxisLock({ x: 0, y: 0 }, { x: 40, y: 10 }, true)).toEqual({
      dx: 40,
      dy: 0,
    })
  })

  it('locks to vertical when dy > dx and SHIFT held', () => {
    expect(applyAxisLock({ x: 0, y: 0 }, { x: 5, y: 60 }, true)).toEqual({
      dx: 0,
      dy: 60,
    })
  })

  it('locks to horizontal when equal (tied goes to horizontal)', () => {
    expect(applyAxisLock({ x: 0, y: 0 }, { x: 20, y: 20 }, true)).toEqual({
      dx: 20,
      dy: 0,
    })
  })
})

describe('snapToGrid', () => {
  it('returns value unchanged when disabled', () => {
    expect(snapToGrid(17, 8, false)).toBe(17)
  })

  it('rounds to nearest grid step', () => {
    expect(snapToGrid(13, 8, true)).toBe(16) // 13/8=1.625 → rounds to 2 → 16
    expect(snapToGrid(11, 8, true)).toBe(8) // 11/8=1.375 → rounds to 1 → 8
  })

  it('handles exact multiples', () => {
    expect(snapToGrid(24, 8, true)).toBe(24)
  })
})

describe('resizeRect', () => {
  const initial = { x: 100, y: 100, w: 200, h: 100 }

  it('se handle grows right and down', () => {
    const r = resizeRect(initial, 'se', 50, 30)
    expect(r.w).toBe(250)
    expect(r.h).toBe(130)
    expect(r.x).toBe(100)
    expect(r.y).toBe(100)
  })

  it('nw handle shrinks from top-left', () => {
    const r = resizeRect(initial, 'nw', 20, 10)
    expect(r.x).toBe(120)
    expect(r.y).toBe(110)
    expect(r.w).toBe(180)
    expect(r.h).toBe(90)
  })

  it('respects minimum width', () => {
    const r = resizeRect(initial, 'e', -999, 0)
    expect(r.w).toBeGreaterThanOrEqual(40)
  })

  it('respects minimum height', () => {
    const r = resizeRect(initial, 's', 0, -999)
    expect(r.h).toBeGreaterThanOrEqual(20)
  })
})

describe('fontScaleFromResize', () => {
  it('returns 1 for unchanged geometry', () => {
    const g = { x: 0, y: 0, w: 100, h: 50 }
    expect(fontScaleFromResize(g, g)).toBeCloseTo(1)
  })

  it('returns 2 when both dimensions double', () => {
    const initial = { x: 0, y: 0, w: 100, h: 50 }
    const next = { x: 0, y: 0, w: 200, h: 100 }
    expect(fontScaleFromResize(initial, next)).toBeCloseTo(2)
  })
})

describe('clampToBounds', () => {
  const dims = { w: 585, h: 830 }

  it('does not clamp when inside bounds', () => {
    const g = { x: 50, y: 50, w: 200, h: 100 }
    expect(clampToBounds(g, dims)).toEqual(g)
  })

  it('clamps x so field stays on card', () => {
    const r = clampToBounds({ x: 500, y: 50, w: 200, h: 100 }, dims)
    expect(r.x + r.w).toBeLessThanOrEqual(dims.w)
  })

  it('clamps y so field stays on card', () => {
    const r = clampToBounds({ x: 50, y: 800, w: 200, h: 100 }, dims)
    expect(r.y + r.h).toBeLessThanOrEqual(dims.h)
  })

  it('clamps negative coordinates to 0', () => {
    const r = clampToBounds({ x: -50, y: -20, w: 200, h: 100 }, dims)
    expect(r.x).toBe(0)
    expect(r.y).toBe(0)
  })
})
