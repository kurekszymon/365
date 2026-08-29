// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"
import {
  pickableOptions,
  pickedCount,
  selectIncompleteCourseCount,
  useMenuStore,
} from "./menu.store"
import type { MenuCourse, MenuOption } from "@/lib/menu"

const PACKAGE = "pkg-1"
const COURSE = "course-1"

const course = (patch: Partial<MenuCourse> = {}): MenuCourse => ({
  id: COURSE,
  menu_package_id: PACKAGE,
  name: "Danie główne",
  choose_count: 2,
  serving_note: null,
  per_guest_choice: false,
  position: 1,
  archived_at: null,
  ...patch,
})

const dish = (id: string, archived = false): MenuOption => ({
  id,
  menu_course_id: COURSE,
  name: id,
  note: null,
  position: 1,
  archived_at: archived ? "2026-08-01T00:00:00Z" : null,
})

/** What `MenuCourseSection` counts: the picked rows it was actually handed. */
const renderedPickedCount = (courseId: string): number => {
  const state = useMenuStore.getState()
  const selected = new Set(state.selectedOptionIds)
  return pickableOptions(state, courseId).filter((option) =>
    selected.has(option.id)
  ).length
}

describe("pickableOptions", () => {
  beforeEach(() => {
    useMenuStore.getState().clear()
  })

  it("offers the live dishes of the course", () => {
    useMenuStore.setState({
      courses: [course()],
      options: [dish("beef"), dish("duck")],
      packageId: PACKAGE,
    })

    expect(pickableOptions(useMenuStore.getState(), COURSE)).toHaveLength(2)
  })

  // The case this selector exists for. A live-only filter took the row off the
  // screen while it was still in the served set, so the couple went on serving
  // a dish they had no way left to unpick.
  it("keeps an archived dish this wedding already selected", () => {
    useMenuStore.setState({
      courses: [course()],
      options: [dish("beef"), dish("duck", true)],
      packageId: PACKAGE,
      selectedOptionIds: ["beef", "duck"],
    })

    expect(
      pickableOptions(useMenuStore.getState(), COURSE).map((o) => o.id)
    ).toEqual(["beef", "duck"])
  })

  // Archiving is how a venue takes a dish out of the offer, so an archived one
  // nobody ordered must not be pickable again - the database refuses that
  // selection outright (menu_option_in_package with _require_active => true).
  it("drops an archived dish nobody selected", () => {
    useMenuStore.setState({
      courses: [course()],
      options: [dish("beef"), dish("duck", true)],
      packageId: PACKAGE,
      selectedOptionIds: ["beef"],
    })

    expect(
      pickableOptions(useMenuStore.getState(), COURSE).map((o) => o.id)
    ).toEqual(["beef"])
  })

  it("ignores dishes of another course", () => {
    useMenuStore.setState({
      courses: [course()],
      options: [dish("beef"), { ...dish("cake"), menu_course_id: "course-2" }],
      packageId: PACKAGE,
    })

    expect(
      pickableOptions(useMenuStore.getState(), COURSE).map((o) => o.id)
    ).toEqual(["beef"])
  })
})

describe("pickedCount", () => {
  beforeEach(() => {
    useMenuStore.getState().clear()
  })

  // The invariant behind the badge: the sidebar counts selections off the
  // store, the course section counts the rows it renders, and the two are the
  // same number. They diverged when an archived-but-selected dish was rendered
  // by neither - the badge read "nothing left to do" over a section reading
  // "1 of 2".
  it("matches what the course section renders, archived dish included", () => {
    useMenuStore.setState({
      courses: [course({ choose_count: 2 })],
      options: [dish("beef"), dish("duck", true)],
      packageId: PACKAGE,
      selectedOptionIds: ["beef", "duck"],
    })

    expect(pickedCount(useMenuStore.getState(), COURSE)).toBe(2)
    expect(renderedPickedCount(COURSE)).toBe(2)
    expect(selectIncompleteCourseCount(useMenuStore.getState())).toBe(0)
  })

  it("still reports a course short of its count", () => {
    useMenuStore.setState({
      courses: [course({ choose_count: 2 })],
      options: [dish("beef"), dish("duck")],
      packageId: PACKAGE,
      selectedOptionIds: ["beef"],
    })

    expect(pickedCount(useMenuStore.getState(), COURSE)).toBe(1)
    expect(renderedPickedCount(COURSE)).toBe(1)
    expect(selectIncompleteCourseCount(useMenuStore.getState())).toBe(1)
  })
})
