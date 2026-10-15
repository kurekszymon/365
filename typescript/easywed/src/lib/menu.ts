import type { TagTone } from "@/lib/tagTone"
import { toneFromKey } from "@/lib/tagTone"

// The venue menu domain, as plain data and pure functions. No store import, no
// React. Types are structural, so the CRM hook and the planner store satisfy
// them without importing each other.

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
 * `per_guest_choice`: false - buffet, the couple picks `choose_count` dishes and
 * everyone eats from the same set. true - plated, the couple narrows to
 * `choose_count` dishes and then each guest is assigned one of them.
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
 * The columns both catalogue readers ask for (`loadMenuCatalogue`,
 * `useTenantMenus`, via `fetchMenuCatalogue`).
 *
 * String literals rather than arrays: supabase-js resolves the row type from the
 * literal handed to `.select()`. `created_at` must stay in all three - it is
 * `byPosition`'s first tiebreaker, so dropping it sorts in memory differently
 * from the database.
 */
export const MENU_PACKAGE_COLUMNS =
  "id, name, description, price_per_person_minor, position, archived_at, created_at"
export const MENU_COURSE_COLUMNS =
  "id, menu_package_id, name, choose_count, serving_note, per_guest_choice, position, archived_at, created_at"
export const MENU_OPTION_COLUMNS =
  "id, menu_course_id, name, note, position, archived_at, created_at"

// Bounds, mirroring the CHECK constraints in 20260822000001, so an over-long
// field is caught by the form rather than by PostgREST.
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
 * No `t()` overload, unlike `dietaryLabel`. A dish has no presets, and i18next
 * would misresolve names containing `.` or `:` ("Deska serow: 3 rodzaje").
 */
export const dishLabel = (option: Pick<MenuOption, "name">): string =>
  option.name

/**
 * Colour for a dish badge, keyed on the name rather than the uuid: the same dish
 * is a separate row in every package that offers it, and the kitchen report is
 * scanned across packages.
 */
export const menuOptionTone = (name: string): TagTone => toneFromKey(name)

/**
 * Clean up a typed field before storing it: trim, cap at the column's length.
 * Returns null for blanks, so a caller can treat "nothing to save" and
 * "invalid" as one case. Mirrors `canonicalizeDietary`.
 */
export const canonicalizeText = (raw: string, max: number): string | null => {
  const cleaned = raw.trim().slice(0, max)
  return cleaned.length > 0 ? cleaned : null
}

/**
 * The same, for a single-line field: runs of whitespace collapse to one space.
 * Every `<Input>` wants this; the package description is a `<Textarea>` and
 * wants `canonicalizeText`, which keeps the newlines a venue typed.
 */
export const canonicalizeLine = (raw: string, max: number): string | null =>
  canonicalizeText(raw.replace(/\s+/g, " "), max)

/**
 * The `choose_count` a typed field commits, clamped to the CHECK's range.
 *
 * Null for a blank or unparseable field, so blurring an emptied field leaves the
 * stored number alone instead of snapping it to a bound. Takes raw text rather
 * than a number so it can tell "" apart from 0.
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

/** What an archive button writes: a timestamp, or null to restore. */
export const toggleArchivedAt = (row: {
  archived_at: string | null
}): string | null => (isLive(row) ? new Date().toISOString() : null)

/**
 * The children of one parent row. The catalogue is held as three flat arrays, so
 * descending one level is a filter on a foreign key; named because
 * `menu_package_id` and `menu_course_id` swap places without failing to compile.
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
 * `id`. `position` is not unique, so the tiebreakers are what keep the order
 * stable across loads and devices. For lists already in memory; PostgREST reads
 * get this from the query.
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
 * Whether the couple has picked enough dishes for a course. `>=` because
 * `choose_count` is a floor the venue sets, not a cap the database enforces -
 * see 20260822000002 on why no trigger counts these.
 */
export const courseIsComplete = (
  course: Pick<MenuCourse, "choose_count">,
  pickedCount: number
): boolean => pickedCount >= course.choose_count

/**
 * Dish ids to their names, for the surfaces that resolve one: kitchen tally,
 * guest list, printed report, CSV export.
 *
 * Always built over the catalogue **unfiltered by `archived_at`** - a dish the
 * venue retired after this couple ordered it still has to be nameable. `isLive`
 * is for pickers, which offer a choice, not for rendering one already made.
 */
export const dishNameIndex = (
  options: Array<Pick<MenuOption, "id" | "name">>
): Map<string, string> =>
  new Map(options.map((option) => [option.id, option.name]))

/** Portions per dish, plus the ones whose dish could not be named. */
export type DishTally = {
  rows: Array<{ id: string; name: string; count: number }>
  /**
   * Portions whose option id resolved to no name, summed rather than dropped -
   * these are dinners somebody is expecting. Reachable when a dish was
   * hard-deleted, and wholesale when a wedding lost its venue: the catalogue
   * goes empty while `guests.menu_option_id` stays put.
   */
  unnamed: number
}

/**
 * Count how many times each option id occurs, resolved to a label and sorted
 * biggest-first, then alphabetically so equal counts do not reshuffle between
 * loads - the same rule `VenuePeekSummary` sorts dietary tags by.
 */
export const tallyByOption = (
  optionIds: Iterable<string | null | undefined>,
  // `undefined` as well as `null`, so a `dishNameIndex` map's `get` passes
  // straight in.
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
