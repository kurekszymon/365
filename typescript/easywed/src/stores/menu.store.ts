import { create } from "zustand"

import type { MenuCourse, MenuOption, MenuPackage } from "@/lib/menu"
import { courseIsComplete, coursesOf, isLive, optionsOf } from "@/lib/menu"
import { DEFAULT_CURRENCY } from "@/lib/money"
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
 * Plain `create`, deliberately **not** `persist`. Guest mode has no venue and so
 * no menu, and a stale catalogue in localStorage would render dishes the venue
 * has since renamed or retired - picking one would be refused by
 * `enforce_menu_selection_in_package` with nothing on screen explaining why.
 *
 * `status` is about the *catalogue*, not the order. The order (`packageId`,
 * `selectedOptionIds`) rides the wedding's own load; the catalogue needs
 * `weddings.tenant_id` first, so it is a second round trip - see loadWedding.ts.
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
   * `tenants.currency`, read alongside the catalogue rather than off the
   * resolved venue: `tenant_public()` is the anonymous branding lookup and
   * prices are not anonymous data, so the couple reads it off `tenants` through
   * "wedding members can view their linked venue". Defaults to the column's
   * default so a price never renders bare while the read is in flight.
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
  /** Order a package, or `null` to order none. */
  choosePackage: (packageId: string | null) => Promise<void>
  toggleOption: (optionId: string) => Promise<void>
  clear: () => void
  clearForVenueChange: () => void
}

const initial: State = {
  packages: [],
  courses: [],
  options: [],
  packageId: null,
  selectedOptionIds: [],
  currency: DEFAULT_CURRENCY,
  status: "idle",
}

/** A guest's dish, as it was before the store cleared it. */
type ClearedDish = { guestId: string; menuOptionId: string }

/**
 * Mirrors the two triggers that clear `guests.menu_option_id`. Local only - the
 * database has already done this by the time the accompanying write returns -
 * so the guest list, filter chips, printed report and CSV export stop naming a
 * dish the couple just took away without waiting for a reload.
 *
 * Returns what it took, so a caller whose write is *refused* can put it back.
 */
const clearGuestDishes = (optionId?: string): Array<ClearedDish> => {
  const { guests } = usePlannerStore.getState()

  const cleared = guests.flatMap((guest) =>
    guest.menuOptionId &&
    (optionId === undefined || guest.menuOptionId === optionId)
      ? [{ guestId: guest.id, menuOptionId: guest.menuOptionId }]
      : []
  )
  if (cleared.length === 0) return cleared

  const ids = new Set(cleared.map((entry) => entry.guestId))
  usePlannerStore.setState({
    guests: guests.map((guest) =>
      ids.has(guest.id) ? { ...guest, menuOptionId: null } : guest
    ),
  })

  return cleared
}

/**
 * Undo a `clearGuestDishes`, guest by guest rather than by swapping in a
 * snapshot: the round trip is long enough to have added, renamed or seated a
 * guest. Each guest is touched only if they are *still* dishless, so a dish
 * assigned in the meantime outranks the one being restored.
 */
const restoreGuestDishes = (cleared: Array<ClearedDish>) => {
  if (cleared.length === 0) return

  const byId = new Map(
    cleared.map((entry) => [entry.guestId, entry.menuOptionId])
  )
  usePlannerStore.setState({
    guests: usePlannerStore.getState().guests.map((guest) => {
      const previous = byId.get(guest.id)
      return previous && guest.menuOptionId === null
        ? { ...guest, menuOptionId: previous }
        : guest
    }),
  })
}

/**
 * One write chain per dish, so a pick and an unpick of the same dish cannot land
 * out of order. Unsequenced, the DELETE could reach Postgres before the INSERT
 * it was undoing, delete nothing, and leave the row behind - both statements
 * succeeding, with nothing raised anywhere. (`ignoreDuplicates` covers a
 * different race: a *second* pick.)
 *
 * Keyed per option rather than one global chain, since two dishes have no
 * ordering relationship and serializing them would make a burst of picks as slow
 * as the sum of its round trips.
 *
 * The map holds a *neutralized* promise, settled either way, so one refused
 * write cannot reject the chain and strand every later toggle of that dish. The
 * entry deletes itself once it is the tail.
 */
