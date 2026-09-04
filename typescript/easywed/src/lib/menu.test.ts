import { describe, expect, it } from "vitest"
import {
  MAX_DISH_NAME_LENGTH,
  byPosition,
  canonicalizeDishName,
  courseIsComplete,
  dishLabel,
  dishNameIndex,
  isLive,
  menuOptionTone,
  parseChooseCount,
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

describe("dishNameIndex", () => {
  it("indexes archived dishes too", () => {
    // The property the four call sites each used to state in a comment of their
    // own: a dish retired after a couple ordered it still has to be nameable.
    const index = dishNameIndex([
      { id: "beef", name: "Poledwica wolowa" },
      { id: "duck", name: "Kaczka pieczona" },
    ])

    expect(index.get("beef")).toBe("Poledwica wolowa")
    expect(index.get("duck")).toBe("Kaczka pieczona")
  })

  it("hands `tallyByOption` its `nameOf` directly", () => {
    // `get` returns undefined, not null, for an id the catalogue cannot name -
    // which is why that signature accepts both.
    const index = dishNameIndex([{ id: "beef", name: "Poledwica wolowa" }])

    expect(
      tallyByOption(["beef", "beef", "gone"], (id) => index.get(id))
    ).toEqual({
      rows: [{ id: "beef", name: "Poledwica wolowa", count: 2 }],
      unnamed: 1,
    })
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
    ).toEqual({
      rows: [
        { id: "beef", name: "Poledwica wolowa", count: 3 },
        { id: "duck", name: "Kaczka pieczona", count: 2 },
        { id: "fish", name: "Filet z halibuta", count: 1 },
      ],
      unnamed: 0,
    })
  })

  it("breaks equal counts alphabetically, so the list does not reshuffle", () => {
    const first = tallyByOption(["beef", "duck"], nameOf)
    const second = tallyByOption(["duck", "beef"], nameOf)
    expect(first).toEqual(second)
    expect(first.rows.map((row) => row.name)).toEqual([
      "Kaczka pieczona",
      "Poledwica wolowa",
    ])
  })

  it("ignores guests with no dish assigned", () => {
    expect(tallyByOption([null, undefined, "beef", null], nameOf)).toEqual({
      rows: [{ id: "beef", name: "Poledwica wolowa", count: 1 }],
      unnamed: 0,
    })
  })

  /**
   * A dish hard-deleted out from under an assignment resolves to no name. It
   * gets no row - a raw uuid on a kitchen document is worse than a shorter
   * list - but it is still counted, because the "X of Y guests have a dish"
   * line above it counts the same portions and the two have to add up.
   */
  it("counts ids that no longer resolve to a dish, without naming them", () => {
    expect(tallyByOption(["beef", "deleted-id", "deleted-id"], nameOf)).toEqual(
      {
        rows: [{ id: "beef", name: "Poledwica wolowa", count: 1 }],
        unnamed: 2,
      }
    )
  })

  // Every portion unnamed is the shape a wedding takes when it loses its venue:
  // the catalogue goes empty and `guests.menu_option_id` stays put.
  it("reports a tally with nothing nameable in it", () => {
    expect(tallyByOption(["gone", "gone"], () => null)).toEqual({
      rows: [],
      unnamed: 2,
    })
  })

  it("returns an empty tally for an empty guest list", () => {
    expect(tallyByOption([], nameOf)).toEqual({ rows: [], unnamed: 0 })
  })
})

describe("parseChooseCount", () => {
  it("takes a number the venue can actually have", () => {
    expect(parseChooseCount("5")).toBe(5)
    expect(parseChooseCount(" 5 ")).toBe(5)
  })

  // The bug this whole field was rewritten for: typing "60" used to write 6 on
  // the first keystroke and a clamped 50 on the second. Clamping is now one
  // decision made once, when the field is committed.
  it("clamps to the range the CHECK allows", () => {
    expect(parseChooseCount("60")).toBe(50)
    expect(parseChooseCount("0")).toBe(1)
    expect(parseChooseCount("-3")).toBe(1)
  })

  it("rounds a fractional entry", () => {
    expect(parseChooseCount("2.6")).toBe(3)
  })

  // Nothing to commit, so the caller leaves the stored number alone. Reverting
  // an emptied field is `NumberInput`'s stated contract, and this is what keeps
  // it true once the write moved to blur.
  it("returns null for a field with nothing in it", () => {
    expect(parseChooseCount("")).toBeNull()
    expect(parseChooseCount("   ")).toBeNull()
    expect(parseChooseCount("abc")).toBeNull()
  })
})
