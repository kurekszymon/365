import type { TFunction } from "i18next"
import { normalize } from "@/lib/import/guestsImport"

// Dietary tags are free-form strings. These presets are the pills offered out
// of the box in the guest form; anything else is a tag the user typed or
// imported. Kept as a pure module (no store import) so it stays testable and
// avoids an import cycle with the planner store.
export const DIETARY_PRESETS = ["vegetarian", "vegan", "gluten-free"] as const

// The presets are the only tags with an i18n label under `guests.dietary.*`;
// everything else is a user-typed tag shown verbatim.
const PRESET_SET: ReadonlySet<string> = new Set(DIETARY_PRESETS)

// True for the built-in presets. Custom (user-defined) tags are the deletable
// ones in the guest form.
export const isDietaryPreset = (tag: string): boolean => PRESET_SET.has(tag)

// Max tags per guest / max chars per tag - mirrors the DB `guests_dietary_shape`
// constraint. Enforced client-side too so guest-mode (localStorage) tags stay
// within range and survive the sign-in migration into Postgres.
export const MAX_DIETARY_TAGS = 12
export const MAX_DIETARY_TAG_LENGTH = 24

// Label for a tag: translated when it has a known key, otherwise the raw tag.
// Unknown tags are NOT routed through `t()` - i18next treats `.` as a key
// separator and `:` as a namespace separator, so a user-typed tag containing
// either would misresolve.
export const dietaryLabel = (t: TFunction, tag: string): string =>
  PRESET_SET.has(tag) ? t(`guests.dietary.${tag}`) : tag

// Normalize a raw tag for comparison/dedupe. Presets have a fixed normalized
// form so "Wegan", "vegan" and "  VEGAN " all collapse to the same key.
const normalizedPreset = (raw: string): string | null => {
  // The only multi-word preset is "gluten-free"; a space form ("gluten free")
  // should still snap to it. Nothing else needs whitespace-to-hyphen folding.
  const token = normalize(raw).replace(/\s+/g, "-")
  return PRESET_SET.has(token) ? token : null
}

// Clean up a raw tag before storing it: trim, collapse internal whitespace, cap
// length, and snap to a known key when it matches one (so custom entry can't
// create a near-duplicate of a preset). Returns null for blanks.
export const canonicalizeDietary = (raw: string): string | null => {
  const preset = normalizedPreset(raw)
  if (preset) return preset
  const cleaned = raw
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_DIETARY_TAG_LENGTH)
  return cleaned.length > 0 ? cleaned : null
}

// Distinct tags actually in use across a guest list. Structural param type so
// this never depends on the store's `Guest` shape.
export const collectDietaryTags = (
  guests: ReadonlyArray<{ dietary: Array<string> }>
): Array<string> => {
  const seen = new Set<string>()
  for (const guest of guests) {
    for (const tag of guest.dietary) seen.add(tag)
  }
  return [...seen]
}

// Presets first (in declaration order), then everything else alphabetically by
// its displayed label so the pill/filter rows read predictably.
export const sortDietaryTags = (
  tags: Iterable<string>,
  t: TFunction
): Array<string> => {
  const unique = [...new Set(tags)]
  const presetRank = (tag: string) => {
    const idx = DIETARY_PRESETS.indexOf(tag as (typeof DIETARY_PRESETS)[number])
    return idx === -1 ? DIETARY_PRESETS.length : idx
  }
  return unique.sort((a, b) => {
    const ra = presetRank(a)
    const rb = presetRank(b)
    if (ra !== rb) return ra - rb
    return dietaryLabel(t, a).localeCompare(dietaryLabel(t, b))
  })
}
