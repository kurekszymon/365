import LZString from 'lz-string'
import type {
  Design,
  Field,
  FieldFormat,
  FieldGeometry,
  PartContent,
  PartId,
  SeparatorStyle,
  SeparatorThickness,
} from '#/lib/invitation/types'
import { FONT_OPTIONS } from '#/lib/invitation/fonts'
import { VALID_COLOR_SCHEME_IDS } from '#/lib/invitation/colorSchemes'
import { VALID_ICON_KEYS } from '#/lib/invitation/icons'
import { sanitizeGuestNames } from '#/lib/invitation/guestNames'
import {
  MAX_FIELD_CONTENT_LENGTH,
  MAX_FIELD_ID_LENGTH,
  MAX_FIELDS_PER_SIDE,
  PART_DIMENSIONS,
} from '#/lib/invitation/defaults'

const VALID_FONT_IDS = new Set(FONT_OPTIONS.map((f) => f.id))
const VALID_SEP_STYLES = new Set(['line', 'heart', 'flower', 'star', 'diamond'])
const VALID_THICKNESSES = new Set<number>([0.5, 1, 2, 3])
const VALID_ALIGNS = new Set(['left', 'center', 'right'])
const VALID_PARTS: PartId[] = ['invitation', 'extra', 'envelope']
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype']

function isSafeObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false
  return !DANGEROUS_KEYS.some((k) => Object.hasOwn(v, k))
}

function clampInt(v: unknown, min: number, max: number): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
  return Math.min(max, Math.max(min, Math.round(v)))
}

function validateGeom(raw: unknown, partId: PartId): FieldGeometry | null {
  if (!isSafeObject(raw)) return null
  const dims = PART_DIMENSIONS[partId]
  const x = clampInt(raw.x, 0, dims.w)
  const y = clampInt(raw.y, 0, dims.h)
  const w = clampInt(raw.w, 1, dims.w)
  const h = clampInt(raw.h, 1, dims.h)
  if (x === undefined || y === undefined || w === undefined || h === undefined)
    return null
  return { x, y, w, h }
}

function validateFormat(raw: unknown): FieldFormat | undefined {
  if (!isSafeObject(raw)) return undefined
  const fmt: FieldFormat = {}
  if (typeof raw.bold === 'boolean') fmt.bold = raw.bold
  if (typeof raw.italic === 'boolean') fmt.italic = raw.italic
  if (typeof raw.underline === 'boolean') fmt.underline = raw.underline
  const fs = clampInt(raw.fontSize, 6, 120)
  if (fs !== undefined) fmt.fontSize = fs
  const fw = clampInt(raw.fontWeight, 100, 900)
  if (fw !== undefined) fmt.fontWeight = fw
  if (typeof raw.fontId === 'string' && VALID_FONT_IDS.has(raw.fontId))
    fmt.fontId = raw.fontId
  if (typeof raw.textAlign === 'string' && VALID_ALIGNS.has(raw.textAlign)) {
    fmt.textAlign = raw.textAlign as FieldFormat['textAlign']
  }
  if (typeof raw.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(raw.color))
    fmt.color = raw.color
  return Object.keys(fmt).length > 0 ? fmt : undefined
}

function validateField(raw: unknown, partId: PartId): Field | null {
  if (!isSafeObject(raw)) return null
  if (typeof raw.id !== 'string' || !raw.id) return null
  if (raw.id.length > MAX_FIELD_ID_LENGTH) return null

  const geom = validateGeom(raw.geom, partId)
  if (!geom) return null

  if (raw.type === 'text') {
    return {
      type: 'text',
      id: raw.id,
      content:
        typeof raw.content === 'string'
          ? raw.content.slice(0, MAX_FIELD_CONTENT_LENGTH)
          : '',
      format: validateFormat(raw.format),
      geom,
    }
  }

  if (raw.type === 'separator') {
    const style: SeparatorStyle =
      typeof raw.style === 'string' && VALID_SEP_STYLES.has(raw.style)
        ? (raw.style as SeparatorStyle)
        : 'line'
    const thickness: SeparatorThickness =
      typeof raw.thickness === 'number' && VALID_THICKNESSES.has(raw.thickness)
        ? (raw.thickness as SeparatorThickness)
        : 1
    return { type: 'separator', id: raw.id, style, thickness, geom }
  }

  if (raw.type === 'icon') {
    if (typeof raw.iconKey !== 'string' || !VALID_ICON_KEYS.has(raw.iconKey))
      return null
    const color =
      typeof raw.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(raw.color)
        ? raw.color
        : undefined
    return { type: 'icon', id: raw.id, iconKey: raw.iconKey, color, geom }
  }

  return null
}

function validatePartContent(raw: unknown, partId: PartId): PartContent {
  const fallback: PartContent = { front: [], back: [] }
  if (!isSafeObject(raw)) return fallback

  const validateSide = (side: unknown): Field[] => {
    if (!Array.isArray(side)) return []
    const seen = new Set<string>()
    const fields: Field[] = []
    for (const item of side) {
      if (fields.length >= MAX_FIELDS_PER_SIDE) break
      const f = validateField(item, partId)
      if (f && !seen.has(f.id)) {
        seen.add(f.id)
        fields.push(f)
      }
    }
    return fields
  }

  return {
    front: validateSide(raw.front),
    back: validateSide(raw.back),
  }
}

function validateDesign(raw: unknown): Design | null {
  if (!isSafeObject(raw)) return null
  if (raw.version !== 1) return null

  const colorScheme =
    typeof raw.colorScheme === 'string' &&
    VALID_COLOR_SCHEME_IDS.has(raw.colorScheme)
      ? raw.colorScheme
      : 'cream-gold'

  const defaultFontId =
    typeof raw.defaultFontId === 'string' &&
    VALID_FONT_IDS.has(raw.defaultFontId)
      ? raw.defaultFontId
      : 'playfair'

  if (!isSafeObject(raw.parts)) return null

  const parts = {} as Design['parts']
  for (const partId of VALID_PARTS) {
    parts[partId] = validatePartContent(raw.parts[partId], partId)
  }

  const guests = Array.isArray(raw.guests)
    ? sanitizeGuestNames(
        (raw.guests as unknown[]).filter(
          (n): n is string => typeof n === 'string',
        ),
      )
    : undefined

  const rawEp = isSafeObject(raw.enabledParts) ? raw.enabledParts : {}
  const enabledParts: Design['enabledParts'] = {
    extra: typeof rawEp.extra === 'boolean' ? rawEp.extra : true,
    envelope: typeof rawEp.envelope === 'boolean' ? rawEp.envelope : true,
  }

  return {
    version: 1,
    parts,
    colorScheme,
    defaultFontId,
    enabledParts,
    ...(guests ? { guests } : {}),
  }
}

export function encodeDesign(design: Design): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(design))
}

export function decodeDesign(raw: string): Design | null {
  try {
    const clean = raw.startsWith('#') ? raw.slice(1) : raw
    const json = LZString.decompressFromEncodedURIComponent(clean)
    if (!json) return null
    return validateDesign(JSON.parse(json))
  } catch {
    return null
  }
}
