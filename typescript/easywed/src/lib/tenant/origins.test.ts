// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { apexOrigin, tenantUrl } from "@/lib/tenant/host"

// These two build the URLs that go into venue invitation links, and an invite
// that points at the wrong origin is not a cosmetic bug: sessions are
// per-origin, so a couple who follows a tenant-host link signs in somewhere
// their account and their weddings are not. The dev cases matter as much as the
// production ones - `SITE_ORIGIN` is a constant, and using it here is exactly
// the mistake these functions exist to prevent.

const at = (href: string) => {
  const url = new URL(href)
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      origin: url.origin,
      search: url.search,
    },
  })
}

describe("apexOrigin", () => {
  it.each([
    ["https://bagatelka.easywed.app/crm", "https://easywed.app"],
    ["https://easywed.app/home", "https://easywed.app"],
    // `www` is an apex host, so it is already the answer - the caller wanted
    // "where the app lives", and it lives here too.
    ["https://www.easywed.app/home", "https://www.easywed.app"],
    // Dev: the port has to survive, or the link 404s against nothing.
    ["http://bagatelka.localhost:3000/crm", "http://localhost:3000"],
    ["http://localhost:3000/home", "http://localhost:3000"],
    // A preview deploy has no tenant label to strip.
    [
      "https://a1b2c3d4.easywed.pages.dev/crm",
      "https://a1b2c3d4.easywed.pages.dev",
    ],
    // ...including when `?tenant=` puts the preview *in* a tenant context. The
    // slug is real there but the hostname never carried it, so stripping a
    // label off the front hands out `https://pages.dev` - somebody else's
    // origin, in a link carrying an invitation token.
    [
      "https://a1b2c3d4.easywed.pages.dev/crm?tenant=bagatelka",
      "https://a1b2c3d4.easywed.pages.dev",
    ],
  ])("%s -> %s", (href, expected) => {
    at(href)
    expect(apexOrigin()).toBe(expected)
  })
})

describe("tenantUrl", () => {
  it.each([
    ["https://easywed.app/home", "https://bagatelka.easywed.app/crm"],
    // Already on a tenant host, inviting staff to the same one.
    ["https://bagatelka.easywed.app/crm", "https://bagatelka.easywed.app/crm"],
    // ...or naming a different one, which swaps the label rather than nesting.
    ["https://dworek.easywed.app/crm", "https://bagatelka.easywed.app/crm"],
    // Never bagatelka.www.easywed.app - nobody holds that certificate.
    ["https://www.easywed.app/home", "https://bagatelka.easywed.app/crm"],
    ["http://localhost:3000/home", "http://bagatelka.localhost:3000/crm"],
    ["http://dworek.localhost:3000/crm", "http://bagatelka.localhost:3000/crm"],
  ])("%s -> %s", (href, expected) => {
    at(href)
    expect(tenantUrl("bagatelka", "/crm")).toBe(expected)
  })

  // A preview deploy cannot have tenant subdomains, so the ?tenant= escape
  // hatch stands in - the same one tenantSlugFromHost honours there and only
  // there. The path has to stay a path: this used to hand back an "origin"
  // ending in `?tenant=bagatelka`, so a caller appending the invite path put
  // the token inside the query value and the claim route never ran.
  it("keeps the path a path on a preview host", () => {
    at("https://a1b2c3d4.easywed.pages.dev/crm")

    const url = new URL(tenantUrl("bagatelka", "/venue/invite/tok-123"))
    expect(url.origin).toBe("https://a1b2c3d4.easywed.pages.dev")
    expect(url.pathname).toBe("/venue/invite/tok-123")
    expect(url.searchParams.get("tenant")).toBe("bagatelka")
  })

  it("appends the tenant to a path that already carries a query", () => {
    at("https://a1b2c3d4.easywed.pages.dev/crm")

    const url = new URL(tenantUrl("bagatelka", "/login?next=/crm"))
    expect(url.pathname).toBe("/login")
    expect(url.searchParams.get("next")).toBe("/crm")
    expect(url.searchParams.get("tenant")).toBe("bagatelka")
  })
})
