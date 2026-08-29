import { create } from "zustand"

import type { MenuCourse, MenuOption, MenuPackage } from "@/lib/menu"
import { courseIsComplete, isLive } from "@/lib/menu"
import {
  deleteMenuSelection,
  insertMenuSelection,
  setWeddingMenuPackage,
} from "@/lib/sync/mutations"
import { track } from "@/lib/analytics/track"
import { usePlannerStore } from "@/stores/planner.store"

/**
 * The venue's catalogue, and what this wedding has ordered from it.
 *
 * Plain `create`, deliberately **not** `persist`, unlike the planner, reminders
 * and global stores. Those three persist because guest mode has to survive a
 * reload with no server behind it; this one cannot be in that situation at all
 * - a guest-mode wedding has no venue, so it has no menu - and a stale
 * catalogue in localStorage would be strictly worse than none: it would render
 * dishes the venue has since renamed or retired, and a couple picking from it
 * would be refused by `enforce_menu_selection_in_package` with nothing on
 * screen explaining why.
 *
 * `status` is about the *catalogue*, not the order. The order (`packageId`,
 * `selectedOptionIds`) rides the wedding's own load and is present at first
 * paint; the catalogue needs `weddings.tenant_id` before it can even be asked
 * for, so it is a second round trip - see loadWedding.ts.
 */
export type MenuStatus = "idle" | "loading" | "ready" | "failed"

type State = {
  packages: Array<MenuPackage>
  courses: Array<MenuCourse>
  options: Array<MenuOption>
  /** The package this wedding ordered. Mirrors `weddings.menu_package_id`. */
  packageId: string | null
  /** The served set. Mirrors the `wedding_menu_selections` rows. */
  selectedOptionIds: Array<string>
  /**
   * `tenants.currency`, read alongside the catalogue rather than taken from the
   * resolved venue. `tenant_public()` deliberately does not project it - that
   * RPC is the anonymous branding lookup and prices are not anonymous data - so
   * the couple reads it off `tenants` through "wedding members can view their
   * linked venue". Defaults to the column's default so a price never renders
   * bare while the read is in flight.
   */
  currency: string
  status: MenuStatus
}

type Action = {
  setCatalogue: (catalogue: {
    packages: Array<MenuPackage>
    courses: Array<MenuCourse>
    options: Array<MenuOption>
    currency: string
  }) => void
  setStatus: (status: MenuStatus) => void
  /** The order, as `loadWedding` read it off the wedding row. */
  setOrder: (packageId: string | null, selectedOptionIds: Array<string>) => void
  choosePackage: (packageId: string) => void
  toggleOption: (optionId: string) => void
  clear: () => void
}

const initial: State = {
  packages: [],
  courses: [],
  options: [],
  packageId: null,
  selectedOptionIds: [],
  currency: "PLN",
  status: "idle",
}

/**
 * Mirrors the two triggers that clear `guests.menu_option_id`.
 *
 * Local only - it writes no mutation, because the database has already done
 * this by the time the write it accompanies returns. It exists so the guest
 * list, the dish filter chips, the printed report and the CSV export stop
 * naming a dish the couple just took away, instead of waiting for a reload.
 *
 * Reaches into `planner.store` rather than the reverse: the menu is what
 * changed, the guests are what it changed. `planner.store` does not import this
 * module, so there is no cycle to create.
 */
const clearGuestDishes = (optionId?: string) => {
  const { guests } = usePlannerStore.getState()
  if (!guests.some((g) => g.menuOptionId)) return

  usePlannerStore.setState({
    guests: guests.map((guest) =>
      guest.menuOptionId &&
      (optionId === undefined || guest.menuOptionId === optionId)
        ? { ...guest, menuOptionId: null }
        : guest
    ),
  })
}

