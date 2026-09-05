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

/**
 * The columns a catalogue read asks for, in one place because there are two
 * readers of the same three tables: the couple's `loadMenuCatalogue` and the
 * CRM's `useTenantMenus`, both through `fetchMenuCatalogue`.
 *
 * Plain `const` strings and not arrays: supabase-js resolves the row type from
 * the literal handed to `.select()`, so these have to stay string literals to
 * type anything at all.
 *
 * `created_at` is in all three for both readers. It is `byPosition`'s first
 * tiebreaker, so a reader that drops it sorts rows in memory differently from
 * the way the database ordered them - which is the whole thing that comparator
 * exists to prevent.
 */
export const MENU_PACKAGE_COLUMNS =
  "id, name, description, price_per_person_minor, position, archived_at, created_at"
export const MENU_COURSE_COLUMNS =
  "id, menu_package_id, name, choose_count, serving_note, per_guest_choice, position, archived_at, created_at"
export const MENU_OPTION_COLUMNS =
  "id, menu_course_id, name, note, position, archived_at, created_at"

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
 * Clean up a typed field before storing it: trim, cap at the column's length.
 * Returns null for blanks, so a caller can treat "nothing to save" and
 * "invalid" as one case. Mirrors `canonicalizeDietary`.
 *
 * Every commit-on-blur handler in the CRM editor is one of these two functions
 * with a different bound - they were eight copies of the same three lines, and
 * the copies had already drifted apart on whether whitespace is collapsed.
 */
export const canonicalizeText = (raw: string, max: number): string | null => {
  const cleaned = raw.trim().slice(0, max)
  return cleaned.length > 0 ? cleaned : null
}

/**
 * The same, for a **single-line** field: runs of whitespace collapse to one
 * space first.
 *
 * Two functions rather than a flag, because the distinction is a property of the
 * control and not of the call. Every `<Input>` on the menu screen wants this
 * one; the package description is a `<Textarea>` and wants `canonicalizeText`,
 * since collapsing there would eat the newlines a venue deliberately typed.
 */
export const canonicalizeLine = (raw: string, max: number): string | null =>
  canonicalizeText(raw.replace(/\s+/g, " "), max)

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
 * What an archive button writes: a timestamp, or null to restore.
 *
 * One expression rather than a ternary per row type, so "archive" and "restore"
 * cannot end up meaning different things on packages and on dishes - and so the
 * one place that decides it is next to `isLive`, which is what every reader of
 * the column goes through.
 */
export const toggleArchivedAt = (row: {
  archived_at: string | null
}): string | null => (isLive(row) ? new Date().toISOString() : null)

/**
 * The children of one parent row.
 *
 * The catalogue is held as three flat arrays - by the CRM hook, by `menu.store`
 * and by every component either hands rows to - so descending one level is a
 * `filter` on a foreign key, and it was written out at a dozen sites. Two named
 * functions instead, because `c.menu_package_id === id` and
 * `o.menu_course_id === id` are exactly similar enough to be typed into each
 * other's place without anything failing to compile.
 */
export const coursesOf = <T extends { menu_package_id: string }>(
  courses: Array<T>,
  packageId: string
): Array<T> => courses.filter((course) => course.menu_package_id === packageId)

export const optionsOf = <T extends { menu_course_id: string }>(
  options: Array<T>,
  courseId: string
): Array<T> => options.filter((option) => option.menu_course_id === courseId)

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

/**
 * Dish ids to their names, for the four surfaces that have to resolve one: the
 * kitchen tally, the guest list, the printed report and the CSV export.
 *
 * Built over the catalogue **unfiltered by `archived_at`**, always. A dish the
 * venue retired after this couple ordered it still has to be nameable on every
 * row that holds it; `isLive` is for pickers, which offer a choice, not for
 * rendering one already made. Every call site had that comment on its own copy
 * of this one-liner, which is the sign it belonged here.
 *
 * The returned map's `get` is exactly `tallyByOption`'s `nameOf` - it hands
 * back `undefined` for an id the catalogue cannot name, which that function
 * counts into `unnamed`.
 */
export const dishNameIndex = (
  options: Array<Pick<MenuOption, "id" | "name">>
): Map<string, string> =>
  new Map(options.map((option) => [option.id, option.name]))

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
  // `undefined` as well as `null`, so a `dishNameIndex` map's `get` can be
  // passed straight in rather than through a `?? null` wrapper at every site.
  nameOf: (id: string) => string | null | undefined
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
