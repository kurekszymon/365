import { describe, expect, it } from "vitest"
import {
  TAG_TONES,
  TAG_TONE_BADGE,
  TAG_TONE_BADGE_HOVER,
  TAG_TONE_SOLID,
  toneFromKey,
} from "./tagTone"

describe("toneFromKey", () => {
  it("always returns a tone from the palette", () => {
    for (const key of ["", "a", "bez laktozy", "halal", "🥕", "6-12"]) {
      expect(TAG_TONES).toContain(toneFromKey(key))
    }
  })

  // The whole point of hashing rather than storing a per-wedding color table:
  // the same tag must look the same for every user, forever.
  it("is deterministic", () => {
    expect(toneFromKey("lactose-free")).toBe(toneFromKey("lactose-free"))
  })

  it("distinguishes tags that differ", () => {
    expect(toneFromKey("halal")).not.toBe(toneFromKey("kosher"))
  })

  it("spreads across the palette rather than collapsing onto one tone", () => {
    const keys = Array.from({ length: 200 }, (_, i) => `tag-${i}`)
    const used = new Set(keys.map(toneFromKey))
    expect(used.size).toBe(TAG_TONES.length)
  })
})

describe("tone class maps", () => {
  // Tailwind v4 only compiles class names it can read verbatim in the source,
  // so a missing entry here means an invisible pill, not a type error.
  it("cover every tone", () => {
    for (const tone of TAG_TONES) {
      expect(TAG_TONE_BADGE[tone]).toContain(`text-tag-${tone}`)
      expect(TAG_TONE_BADGE_HOVER[tone]).toContain(`bg-tag-${tone}`)
      expect(TAG_TONE_SOLID[tone]).toContain(`bg-tag-${tone}`)
    }
  })
})
