import { describe, expect, it } from "vitest"
import {
  ADULT_AGE_GROUP,
  MAX_AGE_GROUP_LENGTH,
  ageGroupLabel,
  canonicalizeAgeGroup,
  childAgeGroup,
  collectAgeGroups,
  countKids,
  isAdultAgeGroup,
  isKidAgeGroup,
  sortAgeGroups,
  toStoredAgeGroup,
} from "./ageGroup"
import type { TFunction } from "i18next"

// Identity translator: returns the key unchanged. Enough for the sort/label
// paths, which only need a stable label per group.
const t = ((key: string) => key) as unknown as TFunction

describe("canonicalizeAgeGroup", () => {
  it("returns null for blanks", () => {
    expect(canonicalizeAgeGroup("   ")).toBeNull()
  })

  it("snaps a spaced or zero-padded range onto the preset form", () => {
    expect(canonicalizeAgeGroup("0 - 3")).toBe("0-3")
    expect(canonicalizeAgeGroup("00-3")).toBe("0-3")
  })

  it("accepts an en dash as the range separator", () => {
    expect(canonicalizeAgeGroup("3–6")).toBe("3-6")
  })

  it("snaps case variants of the adult preset", () => {
    expect(canonicalizeAgeGroup("Adult")).toBe(ADULT_AGE_GROUP)
  })

  it("keeps a custom bracket verbatim (trimmed)", () => {
    expect(canonicalizeAgeGroup("  6-12 lat ")).toBe("6-12 lat")
  })

  it("caps length at the DB limit", () => {
    const long = "x".repeat(MAX_AGE_GROUP_LENGTH + 10)
    expect(canonicalizeAgeGroup(long)).toHaveLength(MAX_AGE_GROUP_LENGTH)
  })
})

describe("adult defaulting", () => {
  it("treats missing, null and the explicit preset as adult", () => {
    expect(isAdultAgeGroup(undefined)).toBe(true)
    expect(isAdultAgeGroup(null)).toBe(true)
    expect(isAdultAgeGroup("")).toBe(true)
    expect(isAdultAgeGroup(ADULT_AGE_GROUP)).toBe(true)
    expect(isAdultAgeGroup("0-3")).toBe(false)
  })

  it("exposes only child brackets for display", () => {
    expect(childAgeGroup(ADULT_AGE_GROUP)).toBeNull()
    expect(childAgeGroup("0-3")).toBe("0-3")
  })

  it("stores adults as null so untouched rows stay correct", () => {
    expect(toStoredAgeGroup(ADULT_AGE_GROUP)).toBeNull()
    expect(toStoredAgeGroup(undefined)).toBeNull()
    expect(toStoredAgeGroup("3-6")).toBe("3-6")
  })
})

describe("isKidAgeGroup", () => {
  it("counts the preset ranges", () => {
    expect(isKidAgeGroup("0-3")).toBe(true)
    expect(isKidAgeGroup("3-6")).toBe(true)
  })

  it("excludes adults and untagged guests", () => {
    expect(isKidAgeGroup(ADULT_AGE_GROUP)).toBe(false)
    expect(isKidAgeGroup(null)).toBe(false)
    expect(isKidAgeGroup(undefined)).toBe(false)
    expect(isKidAgeGroup("")).toBe(false)
  })

  it("reads a custom numeric bracket by its lower bound", () => {
    expect(isKidAgeGroup("12-18")).toBe(true)
    expect(isKidAgeGroup("17")).toBe(true)
    expect(isKidAgeGroup("18-25")).toBe(false)
    expect(isKidAgeGroup("60+")).toBe(false)
  })

  it("treats a non-numeric custom bracket as a kid bracket", () => {
    expect(isKidAgeGroup("teen")).toBe(true)
    expect(isKidAgeGroup("niemowlę")).toBe(true)
  })
})

describe("countKids", () => {
  it("totals every under-18 regardless of which bracket was used", () => {
    expect(
      countKids([
        { ageGroup: "0-3" },
        { ageGroup: "3-6" },
        { ageGroup: "12-18" },
        { ageGroup: ADULT_AGE_GROUP },
        { ageGroup: "18-25" },
        {},
      ])
    ).toBe(3)
  })
})

describe("collectAgeGroups", () => {
  it("returns the distinct child brackets in use, skipping adults", () => {
    const groups = collectAgeGroups([
      { ageGroup: "0-3" },
      { ageGroup: "0-3" },
      { ageGroup: ADULT_AGE_GROUP },
      {},
      { ageGroup: "6-12" },
    ])
    expect(groups.sort()).toEqual(["0-3", "6-12"])
  })
})

describe("sortAgeGroups", () => {
  it("puts presets first, then custom brackets by lower bound", () => {
    expect(
      sortAgeGroups(["6-12", "3-6", "12-18", ADULT_AGE_GROUP, "0-3"], t)
    ).toEqual([ADULT_AGE_GROUP, "0-3", "3-6", "6-12", "12-18"])
  })

  it("dedupes", () => {
    expect(sortAgeGroups(["0-3", "0-3"], t)).toEqual(["0-3"])
  })
})

describe("ageGroupLabel", () => {
  it("translates presets and passes custom brackets through", () => {
    expect(ageGroupLabel(t, "0-3")).toBe("guests.age_group.0-3")
    expect(ageGroupLabel(t, "6-12 lat")).toBe("6-12 lat")
  })
})
