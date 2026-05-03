import LZString from "lz-string"
import type {
  FieldFormat,
  InvitationColorScheme,
  InvitationDesign,
  InvitationSide,
  InvitationTemplate,
  InvitationTexts,
  SeparatorConfig,
  SeparatorStyle,
} from "@/stores/invitation.store"
import {
  CARD_H,
  CARD_W,
  DEFAULT_FIELD_ORDER,
  DEFAULT_FIELD_SIDES,
  SEPARATOR_STYLE_OPTIONS,
  TEMPLATES,
  TEXT_MAX_LENGTHS,
  isFieldKey,
  isSeparatorId,
  isTxtId,
} from "@/lib/invitation/templates"
import { FONT_OPTIONS } from "@/lib/invitation/fonts"
import { sanitizeGuestNames } from "@/lib/invitation/guestNames"

const VALID_TEMPLATES = TEMPLATES.map((t) => t.id)
const VALID_FONT_IDS = new Set(FONT_OPTIONS.map((f) => f.id))
const VALID_SEP_STYLES = new Set<string>(
  SEPARATOR_STYLE_OPTIONS.map((o) => o.id)
)

function validateFieldSides(
  raw: Record<string, unknown>
): Record<string, InvitationSide> {
  const sides: Record<string, InvitationSide> = { ...DEFAULT_FIELD_SIDES }
  // Known field keys
  for (const key of Object.keys(DEFAULT_FIELD_SIDES)) {
    const v = raw[key]
    if (v === "front" || v === "back" || v === "none") sides[key] = v
  }
  // Separator + text-block IDs
  for (const [key, v] of Object.entries(raw)) {
    if (
      (isSeparatorId(key) || isTxtId(key)) &&
      (v === "front" || v === "back" || v === "none")
    ) {
      sides[key] = v
    }
  }
  return sides
}

const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"]

function isSafeObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false
  return !DANGEROUS_KEYS.some((k) => Object.hasOwn(v, k))
}

function str(v: unknown, maxLength: number): string {
  return typeof v === "string" ? v.slice(0, maxLength) : ""
}