const optionWrites = new Map<string, Promise<void>>()

const queueOptionWrite = (
  optionId: string,
  write: () => Promise<boolean>
): Promise<boolean> => {
  const previous = optionWrites.get(optionId) ?? Promise.resolve()
  const result = previous.then(write, write)
  const settled = result.then(
    () => {},
    () => {}
  )

  optionWrites.set(optionId, settled)
  void settled.then(() => {
    if (optionWrites.get(optionId) === settled) optionWrites.delete(optionId)
  })

  return result
}

export const useMenuStore = create<State & Action>((set, get) => ({
  ...initial,

  setCatalogue: ({ packages, courses, options, currency }) =>
    set({ packages, courses, options, currency, status: "ready" }),

  setStatus: (status) => set({ status }),

  setOrder: (packageId, selectedOptionIds) =>
    set({ packageId, selectedOptionIds }),

  /**
   * Switch package, or clear it with `null` - the same operation, not a special
   * case: the database treats every `menu_package_id is distinct from` as a
   * change and wipes the selections and the guests' dishes either way
   * (20260822000002's `when` clause catches exactly the null it is cleared to).
   *
   * So this mirrors all three locally: the package, the served set that
   * `weddings_menu_package_changed` deletes, and the `guests.menu_option_id`
   * that same trigger nulls. Miss the last and the guest list badge, filter
   * chips, printed report and CSV export all keep naming a dish the database has
   * already taken away. The confirm belongs to the caller.
   *
   * This one awaits, where every other store action fires and forgets, because
   * it clears three things on the strength of a trigger that runs only if the
   * write lands - and a refused write left the couple on an emptied menu while
   * the database still held all three, with every later pick failing against the
   * package it still had. So it rolls back all three, under one guard: a package
   * chosen while this was in flight owns the state, and reviving this one would
   * hand every guest a dish from a package nobody ordered.
   */
  choosePackage: async (packageId) => {
    const state = get()
    if (state.packageId === packageId) return

    const previous = {
      packageId: state.packageId,
      selectedOptionIds: state.selectedOptionIds,
    }

    set({ packageId, selectedOptionIds: [] })
    const cleared = clearGuestDishes()

    const ok = await setWeddingMenuPackage(packageId)

    if (!ok) {
      if (get().packageId === packageId) {
        set(previous)
        restoreGuestDishes(cleared)
      }
      return
    }

    // After the write, so it counts packages actually ordered rather than clicks
    // the database refused - the same rule `menu_selection_completed` follows.
    //
    // A clear fires nothing: the payload is the shape of the package chosen, and
    // a zero-course row would sit in the same series as real orders and drag
    // `course_count` down.
    if (packageId === null) return

    const courses = coursesOf(state.courses, packageId).filter(isLive)
    track("menu_package_selected", {
      course_count: courses.length,
      per_guest_courses: courses.filter((c) => c.per_guest_choice).length,
    })
  },

  /**
   * Pick or unpick one dish. `choose_count` is not enforced here or in the
   * database (see 20260822000002), so a seventh main is allowed and shows as
   * such.
   *
   * Both writes go through `queueOptionWrite`, keeping a pick and the unpick
   * after it in click order, and both roll back on refusal - the unpick carrying
   * the heavier half, since it releases every guest holding the dish. Each
   * rollback is guarded on the dish still being where this call left it: a later
   * toggle owns the state by the time this failure is known.
   */
  toggleOption: async (optionId) => {
    const state = get()
    const picked = state.selectedOptionIds.includes(optionId)

    const next = picked
      ? state.selectedOptionIds.filter((id) => id !== optionId)
      : [...state.selectedOptionIds, optionId]

    set({ selectedOptionIds: next })

    if (picked) {
      // Unpicking releases every guest assigned this dish, mirroring the
      // `menu_selections_deleted_clear_guests` trigger. Repair rather than
      // refusal is the database's choice (20260822000003), and the client has to
      // show the repair or it goes on naming a dish nobody is serving.
      const cleared = clearGuestDishes(optionId)

      const ok = await queueOptionWrite(optionId, () =>
        deleteMenuSelection(optionId)
      )
      if (!ok && !get().selectedOptionIds.includes(optionId)) {
        // Appended rather than restored from a snapshot, so dishes toggled while
        // this was in flight keep their state. Nothing renders in selection
        // order, so the position is free.
        set({ selectedOptionIds: [...get().selectedOptionIds, optionId] })
        restoreGuestDishes(cleared)
      }
      return
    }

    // Computed off the state this call produced and only *fired* once the write
    // lands; reading it after the await would attribute the transition to
    // whatever the store looked like when a round trip returned.
    //
    // Fires on the transition into "every course has what it needs", so it
    // counts weddings that finished choosing rather than clicks. Counts only -
    // a dish name is text the venue typed.
    const before = incompleteCourses(state).length
    const after = incompleteCourses({
      ...state,
      selectedOptionIds: next,
    }).length

    const ok = await queueOptionWrite(optionId, () =>
      insertMenuSelection(optionId)
    )
    if (!ok) {
      if (get().selectedOptionIds.includes(optionId)) {
        set({
          selectedOptionIds: get().selectedOptionIds.filter(
            (id) => id !== optionId
          ),
        })
      }
      return
    }

    if (before > 0 && after === 0) {
      const courses = liveCourses({ ...state, selectedOptionIds: next })
      track("menu_selection_completed", {
        courses: courses.length,
        options_picked: next.length,
      })
    }
  },

  clear: () => set({ ...initial }),

  /**
   * The wedding has been pointed at a *different* venue: `clear()` plus the
   * guests. A second action because `clear()` runs on every wedding load, where
   * blanking guest dishes would destroy the wedding being opened.
   *
   * Writes nothing, like `clearGuestDishes` - the database has already done all
   * three (`link_wedding_to_venue` nulls `menu_package_id`, and its two triggers
   * take the selections and `guests.menu_option_id` with it).
   */
  clearForVenueChange: () => {
    clearGuestDishes()
    set({ ...initial })
  },
}))

