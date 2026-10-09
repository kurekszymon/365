import { describe, expect, it } from "vitest"
import { hasUnseenRelease } from "./unseenRelease"
import type { Release } from "./releases"

const release: Release = {
  id: "v1.3",
  version: "1.3",
  date: "2026-10-10",
  items: 1,
}

describe("hasUnseenRelease", () => {
  it("flags a release dated after the last sign-in", () => {
    expect(
      hasUnseenRelease(release, {
        lastSignInAt: "2026-10-06T09:00:00Z",
        seenReleaseId: undefined,
      })
    ).toBe(true)
  })

  it("does not flag a release that was live before the sign-in", () => {
    expect(
      hasUnseenRelease(release, {
        lastSignInAt: "2026-10-11T09:00:00Z",
        seenReleaseId: undefined,
      })
    ).toBe(false)
  })

  it("treats a same-day sign-in as having seen the release", () => {
    expect(
      hasUnseenRelease(release, {
        lastSignInAt: "2026-10-10T00:30:00Z",
        seenReleaseId: undefined,
      })
    ).toBe(false)
  })

  it("lets the seen marker override the sign-in baseline", () => {
    expect(
      hasUnseenRelease(release, {
        lastSignInAt: "2026-10-06T09:00:00Z",
        seenReleaseId: "v1.3",
      })
    ).toBe(false)
    expect(
      hasUnseenRelease(release, {
        lastSignInAt: "2026-10-11T09:00:00Z",
        seenReleaseId: "v1.2",
      })
    ).toBe(true)
  })

  it("never flags guests or a missing release", () => {
    expect(
      hasUnseenRelease(release, {
        lastSignInAt: undefined,
        seenReleaseId: undefined,
      })
    ).toBe(false)
    expect(
      hasUnseenRelease(undefined, {
        lastSignInAt: "2026-10-06T09:00:00Z",
        seenReleaseId: undefined,
      })
    ).toBe(false)
  })

  it("does not flag on an unparseable timestamp", () => {
    expect(
      hasUnseenRelease(release, {
        lastSignInAt: "not a date",
        seenReleaseId: undefined,
      })
    ).toBe(false)
  })
})
