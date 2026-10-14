// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { compareTables } from "@/lib/sync/loadWeddingForVenue"

// The kitchen report numbers seats in this order, so an unseated guest landing
// first shifts every seated guest's pseudonym by one - and the head count the
// kitchen reads off the top of the list stops matching the room.

describe("compareTables", () => {
  it("sorts an unassigned table after every real one", () => {
    const ids = [
      null,
      "f0000000-0000-4000-8000-000000000000",
      "00000000-0000-4000-8000-000000000000",
      null,
      "a0000000-0000-4000-8000-000000000000",
    ]

    expect([...ids].sort(compareTables)).toEqual([
      "00000000-0000-4000-8000-000000000000",
      "a0000000-0000-4000-8000-000000000000",
      "f0000000-0000-4000-8000-000000000000",
      null,
      null,
    ])
  })

  it("treats two unassigned rows as equal so later keys decide", () => {
    expect(compareTables(null, null)).toBe(0)
  })
})