/** Live courses of the ordered package, in the order the venue arranged them. */
export const liveCourses = (state: State): Array<MenuCourse> =>
  state.packageId === null
    ? []
    : coursesOf(state.courses, state.packageId).filter(isLive)

/**
 * The dishes of one course the picker renders: still on offer, **or** already
 * ordered by this wedding. The second half matters - a live-only filter takes an
 * archived dish the couple selected off screen while it is still in the served
 * set, so it cannot be unpicked and they serve something they cannot see.
 *
 * The database draws the same line from the other side:
 * `menu_option_in_package(_require_active => true)` refuses a **new** selection
 * of an archived dish, while `enforce_guest_menu_option` passes the default
 * `false` so an already-selected one stays assignable. An archived dish
 * therefore appears here only while selected, and unpicking is a one-way door.
 */
export const pickableOptions = (
  state: State,
  courseId: string
): Array<MenuOption> => {
  const selected = new Set(state.selectedOptionIds)
  return optionsOf(state.options, courseId).filter(
    (option) => isLive(option) || selected.has(option.id)
  )
}

/**
 * How many dishes are picked for one course, archived included - the same set as
 * the selected members of `pickableOptions`, since selection is what admits an
 * archived row there. That equality keeps the sidebar badge and the course
 * section's own count from disagreeing after a venue archives a picked dish.
 */
export const pickedCount = (state: State, courseId: string): number => {
  const selected = new Set(state.selectedOptionIds)
  return optionsOf(state.options, courseId).filter((option) =>
    selected.has(option.id)
  ).length
}

const incompleteCourses = (state: State): Array<MenuCourse> =>
  liveCourses(state).filter(
    (course) => !courseIsComplete(course, pickedCount(state, course.id))
  )

/**
 * The tab badge: courses still short of the count the venue asked for - the
 * actionable number, matching how the guests tab badges the unseated rather than
 * the total, so the badge goes away once the menu is settled.
 */
export const selectIncompleteCourseCount = (state: State): number =>
  incompleteCourses(state).length

/** The ordered package itself, or null. */
export const selectOrderedPackage = (state: State): MenuPackage | null =>
  state.packages.find((pkg) => pkg.id === state.packageId) ?? null
