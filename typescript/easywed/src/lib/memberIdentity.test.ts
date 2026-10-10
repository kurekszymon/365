import { describe, expect, it } from "vitest"
import { getAvatarTone, getInitials } from "./memberIdentity"

describe("getInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(getInitials("Anna Kowalska")).toBe("AK")
    expect(getInitials("Piotr Nowak")).toBe("PN")
  })

  it("ignores anything past the second word", () => {
    expect(getInitials("Anna Maria Kowalska")).toBe("AM")
  })

  it("handles a single word", () => {
    expect(getInitials("Beaver")).toBe("B")
  })

  it("uppercases Polish letters", () => {
    expect(getInitials("łukasz ćwikła")).toBe("ŁĆ")
  })

  it("survives extra whitespace", () => {
    expect(getInitials("  Anna   Kowalska  ")).toBe("AK")
  })

  it("keeps a multi-code-unit character whole", () => {
    expect(getInitials("🦫 Planner")).toBe("🦫P")
  })

  // Guest names are free text the couple types and can be left blank; the
  // planner's avatar circles are fixed-size, so they need *something* in them.
  it("falls back to a bullet for a name with no letters", () => {
    expect(getInitials("")).toBe("•")
    expect(getInitials("   ")).toBe("•")
  })
})

describe("getAvatarTone", () => {
  it("is stable for the same id", () => {
    const id = "aaaaaaaa-0000-0000-0000-000000000001"
    expect(getAvatarTone(id)).toBe(getAvatarTone(id))
  })

  it("returns a class pair from the palette", () => {
    expect(getAvatarTone("whatever")).toMatch(/^bg-\w+-700 text-white$/)
  })
})
