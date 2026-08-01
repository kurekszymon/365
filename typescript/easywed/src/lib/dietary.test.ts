import { describe, expect, it } from "vitest"
import {
  DIETARY_PRESETS,
  MAX_DIETARY_TAG_LENGTH,
  canonicalizeDietary,
  collectDietaryTags,
  dietaryLabel,
  dietaryTone,
  sortDietaryTags,
} from "./dietary"
import { TAG_TONES } from "./tagTone"
import { AGE_GROUP_TONE } from "./ageGroup"
import type { TFunction } from "i18next"

// Identity translator: returns the key unchanged. Enough for the sort/label
// paths, which only need a stable label per tag.
const t = ((key: string) => key) as unknown as TFunction

describe("canonicalizeDietary", () => {
  it("trims and collapses internal whitespace", () => {
    expect(canonicalizeDietary("  bez   laktozy  ")).toBe("bez laktozy")
  })

  it("snaps case/whitespace variants of a preset key", () => {
    expect(canonicalizeDietary("Vegan")).toBe("vegan")
    expect(canonicalizeDietary("  VEGAN ")).toBe("vegan")
  })

  it("snaps space-separated 'gluten free' to the preset", () => {
    expect(canonicalizeDietary("Gluten Free")).toBe("gluten-free")
  })

  it("does not hyphenate multi-word custom tags", () => {
    expect(canonicalizeDietary("bez laktozy")).toBe("bez laktozy")
  })

  it("caps length", () => {
    const long = "a".repeat(MAX_DIETARY_TAG_LENGTH + 10)
    expect(canonicalizeDietary(long)).toHaveLength(MAX_DIETARY_TAG_LENGTH)
  })

  it("returns null for blanks", () => {
    expect(canonicalizeDietary("")).toBeNull()
    expect(canonicalizeDietary("   ")).toBeNull()
  })
})

describe("collectDietaryTags", () => {
  it("returns distinct tags across guests", () => {
    const tags = collectDietaryTags([
      { dietary: ["vegan", "paleo"] },
      { dietary: ["vegan"] },
      { dietary: [] },
      { dietary: ["bez laktozy"] },
    ])
    expect(new Set(tags)).toEqual(new Set(["vegan", "paleo", "bez laktozy"]))
  })
})

describe("sortDietaryTags", () => {
  it("puts presets first in declaration order, rest alphabetical", () => {
    expect(sortDietaryTags(["paleo", "vegan", "vegetarian", "aaa"], t)).toEqual(
      ["vegetarian", "vegan", "aaa", "paleo"]
    )
  })

  it("dedupes", () => {
    expect(sortDietaryTags(["vegan", "vegan"], t)).toEqual(["vegan"])
  })
})

describe("dietaryLabel", () => {
  it("translates known keys, passes custom tags through", () => {
    expect(dietaryLabel(t, "vegan")).toBe("guests.dietary.vegan")
    expect(dietaryLabel(t, "bez laktozy")).toBe("bez laktozy")
  })
})

describe("dietaryTone", () => {
  const presetTones = DIETARY_PRESETS.map(dietaryTone)

  it("gives each preset its own reserved tone", () => {
    expect(new Set(presetTones).size).toBe(DIETARY_PRESETS.length)
  })

  // Reserved by @/lib/ageGroup, so a kid badge never reads as a diet.
  it("leaves violet to the age groups", () => {
    expect(presetTones).not.toContain(AGE_GROUP_TONE)
  })

  it("gives custom tags a stable tone from the palette", () => {
    const tag = "bez laktozy"
    expect(TAG_TONES).toContain(dietaryTone(tag))
    expect(dietaryTone(tag)).toBe(dietaryTone(tag))
  })

  it("is stable across the canonicalize round-trip", () => {
    expect(dietaryTone(canonicalizeDietary("  Bez   Laktozy ")!)).toBe(
      dietaryTone("Bez Laktozy")
    )
  })
})