export const useMenuStore = create<State & Action>((set, get) => ({
  ...initial,

  setCatalogue: ({ packages, courses, options, currency }) =>
    set({ packages, courses, options, currency, status: "ready" }),

  setStatus: (status) => set({ status }),

  setOrder: (packageId, selectedOptionIds) =>
    set({ packageId, selectedOptionIds }),

  /**
   * Switch package.
   *
   * Clears the served set locally as well, because the database does: the
   * `weddings_menu_package_changed` trigger deletes every selection for the
   * wedding. Not mirroring it here would leave the picker showing dishes that
   * no longer exist server-side until the next load.
   *
   * The same trigger also nulls every `guests.menu_option_id`, so the guests in
   * `planner.store` are cleared too. That half is easy to forget and shows up
   * everywhere at once - the guest list badge, the dish filter chips, the
   * printed report and the CSV export would all keep naming a dish the database
   * has already taken away, and only a reload would correct them.
   *
   * The confirm belongs to the caller, not here - this is a data-losing action
   * and the UI names what it will clear before calling.
   */
  choosePackage: (packageId) => {
    const state = get()
    if (state.packageId === packageId) return

    set({ packageId, selectedOptionIds: [] })
    clearGuestDishes()

    const courses = state.courses.filter(
      (course) => course.menu_package_id === packageId && isLive(course)
    )
    track("menu_package_selected", {
      course_count: courses.length,
      per_guest_courses: courses.filter((c) => c.per_guest_choice).length,
    })

    void setWeddingMenuPackage(packageId)
  },

  /**
   * Pick or unpick one dish.
   *
   * `choose_count` is not enforced here beyond what the UI renders, and it is
   * not enforced in the database either - see 20260822000002 for why. Picking a
   * seventh main when the venue asked for six is allowed and shows as such.
   */
  toggleOption: (optionId) => {
    const state = get()
    const picked = state.selectedOptionIds.includes(optionId)

    const next = picked
      ? state.selectedOptionIds.filter((id) => id !== optionId)
      : [...state.selectedOptionIds, optionId]

    set({ selectedOptionIds: next })

    if (picked) {
      // Unpicking releases every guest who was assigned this dish, because the
      // `menu_selections_deleted_clear_guests` trigger does exactly that
      // server-side. Repair rather than refusal is the database's choice (see
      // 20260822000003), and the client has to show the repair or it goes on
      // naming a dish nobody is serving.
      clearGuestDishes(optionId)
      void deleteMenuSelection(optionId)
      return
    }

    void insertMenuSelection(optionId)

    // Fired on the transition into "every course has what it needs", not on
    // every pick, so it counts weddings that finished choosing rather than
    // clicks. Counts only - a dish name is text the venue typed.
    const before = incompleteCourses(state).length
    const after = incompleteCourses({
      ...state,
      selectedOptionIds: next,
    }).length
    if (before > 0 && after === 0) {
      const courses = liveCourses({ ...state, selectedOptionIds: next })
      track("menu_selection_completed", {
        courses: courses.length,
        options_picked: next.length,
      })
    }
  },

  clear: () => set({ ...initial }),
}))

/** Live courses of the ordered package, in the order the venue arranged them. */
export const liveCourses = (state: State): Array<MenuCourse> =>
  state.packageId === null
    ? []
    : state.courses.filter(
        (course) => course.menu_package_id === state.packageId && isLive(course)
      )

/**
 * The dishes of one course the picker renders: still on offer, **or** already
 * ordered by this wedding.
 *
 * The second half is not a nicety. Archiving is what a venue does instead of
 * deleting a dish somebody is eating, so a live-only filter here takes an
 * archived dish the couple *selected* off the screen while it is still in the
 * served set - which means it cannot be unpicked, and the couple is left
 * serving something they can no longer see.
 *
 * The database draws the same line, from the other side:
 * `menu_option_in_package(_require_active => true)` refuses a **new** selection
 * of an archived dish - the picker never offered it, so a request naming it did
 * not come from this UI - while `enforce_guest_menu_option` passes the default
 * `false`, so a dish already selected stays assignable to guests. See
 * 20260822000002 on why those are two different questions.
 *
 * An archived dish therefore only ever appears here while it is selected, and
 * unpicking it is the last thing that can happen to it: the row leaves the list
 * on the same click, which is the intended one-way door.
 */
export const pickableOptions = (
  state: State,
  courseId: string
): Array<MenuOption> => {
  const selected = new Set(state.selectedOptionIds)
  return state.options.filter(
    (option) =>
      option.menu_course_id === courseId &&
      (isLive(option) || selected.has(option.id))
  )
}

/**
 * How many dishes are picked for one course.
 *
 * Counts every selected option of the course, archived included - which is the
 * same set as the selected members of `pickableOptions`, because selection is
 * exactly what admits an archived row there. That equality is what keeps the
 * sidebar badge (this) and the course section's own count (the rendered list)
 * from disagreeing after a venue archives a dish the couple had picked, where
 * the badge used to read "nothing left to do" over a section reading "4 of 5".
 */
export const pickedCount = (state: State, courseId: string): number => {
  const selected = new Set(state.selectedOptionIds)
  return state.options.filter(
    (option) => option.menu_course_id === courseId && selected.has(option.id)
  ).length
}

const incompleteCourses = (state: State): Array<MenuCourse> =>
  liveCourses(state).filter(
    (course) => !courseIsComplete(course, pickedCount(state, course.id))
  )

/**
 * The tab badge: courses still short of the count the venue asked for.
 *
 * The actionable number, matching how the guests tab badges the *unseated*
 * rather than the total. Zero once the menu is settled, so the badge goes away
 * instead of sitting there as a permanent decoration.
 */
export const selectIncompleteCourseCount = (state: State): number =>
  incompleteCourses(state).length

/** The ordered package itself, or null. */
export const selectOrderedPackage = (state: State): MenuPackage | null =>
  state.packages.find((pkg) => pkg.id === state.packageId) ?? null
