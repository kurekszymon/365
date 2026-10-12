import { describe, expect, it } from "vitest"
import { inviteOnWrongOrigin } from "./inviteOrigin"

describe("inviteOnWrongOrigin", () => {
  it.each([
    // [role, invite slug, current slug, wrong?]
    ["customer", "bagatelka", null, false],
    ["customer", "bagatelka", "bagatelka", true],
    ["customer", "bagatelka", "dworek", true],
    ["staff", "bagatelka", "bagatelka", false],
    ["staff", "bagatelka", null, true],
    ["staff", "bagatelka", "dworek", true],
  ] as const)(
    "%s invite to %s, opened on %s -> wrong: %s",
    (role, inviteSlug, currentSlug, wrong) => {
      expect(inviteOnWrongOrigin(role, inviteSlug, currentSlug)).toBe(wrong)
    }
  )
})
