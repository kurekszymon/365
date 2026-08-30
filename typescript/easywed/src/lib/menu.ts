import type { TagTone } from "@/lib/tagTone"
import { toneFromKey } from "@/lib/tagTone"

// The venue menu domain, as plain data and pure functions.
//
// Pure module - no store import, no React - the shape @/lib/dietary uses, so
// the rules below are testable on their own and neither the CRM editor nor the
// couple's planner tab owns them. The types are **structural**: they describe
// the rows, and both the CRM hook and the planner store satisfy them without
// either importing the other.

/** A named, priced offer. `price_per_person_minor` is grosze - see @/lib/money. */
export type MenuPackage = {
  id: string
  name: string
  description: string | null
  price_per_person_minor: number
  position: number
  archived_at: string | null
}

/**
 * One course of a package, and the "pick N of these" rule over its options.
 *
 * `per_guest_choice` is the whole two-shapes decision in one boolean:
 *   false - a buffet. The couple picks `choose_count` dishes and everyone eats
 *           from the same set.
 *   true  - a plated course. The couple still narrows to `choose_count` dishes,
 *           and then *each guest* is assigned one of them.
 */
export type MenuCourse = {
  id: string
  menu_package_id: string
  name: string
  choose_count: number
  serving_note: string | null
  per_guest_choice: boolean
  position: number
  archived_at: string | null
}

/** One dish. `name` is venue-authored Polish free text - never an i18n key. */
export type MenuOption = {
  id: string
  menu_course_id: string
  name: string
  note: string | null
  position: number
  archived_at: string | null
}

// Bounds, mirroring the CHECK constraints in 20260822000001. Enforced
// client-side as well so a too-long dish name is caught by the form rather than
// coming back as a PostgREST constraint violation nobody can read.
export const MAX_PACKAGE_NAME_LENGTH = 60
export const MAX_PACKAGE_DESCRIPTION_LENGTH = 400
export const MAX_COURSE_NAME_LENGTH = 60
export const MAX_SERVING_NOTE_LENGTH = 120
export const MAX_DISH_NAME_LENGTH = 120
export const MAX_DISH_NOTE_LENGTH = 80
export const MIN_CHOOSE_COUNT = 1
export const MAX_CHOOSE_COUNT = 50

/**
 * A dish name for display: the venue's own text, verbatim.
 *
 * There is deliberately **no `t()` overload**, unlike `dietaryLabel`. Dietary
 * tags have three presets with translations and everything else is user text;
 * a dish has no presets at all, so routing one through i18next could only
 * misresolve - it treats `.` as a key separator and `:` as a namespace
 * separator, and menus are full of both ("Deska serow: 3 rodzaje").
 *
 * It exists as a function anyway so call sites read as a decision rather than
 * an oversight, and so there is one place to change if dish names ever grow a
 * per-locale variant.
 */
export const dishLabel = (option: Pick<MenuOption, "name">): string =>
  option.name

/**
 * Colour for a dish badge, keyed on the **name** rather than the uuid.
 *
 * Deliberate: "Rosol z domowym makaronem" appears as a separate row in every
 * package that offers it, so keying on the id would give the same dish a
 * different colour in each - and the kitchen report exists precisely to be
 * scanned across packages. Hashing the name means one dish is one colour
 * everywhere, forever, with no colour table to store or migrate.
 */
export const menuOptionTone = (name: string): TagTone => toneFromKey(name)

/**
 * Clean up a typed dish name before storing it: trim, collapse internal
 * whitespace, cap at the column's length. Returns null for blanks, so a caller
 * can treat "nothing to save" and "invalid" as one case. Mirrors
 * `canonicalizeDietary`.
 */
export const canonicalizeDishName = (raw: string): string | null => {
  const cleaned = raw.trim().replace(/\s+/g, " ").slice(0, MAX_DISH_NAME_LENGTH)
  return cleaned.length > 0 ? cleaned : null
}

/**
 * The `choose_count` a typed field commits, clamped to the CHECK's range so an
 * out-of-range number is refused by the form rather than by PostgREST.
 *
 * Returns null for a blank or unparseable field - "nothing to commit", the same
 * null `canonicalizeDishName` returns - so blurring an emptied field leaves the
 * stored number alone instead of snapping it to a bound. Takes the raw text
 * rather than a number precisely so it can tell "" apart from 0.
 */
export const parseChooseCount = (raw: string): number | null => {
  const parsed = Number(raw)
  if (raw.trim() === "" || !Number.isFinite(parsed)) return null

  return Math.min(
    MAX_CHOOSE_COUNT,
    Math.max(MIN_CHOOSE_COUNT, Math.round(parsed))
  )
}

/** Live rows only. Archived ones stay readable, but never offered for picking. */
export const isLive = <T extends { archived_at: string | null }>(
  row: T
): boolean => row.archived_at === null

/**
 * The one sort order every menu read uses: `position`, then `created_at`, then
 * `id`.
 *
 * `position` is not unique - a constraint would buy nothing, since a duplicate
 * costs only an arbitrary order - so the two tiebreakers are what make that
 * arbitrary order *stable* across loads and devices. Callers that read from
 * PostgREST get this from the query; this helper is for lists already in memory.
 */
export const byPosition = <
  T extends { position: number; created_at?: string; id: string },
>(
  a: T,
  b: T
): number =>
  a.position - b.position ||
  (a.created_at ?? "").localeCompare(b.created_at ?? "") ||
  a.id.localeCompare(b.id)

/**
 * Whether the couple has picked enough dishes for a course.
 *
 * `>=` rather than `===` because `choose_count` is a floor the venue sets, not
 * a cap the database enforces - see 20260822000002 on why no trigger counts
 * these. A couple who talked the venue into a seventh main is complete, not
 * broken.
 */
export const courseIsComplete = (
  course: Pick<MenuCourse, "choose_count">,
  pickedCount: number
): boolean => pickedCount >= course.choose_count

/** Portions per dish, plus the ones whose dish could not be named. */
export type DishTally = {
  rows: Array<{ id: string; name: string; count: number }>
  /**
   * Portions whose option id resolved to no name, summed.
   *
   * Not a row, because there is nothing to call it and a raw uuid on a kitchen
   * printout is worse than a shorter list. Not silence either: these are
   * dinners somebody is expecting. Reachable when a dish was hard-deleted out
   * from under an assignment, and wholesale when a wedding lost its venue - the
   * catalogue goes empty while `guests.menu_option_id` stays put, so *every*
   * portion lands here.
   */
  unnamed: number
}

/**
 * Count how many times each option id occurs, resolved to a label and sorted
 * for reading: biggest commitment first, then alphabetically so equal counts do
 * not reshuffle between loads.
 *
 * The same rule `VenuePeekSummary` sorts dietary tags by, and it is the rule
 * because this is a kitchen document: the number the chef cooks most of belongs
 * at the top.
 *
 * The unresolvable ids are returned as a count rather than dropped on the
 * floor. Dropping them silently is what let a printed report say "31 of 40
 * guests have a dish" over a list of portions summing to 19, with no sign of
 * where the other twelve went.
 */
export const tallyByOption = (
  optionIds: Iterable<string | null | undefined>,
  nameOf: (id: string) => string | null
): DishTally => {
  const counts = new Map<string, number>()
  for (const id of optionIds) {
    if (!id) continue
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  const rows: DishTally["rows"] = []
  let unnamed = 0

  for (const [id, count] of counts) {
    const name = nameOf(id)
    if (name) rows.push({ id, name, count })
    else unnamed += count
  }

  rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  return { rows, unnamed }
}
