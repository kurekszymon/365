// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { redirectApexOnlyPathToApex } from "@/lib/tenant/apexRedirect"

// This is the only code in the app that navigates across an origin, and it runs
// in the root beforeLoad - on every route change, for every user. Two failures
// matter and neither is visible at the call site: firing on the apex would send
// easywed.app to itself forever, and failing to fire on a venue host would hand
// a couple a planner on an origin where their session does not exist.

const replace = vi.fn()

const at = (href: string) => {
  const url = new URL(href)
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      hostname: url.hostname,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      replace,
    },
  })
}

afterEach(() => {
  replace.mockReset()
})

describe("redirectApexOnlyPathToApex", () => {
  describe("on a venue host", () => {
    it.each(["/home", "/wedding/abc-123", "/wedding/local", "/wedding"])(
      "sends %s back to the apex",
      (pathname) => {
        at(`https://bagatelka.easywed.app${pathname}`)

        redirectApexOnlyPathToApex(pathname)

        expect(replace).toHaveBeenCalledWith(`https://easywed.app${pathname}`)
      }
    )

    it("carries the query and hash across", () => {
      at("https://bagatelka.easywed.app/wedding/abc?tab=guests#seat-4")

      redirectApexOnlyPathToApex("/wedding/abc")

      expect(replace).toHaveBeenCalledWith(
        "https://easywed.app/wedding/abc?tab=guests#seat-4"
      )
    })

    // The venue's own surfaces obviously stay put - and so does everything
    // shared, like the legal documents and sign-in, which work on either host.
    it.each(["/venue", "/crm", "/crm/customers", "/login", "/pl/terms", "/"])(
      "leaves %s alone",
      (pathname) => {
        at(`https://bagatelka.easywed.app${pathname}`)

        redirectApexOnlyPathToApex(pathname)

        expect(replace).not.toHaveBeenCalled()
      }
    )

    // A path that merely starts with the same letters is not the same path.
    it.each(["/homepage", "/weddings", "/home-page"])(
      "does not treat %s as apex-only",
      (pathname) => {
        at(`https://bagatelka.easywed.app${pathname}`)

        redirectApexOnlyPathToApex(pathname)

        expect(replace).not.toHaveBeenCalled()
      }
    )
  })

  // The failure that would be worst: this runs on every navigation on the apex
  // too, and a redirect there is an infinite loop on the site's own homepage.
  describe("on the apex", () => {
    it.each([
      "https://easywed.app/home",
      "https://www.easywed.app/home",
      "http://localhost:3000/wedding/local",
    ])("never redirects from %s", (href) => {
      at(href)

      redirectApexOnlyPathToApex(new URL(href).pathname)

      expect(replace).not.toHaveBeenCalled()
    })
  })
})
