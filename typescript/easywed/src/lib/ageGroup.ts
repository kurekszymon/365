import type { TFunction } from "i18next"
import { normalize } from "@/lib/import/guestsImport"

// A guest's age group: exactly one per guest (unlike dietary tags, which are a
// set). "adult" is the implicit default - a guest with no explicit group is an
// adult - so only the child brackets ever need storing or displaying.
export const ADULT_AGE_GROUP = "adult"

// The brackets offered out of the box in the guest form. Anything else is a
// bracket the user typed (e.g. "6-12"), which is how the ranges stay editable
// without a per-wedding settings table. Kept as a pure module (no store import)
// so it stays testable, mirroring @/lib/dietary.
export const AGE_GROUP_PRESETS = [ADULT_AGE_GROUP, "0-3", "3-6"] as const

const PRESET_SET: ReadonlySet<string> = new Set(AGE_GROUP_PRESETS)

// Mirrors the DB `guests_age_group_shape` constraint. Enforced client-side too
// so guest-mode (localStorage) values stay within range and survive the
// sign-in migration into Postgres.
export const MAX_AGE_GROUP_LENGTH = 24

export const isAgeGroupPreset = (group: string): boolean =>
  PRESET_SET.has(group)

// True when the guest is an adult - the default - which is the case for a
// missing/blank value as well as the explicit "adult" preset. Everything that
// renders a badge checks this first, so adults stay unlabelled.
export const isAdultAgeGroup = (group: string | null | undefined): boolean =>
  !group || group === ADULT_AGE_GROUP

// The guest's group when it's worth showing (a child bracket), else null.
// Adults are the default, so every badge/print surface renders nothing for
// them; this keeps that check and the narrowing in one place.
export const childAgeGroup = (
  group: string | null | undefined
): string | null => (isAdultAgeGroup(group) ? null : (group ?? null))

// Label for a group: translated for the presets, otherwise the raw value.
// Custom values are NOT routed through `t()` for the same reason as dietary
// tags - i18next treats `.` as a key separator and `:` as a namespace one.
export const ageGroupLabel = (t: TFunction, group: string): string =>
  PRESET_SET.has(group) ? t(`guests.age_group.${group}`) : group

// Clean up a raw value before storing it: trim, collapse internal whitespace,
// cap length, and snap to a known preset when it means the same thing, so
// "0 - 3" or "Adult" can't create a near-duplicate. Returns null for blanks.
export const canonicalizeAgeGroup = (raw: string): string | null => {
  const cleaned = raw.trim().replace(/\s+/g, " ")
  if (cleaned.length === 0) return null
  if (normalize(cleaned) === ADULT_AGE_GROUP) return ADULT_AGE_GROUP
  // A bare numeric range is normalized to `a-b` (no spaces, no leading zeros)
  // so "0 - 3", "00-3" and "0–3" (en dash) all collapse onto the preset.
  const range = /^(\d{1,2})\s*[-–]\s*(\d{1,2})$/.exec(cleaned)
  if (range) return `${Number(range[1])}-${Number(range[2])}`
  return cleaned.slice(0, MAX_AGE_GROUP_LENGTH)
}

// What goes in the DB column: null for adults (the default), so pre-existing
// rows and untouched guests need no backfill.
export const toStoredAgeGroup = (
  group: string | null | undefined
): string | null => (isAdultAgeGroup(group) ? null : (group ?? null))

// Distinct non-adult groups actually in use across a guest list. Structural
// param type so this never depends on the store's `Guest` shape.
export const collectAgeGroups = (
  guests: ReadonlyArray<{ ageGroup?: string | null }>
): Array<string> => {
  const seen = new Set<string>()
  for (const guest of guests) {
    const group = childAgeGroup(guest.ageGroup)
    if (group) seen.add(group)
  }
  return [...seen]
}

// Presets first (in declaration order, so "adult" leads), then custom brackets.
// Custom ones sort numerically by their lower bound when they have one, else
// alphabetically, so "6-12" lands after "3-6" rather than between "0-3" and it.
export const sortAgeGroups = (
  groups: Iterable<string>,
  t: TFunction
): Array<string> => {
  const unique = [...new Set(groups)]
  const presetRank = (group: string) => {
    const idx = AGE_GROUP_PRESETS.indexOf(
      group as (typeof AGE_GROUP_PRESETS)[number]
    )
    return idx === -1 ? AGE_GROUP_PRESETS.length : idx
  }
  const lowerBound = (group: string) => {
    const match = /^(\d{1,2})/.exec(group)
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY
  }
  return unique.sort((a, b) => {
    const ra = presetRank(a)
    const rb = presetRank(b)
    if (ra !== rb) return ra - rb
    const la = lowerBound(a)
    const lb = lowerBound(b)
    if (la !== lb) return la - lb
    return ageGroupLabel(t, a).localeCompare(ageGroupLabel(t, b))
  })
}
