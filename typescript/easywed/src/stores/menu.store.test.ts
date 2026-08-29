// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  pickableOptions,
  pickedCount,
  selectIncompleteCourseCount,
  useMenuStore,
} from "./menu.store"
import type { MenuCourse, MenuOption } from "@/lib/menu"
import type { Guest } from "@/stores/planner.store"
import { setWeddingMenuPackage } from "@/lib/sync/mutations"
import { usePlannerStore } from "@/stores/planner.store"

// The store's three writes, stubbed. `run()` is what normally decides the
// boolean; here the tests decide it, because the whole point of these cases is
// what the store does with a `false` it cannot otherwise provoke.
vi.mock("@/lib/sync/mutations", () => ({
  setWeddingMenuPackage: vi.fn(() => Promise.resolve(true)),
  insertMenuSelection: vi.fn(() => Promise.resolve(true)),
  deleteMenuSelection: vi.fn(() => Promise.resolve(true)),
}))

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

const guest = (id: string, menuOptionId: string | null): Guest => ({
  id,
  name: id,
  dietary: [],
  tableId: null,
  menuOptionId,
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

describe("choosePackage", () => {
  const ordered = () => {
    useMenuStore.setState({
      courses: [course()],
      options: [dish("beef"), dish("duck")],
      packageId: PACKAGE,
      selectedOptionIds: ["beef", "duck"],
    })
    usePlannerStore.setState({
      guests: [guest("anna", "beef"), guest("piotr", "duck")],
    })
  }

  beforeEach(() => {
    vi.mocked(setWeddingMenuPackage).mockResolvedValue(true)
    useMenuStore.getState().clear()
    usePlannerStore.setState({ guests: [] })
  })

  it("mirrors the triggers when the write lands", async () => {
    ordered()

    await useMenuStore.getState().choosePackage("pkg-2")

    expect(useMenuStore.getState().packageId).toBe("pkg-2")
    expect(useMenuStore.getState().selectedOptionIds).toEqual([])
    expect(
      usePlannerStore.getState().guests.map((g) => g.menuOptionId)
    ).toEqual([null, null])
  })

  // The case this rollback exists for: the store had emptied the menu and every
  // guest's dish while the database still held all three, and the only signal
  // was one generic "could not save" toast.
  it("puts the package, the served set and the dishes back when it fails", async () => {
    ordered()
    vi.mocked(setWeddingMenuPackage).mockResolvedValue(false)

    await useMenuStore.getState().choosePackage("pkg-2")

    expect(useMenuStore.getState().packageId).toBe(PACKAGE)
    expect(useMenuStore.getState().selectedOptionIds).toEqual(["beef", "duck"])
    expect(
      usePlannerStore.getState().guests.map((g) => g.menuOptionId)
    ).toEqual(["beef", "duck"])
  })

  // A failure must not undo a *later* choice. The couple picked again while the
  // first write was in flight; that second package is the one they are looking
  // at, and reviving the first one's snapshot would be a worse lie than the
  // bug - including the guests, who would each get a dish back that belongs to
  // a package nobody has ordered.
  it("leaves a package chosen while the write was in flight alone", async () => {
    ordered()
    vi.mocked(setWeddingMenuPackage).mockImplementation(() => {
      useMenuStore.setState({ packageId: "pkg-3", selectedOptionIds: [] })
      return Promise.resolve(false)
    })

    await useMenuStore.getState().choosePackage("pkg-2")

    expect(useMenuStore.getState().packageId).toBe("pkg-3")
    expect(
      usePlannerStore.getState().guests.map((g) => g.menuOptionId)
    ).toEqual([null, null])
  })

  // Restoring the guests array wholesale would revert every edit made during
  // the round trip - a guest added, renamed, seated, or handed a dish.
  it("restores dish by dish, keeping edits made during the write", async () => {
    ordered()
    vi.mocked(setWeddingMenuPackage).mockImplementation(() => {
      usePlannerStore.setState({
        guests: [...usePlannerStore.getState().guests, guest("zofia", "duck")],
      })
      return Promise.resolve(false)
    })

    await useMenuStore.getState().choosePackage("pkg-2")

    expect(
      usePlannerStore.getState().guests.map((g) => [g.id, g.menuOptionId])
    ).toEqual([
      ["anna", "beef"],
      ["piotr", "duck"],
      ["zofia", "duck"],
    ])
  })
})
