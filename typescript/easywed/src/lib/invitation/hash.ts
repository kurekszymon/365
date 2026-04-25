import LZString from "lz-string"
import type {
  InvitationColorScheme,
  InvitationDesign,
  InvitationTemplate,
  InvitationTexts,
} from "@/stores/invitation.store"
import { TEMPLATES } from "@/lib/invitation/templates"

const VALID_TEMPLATES = TEMPLATES.map((t) => t.id)
const VALID_COLOR_SCHEMES = TEMPLATES.flatMap((t) => t.colorSchemes)

const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"]

function isSafeObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false
  return !DANGEROUS_KEYS.some((k) => k in v)
}

function str(v: unknown): string {
  return typeof v === "string" ? v : ""
}

function validateDesign(raw: unknown): InvitationDesign | null {
  if (!isSafeObject(raw)) return null

  const { template, colorScheme, fontId, quantity, texts } = raw

  if (!VALID_TEMPLATES.includes(template as InvitationTemplate)) {
    return null
  }

  if (!VALID_COLOR_SCHEMES.includes(colorScheme as InvitationColorScheme)) {
    return null
  }

  if (typeof fontId !== "string" || fontId.length === 0) {
    return null
  }

  if (
    typeof quantity !== "number" ||
    quantity <= 0 ||
    !Number.isFinite(quantity)
  ) {
    return null
  }

  if (!isSafeObject(texts)) {
    return null
  }

  const t = texts

  const validatedTexts: InvitationTexts = {
    headline: str(t.headline),
    coupleNames: str(t.coupleNames),
    date: str(t.date),
    time: str(t.time),
    venue: str(t.venue),
    venueAddress: str(t.venueAddress),
    rsvpEmail: str(t.rsvpEmail),
    rsvpDeadline: str(t.rsvpDeadline),
    guestSalutation: str(t.guestSalutation),
    footer: str(t.footer),
  }

  return {
    template: template as InvitationTemplate,
    colorScheme: colorScheme as InvitationColorScheme,
    fontId,
    quantity,
    texts: validatedTexts,
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
