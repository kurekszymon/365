import type {
  Design,
  FieldGeometry,
  PartContent,
  PartId,
} from '#/lib/invitation/types'

export interface PartDimensions {
  w: number
  h: number
}

export const PART_DIMENSIONS: Record<PartId, PartDimensions> = {
  invitation: { w: 585, h: 830 },
  extra: { w: 585, h: 830 },
  envelope: { w: 830, h: 585 },
}

export const SEPARATOR_STYLE_OPTIONS = [
  { id: 'line' as const, ornament: '—' },
  { id: 'heart' as const, ornament: '♥' },
  { id: 'flower' as const, ornament: '✿' },
  { id: 'star' as const, ornament: '✦' },
  { id: 'diamond' as const, ornament: '◆' },
]

const emptyPart = (): PartContent => ({ front: [], back: [] })

export const DEFAULT_DESIGN: Design = {
  version: 1,
  parts: {
    invitation: emptyPart(),
    extra: emptyPart(),
    envelope: emptyPart(),
  },
  colorScheme: 'cream-gold',
  defaultFontId: 'playfair',
  enabledParts: { extra: true, envelope: true },
}

// Maximum chars for a field ID. IDs used as React keys and HTML data-attributes;
// no functional need for long IDs, and unbounded length bloats undo history.
export const MAX_FIELD_ID_LENGTH = 64
// Cap prevents a crafted hash from flooding the canvas with thousands of
// fields, each of which spawns DOM nodes, selection frames, and undo entries.
export const MAX_FIELDS_PER_SIDE = 200
export const MIN_FIELD_W = 40
export const MIN_FIELD_H = 20
export const MAX_FIELD_CONTENT_LENGTH = 2000
// Clamp a geometry so the field stays inside the card
export function clampGeomToBounds(
  geom: FieldGeometry,
  dims: PartDimensions,
): FieldGeometry {
  const w = Math.max(MIN_FIELD_W, Math.min(geom.w, dims.w))
  const h = Math.max(MIN_FIELD_H, Math.min(geom.h, dims.h))
  const x = Math.max(0, Math.min(geom.x, dims.w - w))
  const y = Math.max(0, Math.min(geom.y, dims.h - h))
  return { x, y, w, h }
}
