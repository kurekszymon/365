// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { apexOrigin, tenantOrigin } from "@/lib/tenant/host"

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

describe("tenantOrigin", () => {
  it.each([
    ["https://easywed.app/home", "https://bagatelka.easywed.app"],
    // Already on a tenant host, inviting staff to the same one.
    ["https://bagatelka.easywed.app/crm", "https://bagatelka.easywed.app"],
    // ...or naming a different one, which swaps the label rather than nesting.
    ["https://dworek.easywed.app/crm", "https://bagatelka.easywed.app"],
    // Never bagatelka.www.easywed.app - nobody holds that certificate.
    ["https://www.easywed.app/home", "https://bagatelka.easywed.app"],
    ["http://localhost:3000/home", "http://bagatelka.localhost:3000"],
    ["http://dworek.localhost:3000/crm", "http://bagatelka.localhost:3000"],
  ])("%s -> %s", (href, expected) => {
    at(href)
    expect(tenantOrigin("bagatelka")).toBe(expected)
  })

  // A preview deploy cannot have tenant subdomains, so the ?tenant= escape
  // hatch stands in - the same one tenantSlugFromHost honours there and only
  // there.
  it("uses the query override on a preview host", () => {
    at("https://a1b2c3d4.easywed.pages.dev/crm")
    expect(tenantOrigin("bagatelka")).toBe(
      "https://a1b2c3d4.easywed.pages.dev/?tenant=bagatelka"
    )
  })
})
