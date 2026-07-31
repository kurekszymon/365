import { describe, expect, it } from "vitest"
import { toBlockingWeddings } from "./account"

const OWNER = "11111111-1111-1111-1111-111111111111"
const OTHER = "22222222-2222-2222-2222-222222222222"
const THIRD = "33333333-3333-3333-3333-333333333333"

describe("toBlockingWeddings", () => {
  it("does not block on a wedding only the owner is in", () => {
    const rows = [
      { id: "w1", name: "Solo", wedding_members: [{ user_id: OWNER }] },
    ]

    expect(toBlockingWeddings(rows, OWNER)).toEqual([])
  })

  it("blocks on a wedding with a co-member and counts only the others", () => {
    const rows = [
      {
        id: "w1",
        name: "Shared",
        wedding_members: [{ user_id: OWNER }, { user_id: OTHER }],
      },
    ]

    expect(toBlockingWeddings(rows, OWNER)).toEqual([
      { id: "w1", name: "Shared", otherMembers: 1 },
    ])
  })

  it("keeps only the blocking weddings out of a mixed list", () => {
    const rows = [
      { id: "w1", name: "Solo", wedding_members: [{ user_id: OWNER }] },
      {
        id: "w2",
        name: "Shared",
        wedding_members: [
          { user_id: OWNER },
          { user_id: OTHER },
          { user_id: THIRD },
        ],
      },
    ]

    expect(toBlockingWeddings(rows, OWNER)).toEqual([
      { id: "w2", name: "Shared", otherMembers: 2 },
    ])
  })

  it("treats an empty member list as non-blocking", () => {
    // Shouldn't happen - handle_new_wedding always inserts the owner - but a
    // zero here must not read as "someone else is in this wedding".
    const rows = [{ id: "w1", name: "Orphan", wedding_members: [] }]

    expect(toBlockingWeddings(rows, OWNER)).toEqual([])
  })

  it("blocks when the owner isn't in their own member list", () => {
    // The 20260731000003 migration exists because owners could delete their
    // own membership row. If that ever regresses, the co-member is still real
    // and must still block.
    const rows = [
      { id: "w1", name: "Detached", wedding_members: [{ user_id: OTHER }] },
    ]

    expect(toBlockingWeddings(rows, OWNER)).toEqual([
      { id: "w1", name: "Detached", otherMembers: 1 },
    ])
  })

  it("returns nothing when the user owns no weddings", () => {
    expect(toBlockingWeddings([], OWNER)).toEqual([])
  })
})
