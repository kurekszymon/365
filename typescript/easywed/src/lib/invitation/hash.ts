import LZString from "lz-string"
import type {
  InvitationColorScheme,
  InvitationDesign,
  InvitationTemplate,
  InvitationTexts,
} from "@/stores/invitation.store"
import { TEMPLATES, TEXT_MAX_LENGTHS } from "@/lib/invitation/templates"
import { sanitizeGuestNames } from "@/lib/invitation/guestNames"

const VALID_TEMPLATES = TEMPLATES.map((t) => t.id)

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

  return {
    template: template as InvitationTemplate,
    colorScheme,
    fontId,
    quantity: clampedQuantity,
    texts: validatedTexts,
    guestNames,
  }
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
