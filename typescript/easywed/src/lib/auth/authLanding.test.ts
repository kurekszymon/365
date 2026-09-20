// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { authLandingPath } from "@/lib/auth/guards"
import {
  clearVenueLanding,
  isVenueLandingPending,
} from "@/lib/auth/venueLanding"

// Where signing in leaves you. Two failures matter here and neither shows up at
// the call site: "/home" on a venue host is apex-only, so the root guard would
// carry a staff member across an origin their session does not exist on, and an
// unconditional venue check on the apex would bounce a venue owner away from
// their own wedding list every time they went looking for it.

const at = (href: string) => {
  const url = new URL(href)
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { hostname: url.hostname, search: url.search },
  })
}

beforeEach(() => {
  clearVenueLanding()
})

afterEach(() => {
  clearVenueLanding()
})

describe("authLandingPath", () => {
  describe("on a venue host", () => {
    beforeEach(() => at("https://bagatelka.easywed.app/login"))

    it("lands in the CRM rather than the couple's wedding list", () => {
      expect(authLandingPath()).toBe("/crm")
    })

    // The role is a round trip away and the CRM shell renders its own 403, so
    // the landing does not wait on it. Nothing here should arm the apex check.
    it("arms no venue lookup - the hostname already answered", () => {
      authLandingPath()

      expect(isVenueLandingPending()).toBe(false)
    })
  })

  describe("on the apex", () => {
    beforeEach(() => at("https://easywed.app/login"))

    it("lands on the wedding list", () => {
      expect(authLandingPath()).toBe("/home")
    })

    it("arms the venue lookup, since the hostname says nothing", () => {
      authLandingPath()

      expect(isVenueLandingPending()).toBe(true)
    })
  })

  describe("with a next", () => {
    it("honours an interrupted destination over either default", () => {
      at("https://bagatelka.easywed.app/login")
      expect(authLandingPath("/crm/roster")).toBe("/crm/roster")

      at("https://easywed.app/login")
      expect(authLandingPath("/wedding/abc-123")).toBe("/wedding/abc-123")
    })

    it("leaves the venue lookup unarmed - nobody asked to be re-routed", () => {
      at("https://easywed.app/login")

      authLandingPath("/settings")

      expect(isVenueLandingPending()).toBe(false)
    })

    // sanitizeNextPath's rejects fall through to the default rather than
    // through to the destination, which is the whole point of routing them
    // here: "//evil.example" is a protocol-relative URL, not a path.
    it.each(["//evil.example", "https://evil.example", "crm", 42, undefined])(
      "falls back to the host default for %s",
      (next) => {
        at("https://bagatelka.easywed.app/login")

        expect(authLandingPath(next)).toBe("/crm")
      }
    )
  })
})
