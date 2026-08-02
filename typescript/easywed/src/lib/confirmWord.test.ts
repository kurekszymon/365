import { describe, expect, it } from "vitest"
import { matchesConfirmWord } from "./confirmWord"

describe("matchesConfirmWord", () => {
  it("matches the word exactly", () => {
    expect(matchesConfirmWord("DELETE", "DELETE")).toBe(true)
  })

  it("accepts lowercase - the uppercase is styling, not a requirement", () => {
    expect(matchesConfirmWord("delete", "DELETE")).toBe(true)
  })

  it("ignores whitespace from a paste", () => {
    expect(matchesConfirmWord("  DELETE ", "DELETE")).toBe(true)
  })

  it("matches the Polish word including its diacritic", () => {
    expect(matchesConfirmWord("usuń", "USUŃ")).toBe(true)
    expect(matchesConfirmWord("USUŃ", "USUŃ")).toBe(true)
  })

  it("rejects the wrong word", () => {
    expect(matchesConfirmWord("DELET", "DELETE")).toBe(false)
    expect(matchesConfirmWord("DELETE ACCOUNT", "DELETE")).toBe(false)
  })

  it("rejects a diacritic-stripped near miss", () => {
    expect(matchesConfirmWord("usun", "USUŃ")).toBe(false)
  })

  it("never lets empty input arm the button", () => {
    expect(matchesConfirmWord("", "DELETE")).toBe(false)
    expect(matchesConfirmWord("   ", "DELETE")).toBe(false)
    // A missing translation must not make everything match.
    expect(matchesConfirmWord("", "")).toBe(false)
  })
})
