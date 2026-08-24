import { describe, expect, it } from "vitest"
import {
  MAX_DISH_NAME_LENGTH,
  byPosition,
  canonicalizeDishName,
  courseIsComplete,
  dishLabel,
  isLive,
  menuOptionTone,
  tallyByOption,
} from "./menu"

describe("dishLabel", () => {
  it("returns the venue's text verbatim", () => {
    // Including the characters that would make an i18next key misresolve - the
    // reason there is no `t()` overload here.
    expect(dishLabel({ name: "Deska serow: 3 rodzaje" })).toBe(
      "Deska serow: 3 rodzaje"
    )
    expect(dishLabel({ name: "Pstrag pieczony w masle. Z ziolami" })).toBe(
      "Pstrag pieczony w masle. Z ziolami"
    )
  })
})

describe("menuOptionTone", () => {
  it("gives the same dish the same colour everywhere", () => {
    // The point of keying on the name: "Rosol" is a separate row in every
    // package that offers it, and the kitchen report is read across packages.
    expect(menuOptionTone("Rosol z domowym makaronem")).toBe(
      menuOptionTone("Rosol z domowym makaronem")
    )
  })

  it("gives different dishes different colours, usually", () => {
    // Collisions are acceptable - the label is the identity, the colour only
    // speeds up scanning - so this asserts the hash spreads, not that it is
    // injective.
    const tones = new Set(
      ["Rosol", "Zurek", "Barszcz", "Krem z borowikow", "Gulaszowa"].map(
        menuOptionTone
      )
    )
    expect(tones.size).toBeGreaterThan(1)
  })
})

describe("canonicalizeDishName", () => {
  it("trims and collapses whitespace", () => {
    expect(canonicalizeDishName("  Kotlet   schabowy  ")).toBe(
      "Kotlet schabowy"
    )
  })

  it("returns null for a blank", () => {
    expect(canonicalizeDishName("")).toBeNull()
    expect(canonicalizeDishName("   ")).toBeNull()
  })

  it("caps at the column's length", () => {
    const long = "a".repeat(MAX_DISH_NAME_LENGTH + 40)
    expect(canonicalizeDishName(long)!.length).toBe(MAX_DISH_NAME_LENGTH)
  })

  it("leaves a real 96-character dish name intact", () => {
    // The name the 120-character bound was chosen for.
    const real =
      "Placki z makaronu ryzowego z dodatkiem zoltego sera i pesto na rukoli z sosem balsamicznym"
    expect(canonicalizeDishName(real)).toBe(real)
  })
})

describe("isLive", () => {
  it("separates archived rows from live ones", () => {
    expect(isLive({ archived_at: null })).toBe(true)
    expect(isLive({ archived_at: "2026-06-01T00:00:00Z" })).toBe(false)
  })
})

describe("byPosition", () => {
  const sorted = (rows: Array<Parameters<typeof byPosition>[0]>) =>
    [...rows].sort(byPosition).map((row) => row.id)

  it("orders by position", () => {
    expect(
      sorted([
        { id: "c", position: 3 },
        { id: "a", position: 1 },
        { id: "b", position: 2 },
      ])
    ).toEqual(["a", "b", "c"])
  })

  /**
   * `position` has no unique constraint - deliberately, since a duplicate costs
   * only an arbitrary order. The tiebreakers are what make that order the
   * *same* arbitrary order on every load and every device.
   */
  it("breaks ties stably, by created_at then id", () => {
    const rows = [
      { id: "z", position: 1, created_at: "2026-01-02" },
      { id: "a", position: 1, created_at: "2026-01-01" },
      { id: "b", position: 1, created_at: "2026-01-02" },
    ]
    expect(sorted(rows)).toEqual(["a", "b", "z"])
    expect(sorted([...rows].reverse())).toEqual(["a", "b", "z"])
  })
})

describe("courseIsComplete", () => {
  it("is false while the couple is still picking", () => {
    expect(courseIsComplete({ choose_count: 5 }, 0)).toBe(false)
    expect(courseIsComplete({ choose_count: 5 }, 4)).toBe(false)
  })

  it("is true at the count the venue asked for", () => {
    expect(courseIsComplete({ choose_count: 5 }, 5)).toBe(true)
  })

  /**
   * `>=`, not `===`: `choose_count` is a floor the venue sets and no trigger
   * enforces, so a couple who talked the venue into a seventh main is complete
   * rather than permanently badged as incomplete.
   */
  it("stays true past the count", () => {
    expect(courseIsComplete({ choose_count: 5 }, 7)).toBe(true)
  })
})

describe("tallyByOption", () => {
  const names: Record<string, string> = {
    beef: "Poledwica wolowa",
    duck: "Kaczka pieczona",
    fish: "Filet z halibuta",
  }
  const nameOf = (id: string) => names[id] ?? null

  it("counts assignments and sorts by count, biggest first", () => {
    expect(
      tallyByOption(["beef", "duck", "beef", "fish", "beef", "duck"], nameOf)
    ).toEqual([
      { id: "beef", name: "Poledwica wolowa", count: 3 },
      { id: "duck", name: "Kaczka pieczona", count: 2 },
      { id: "fish", name: "Filet z halibuta", count: 1 },
    ])
  })

  it("breaks equal counts alphabetically, so the list does not reshuffle", () => {
    const first = tallyByOption(["beef", "duck"], nameOf)
    const second = tallyByOption(["duck", "beef"], nameOf)
    expect(first).toEqual(second)
    expect(first.map((row) => row.name)).toEqual([
      "Kaczka pieczona",
      "Poledwica wolowa",
    ])
  })

  it("ignores guests with no dish assigned", () => {
    expect(tallyByOption([null, undefined, "beef", null], nameOf)).toEqual([
      { id: "beef", name: "Poledwica wolowa", count: 1 },
    ])
  })

  /**
   * A dish hard-deleted out from under an assignment resolves to no name. It is
   * dropped rather than printed as a uuid - a raw id on a kitchen document is
   * worse than a shorter list, and `archived_at` exists so this stays rare.
   */
  it("drops ids that no longer resolve to a dish", () => {
    expect(tallyByOption(["beef", "deleted-id"], nameOf)).toEqual([
      { id: "beef", name: "Poledwica wolowa", count: 1 },
    ])
  })

  it("returns an empty list for an empty guest list", () => {
    expect(tallyByOption([], nameOf)).toEqual([])
  })
})
