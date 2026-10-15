import { describe, expect, it } from "vitest"
import {
  compareSemver,
  devlogHeading,
  newestTag,
  orderingProblems,
  padVersion,
  parseReleases,
  parseSemver,
  previousTag,
  utcIsoDate,
} from "./release.mjs"

describe("versions", () => {
  it("parses only plain X.Y.Z", () => {
    expect(parseSemver("1.4.0")).toEqual([1, 4, 0])
    expect(parseSemver("1.4")).toBeNull()
    expect(parseSemver("1.4.0-rc.1")).toBeNull()
  })

  it("pads the release table's short versions", () => {
    expect(padVersion("1.0")).toBe("1.0.0")
    expect(padVersion("1.4")).toBe("1.4.0")
    expect(padVersion("1.3.1")).toBe("1.3.1")
    expect(padVersion("1")).toBe("1.0.0")
    expect(padVersion("1.x")).toBeNull()
  })

  it("compares numerically, not as strings", () => {
    expect(compareSemver("1.10.0", "1.9.0")).toBeGreaterThan(0)
    expect(compareSemver("1.3.1", "1.3.1")).toBe(0)
    expect(compareSemver("1.3.0", "1.3.1")).toBeLessThan(0)
  })
})

describe("parseReleases", () => {
  const source = `
export const RELEASES: Array<Release> = [
  { id: "v1.4", version: "1.4", date: "2026-10-15", items: 3 },
  { id: "v1.3.1", version: "1.3.1", date: "2026-10-10", items: 1 },
]

export function changelogI18nKeys() {}
`

  it("reads entries newest first", () => {
    expect(parseReleases(source)).toEqual([
      { id: "v1.4", version: "1.4", date: "2026-10-15", items: 3 },
      { id: "v1.3.1", version: "1.3.1", date: "2026-10-10", items: 1 },
    ])
  })

  it("returns null when the table is gone", () => {
    expect(parseReleases("export const OTHER = []")).toBeNull()
  })
})

describe("orderingProblems", () => {
  const entry = (id, version, date) => ({ id, version, date, items: 1 })

  it("accepts a newest-first table", () => {
    expect(
      orderingProblems([
        entry("v1.4", "1.4", "2026-10-15"),
        entry("v1.3.1", "1.3.1", "2026-10-10"),
        entry("v1.3", "1.3", "2026-10-10"),
      ])
    ).toEqual([])
  })

  it("flags a release added below an older one", () => {
    expect(
      orderingProblems([
        entry("v1.3", "1.3", "2026-10-09"),
        entry("v1.4", "1.4", "2026-10-15"),
      ])
    ).toHaveLength(2)
  })
})

describe("tags", () => {
  const prefix = "easywed/v"
  const tags = ["v1", "v1.1", "v1.3.0", "v1.3.1", "v1.3.2"].map(
    (t) => `easywed/${t}`
  )

  it("measures a new release against the newest tag", () => {
    expect(previousTag(tags, prefix, "1.4.0")).toBe("easywed/v1.3.2")
  })

  it("measures a rollback against the tag below it, not a newer one", () => {
    expect(previousTag(tags, prefix, "1.3.1")).toBe("easywed/v1.3.0")
  })

  it("pads short tags and has nothing below the first", () => {
    expect(previousTag(tags, prefix, "1.1.0")).toBe("easywed/v1")
    expect(previousTag(tags, prefix, "1.0.0")).toBeUndefined()
  })

  it("finds the newest tag by version, not by name", () => {
    expect(newestTag(["easywed/v1.10.0", "easywed/v1.9.0"], prefix)).toBe(
      "easywed/v1.10.0"
    )
  })
})

describe("dates", () => {
  it("formats the UTC calendar day, which hasUnseenRelease reads", () => {
    // 00:30 in Warsaw on the 16th is still the 15th in UTC.
    expect(utcIsoDate(new Date("2026-10-16T00:30:00+02:00"))).toBe("2026-10-15")
  })

  it("matches the DEVLOG heading format", () => {
    expect(devlogHeading("2026-10-04")).toBe("### 04.10")
  })
})
