import LZString from "lz-string"
import type {
  InvitationColorScheme,
  InvitationDesign,
  InvitationSide,
  InvitationTemplate,
  InvitationTexts,
} from "@/stores/invitation.store"
import {
  DEFAULT_FIELD_ORDER,
  DEFAULT_FIELD_SIDES,
  TEMPLATES,
  TEXT_MAX_LENGTHS,
} from "@/lib/invitation/templates"
import { sanitizeGuestNames } from "@/lib/invitation/guestNames"

const VALID_TEMPLATES = TEMPLATES.map((t) => t.id)

function validateFieldSides(
  raw: Record<string, unknown>
): Record<keyof InvitationTexts, InvitationSide> {
  const sides = { ...DEFAULT_FIELD_SIDES }
  const keys = Object.keys(DEFAULT_FIELD_SIDES) as Array<keyof InvitationTexts>
  for (const key of keys) {
    const v = raw[key]
    if (v === "front" || v === "back") sides[key] = v
  }
  return sides
}

const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"]

function isSafeObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false
  // Use own-property check: inherited keys like constructor are fine,
  // only an own __proto__/constructor key indicates a pollution attempt.
  return !DANGEROUS_KEYS.some((k) => Object.hasOwn(v, k))
}

function str(v: unknown, maxLength: number): string {
  return typeof v === "string" ? v.slice(0, maxLength) : ""
}

function validateDesign(raw: unknown): InvitationDesign | null {
  if (!isSafeObject(raw)) return null

  const { template, colorScheme: rawScheme, fontId, quantity, texts } = raw

  if (!VALID_TEMPLATES.includes(template as InvitationTemplate)) return null

  // Resolve template metadata (safe: we just validated template is in VALID_TEMPLATES)
  const templateMeta = TEMPLATES.find((t) => t.id === template)!

  // Normalize mismatched scheme rather than reject — old/shared hashes stay usable
  const colorScheme = templateMeta.colorSchemes.includes(
    rawScheme as InvitationColorScheme
  )
    ? (rawScheme as InvitationColorScheme)
    : templateMeta.defaultColorScheme

  if (typeof fontId !== "string" || fontId.length === 0) return null

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

  const fieldPositions: Partial<
    Record<keyof InvitationTexts, { x: number; y: number }>
  > = {}
  if (isSafeObject(raw.fieldPositions)) {
    const validFieldKeys = new Set<string>(DEFAULT_FIELD_ORDER)
    for (const [k, v] of Object.entries(raw.fieldPositions)) {
      if (
        validFieldKeys.has(k) &&
        isSafeObject(v) &&
        typeof v.x === "number" &&
        typeof v.y === "number" &&
        Number.isFinite(v.x) &&
        Number.isFinite(v.y)
      ) {
        fieldPositions[k as keyof InvitationTexts] = {
          x: Math.max(-100, Math.min(685, Math.round(v.x))),
          y: Math.max(-100, Math.min(930, Math.round(v.y))),
        }
      }
    }
  }

  return {
    template: template as InvitationTemplate,
    colorScheme,
    fontId,
    quantity: clampedQuantity,
    texts: validatedTexts,
    fieldSides,
    fieldOrder,
    fieldPositions,
    guestNames,
  }
}

function validateFieldOrder(raw: Array<unknown>): Array<keyof InvitationTexts> {
  const validKeys = new Set(DEFAULT_FIELD_ORDER)
  const seen = new Set<keyof InvitationTexts>()
  const result: Array<keyof InvitationTexts> = []
  for (const item of raw) {
    if (
      typeof item === "string" &&
      validKeys.has(item as keyof InvitationTexts)
    ) {
      const key = item as keyof InvitationTexts
      if (!seen.has(key)) {
        seen.add(key)
        result.push(key)
      }
    }
  }
  // Append any keys missing from the raw array (forward-compat)
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