function validateDesign(raw: unknown): InvitationDesign | null {
  if (!isSafeObject(raw)) return null

  const { template, colorScheme: rawScheme, fontId, quantity, texts } = raw

  if (!VALID_TEMPLATES.includes(template as InvitationTemplate)) return null

  const templateMeta = TEMPLATES.find((t) => t.id === template)!

  const colorScheme = templateMeta.colorSchemes.includes(
    rawScheme as InvitationColorScheme
  )
    ? (rawScheme as InvitationColorScheme)
    : templateMeta.defaultColorScheme

  if (typeof fontId !== "string" || !VALID_FONT_IDS.has(fontId)) return null

  if (typeof quantity !== "number" || !Number.isFinite(quantity)) return null
  const clampedQuantity = Math.min(1000, Math.max(1, Math.round(quantity)))

  if (!isSafeObject(texts)) return null

  const t = texts

  const validatedTexts: InvitationTexts = {
    headline: str(t.headline, TEXT_MAX_LENGTHS.headline),
    coupleNames: str(t.coupleNames, TEXT_MAX_LENGTHS.coupleNames),
    date: str(t.date, TEXT_MAX_LENGTHS.date),
    time: str(t.time, TEXT_MAX_LENGTHS.time),
    venue: str(t.venue, TEXT_MAX_LENGTHS.venue),
    venueAddress: str(t.venueAddress, TEXT_MAX_LENGTHS.venueAddress),
    rsvpEmail: str(t.rsvpEmail, TEXT_MAX_LENGTHS.rsvpEmail),
    rsvpDeadline: str(t.rsvpDeadline, TEXT_MAX_LENGTHS.rsvpDeadline),
    guestSalutation: str(t.guestSalutation, TEXT_MAX_LENGTHS.guestSalutation),
    footer: str(t.footer, TEXT_MAX_LENGTHS.footer),
  }

  const guestNames = Array.isArray(raw.guestNames)
    ? sanitizeGuestNames(
        (raw.guestNames as Array<unknown>).filter(
          (n): n is string => typeof n === "string"
        )
      )
    : []

  const fieldSides = isSafeObject(raw.fieldSides)
    ? validateFieldSides(raw.fieldSides)
    : DEFAULT_FIELD_SIDES

  const fieldOrder = Array.isArray(raw.fieldOrder)
    ? validateFieldOrder(raw.fieldOrder as Array<unknown>)
    : DEFAULT_FIELD_ORDER

  const fieldPositions: Partial<Record<string, { x: number; y: number }>> = {}
  if (isSafeObject(raw.fieldPositions)) {
    for (const [k, v] of Object.entries(raw.fieldPositions)) {
      if (
        (isFieldKey(k) || isSeparatorId(k)) &&
        isSafeObject(v) &&
        typeof v.x === "number" &&
        typeof v.y === "number" &&
        Number.isFinite(v.x) &&
        Number.isFinite(v.y)
      ) {
        fieldPositions[k] = {
          x: Math.max(0, Math.min(CARD_W, Math.round(v.x))),
          y: Math.max(0, Math.min(CARD_H, Math.round(v.y))),
        }
      }
    }
  }

  const fieldFonts: Partial<Record<keyof InvitationTexts, string>> = {}
  if (isSafeObject(raw.fieldFonts)) {
    for (const [k, v] of Object.entries(raw.fieldFonts)) {
      if (isFieldKey(k) && typeof v === "string" && VALID_FONT_IDS.has(v)) {
        fieldFonts[k] = v
      }
    }
  }

  const fieldFormats: Partial<Record<string, FieldFormat>> = {}
  if (isSafeObject(raw.fieldFormats)) {
    for (const [k, v] of Object.entries(raw.fieldFormats)) {
      if ((isFieldKey(k) || isTxtId(k)) && isSafeObject(v)) {
        const fmt: FieldFormat = {}
        if (typeof v.bold === "boolean") fmt.bold = v.bold
        if (typeof v.italic === "boolean") fmt.italic = v.italic
        if (typeof v.underline === "boolean") fmt.underline = v.underline
        if (
          typeof v.fontSize === "number" &&
          v.fontSize >= 6 &&
          v.fontSize <= 120
        ) {
          fmt.fontSize = Math.round(v.fontSize)
        }
        if (Object.keys(fmt).length > 0) {
          fieldFormats[k] = fmt
        }
      }
    }
  }

  const separatorStyles: Record<string, SeparatorStyle> = {}
  if (isSafeObject(raw.separatorStyles)) {
    for (const [k, v] of Object.entries(raw.separatorStyles)) {
      if (
        isSeparatorId(k) &&
        typeof v === "string" &&
        VALID_SEP_STYLES.has(v)
      ) {
        separatorStyles[k] = v as SeparatorStyle
      }
    }
  }

  const separatorConfigs: Record<string, SeparatorConfig> = {}
  if (isSafeObject(raw.separatorConfigs)) {
    const VALID_THICKNESS = new Set([0.5, 1, 2, 4])
    for (const [k, v] of Object.entries(raw.separatorConfigs)) {
      if (isSeparatorId(k) && isSafeObject(v)) {
        const cfg: SeparatorConfig = {}
        if (
          typeof v.widthPct === "number" &&
          v.widthPct >= 20 &&
          v.widthPct <= 100
        ) {
          cfg.widthPct = Math.round(v.widthPct / 5) * 5
        }
        if (
          typeof v.thicknessPx === "number" &&
          VALID_THICKNESS.has(v.thicknessPx)
        ) {
          cfg.thicknessPx = v.thicknessPx
        }
        if (Object.keys(cfg).length > 0) separatorConfigs[k] = cfg
      }
    }
  }

  const textBlocks: Record<string, string> = {}
  if (isSafeObject(raw.textBlocks)) {
    for (const [k, v] of Object.entries(raw.textBlocks)) {
      if (isTxtId(k) && typeof v === "string") {
        textBlocks[k] = v.slice(0, 500)
      }
    }
  }

  return {
    template: template as InvitationTemplate,
    colorScheme,
    fontId,
    fieldFonts,
    fieldFormats,
    separatorStyles,
    separatorConfigs,
    textBlocks,
    quantity: clampedQuantity,
    texts: validatedTexts,
    fieldSides,
    fieldOrder,
    fieldPositions,
    guestNames,
  }
}

function validateFieldOrder(raw: Array<unknown>): Array<string> {
  const validFieldKeys = new Set(DEFAULT_FIELD_ORDER)
  const seen = new Set<string>()
  const result: Array<string> = []

  for (const item of raw) {
    if (typeof item !== "string") continue
    if (isSeparatorId(item) || isTxtId(item)) {
      // Dynamic IDs are unique; allow each once
      if (!seen.has(item)) {
        seen.add(item)
        result.push(item)
      }
    } else if (validFieldKeys.has(item)) {
      if (!seen.has(item)) {
        seen.add(item)
        result.push(item)
      }
    }
  }

  // Append any missing field keys at the end (forward-compat)
  for (const key of DEFAULT_FIELD_ORDER) {
    if (!seen.has(key)) result.push(key)
  }

  return result
}

export function encodeDesign(design: InvitationDesign): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(design))
}

export function decodeDesign(raw: string): InvitationDesign | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(
      raw.startsWith("#") ? raw.slice(1) : raw
    )
    if (!json) return null
    return validateDesign(JSON.parse(json))
  } catch {
    return null
  }
}
