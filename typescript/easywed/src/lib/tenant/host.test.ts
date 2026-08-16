import { describe, expect, it } from "vitest"
import {
  RESERVED_SUBDOMAINS,
  TENANT_SLUG_RE,
  isTenantSlug,
  tenantSlugFromHost,
} from "@/lib/tenant/host"

// `tenantSlugFromHost` runs synchronously in `beforeLoad` on every navigation,
// including every existing apex user's. Two things have to hold and neither is
// visible at a call site: the apex is null (nobody pays for v2), and nothing
// that is not a real tenant slug gets far enough to become an RPC.

describe("tenantSlugFromHost", () => {
  it.each([
    ["bagatelka.easywed.app", "bagatelka"],
    ["dwor-pod-lipami.easywed.app", "dwor-pod-lipami"],
    ["hala7.easywed.app", "hala7"],
    // Hosts arrive lowercased from `location.hostname`, but a hand-built URL or
    // a Host header does not, and DNS is case-insensitive.
    ["Bagatelka.EasyWed.App", "bagatelka"],
    // A fully-qualified name with the root dot addresses the same host.
    ["bagatelka.easywed.app.", "bagatelka"],
  ])("resolves %s to %s", (host, slug) => {
    expect(tenantSlugFromHost(host)).toBe(slug)
  })

  it.each([
    ["easywed.app"],
    ["www.easywed.app"],
    ["localhost"],
    ["127.0.0.1"],
    ["[::1]"],
    ["0.0.0.0"],
  ])("treats %s as the apex", (host) => {
    expect(tenantSlugFromHost(host)).toBeNull()
  })

  it.each([
    // Nested subdomains are not tenants, in either direction.
    ["a.b.easywed.app"],
    ["staging.bagatelka.easywed.app"],
    ["bagatelka.easywed.app.evil.test"],
    // A different registrable domain that merely ends in our name.
    ["notreallyeasywed.app"],
    ["easywed.app.evil.test"],
    // Bare host with no suffix of ours at all.
    ["example.com"],
    ["bagatelka.example.com"],
    [""],
    // A port belongs to `location.host`, not `location.hostname`. Rejected
    // rather than stripped: passing one means the caller read the wrong field,
    // and guessing would hide that.
    ["bagatelka.easywed.app:3000"],
  ])("rejects %s", (host) => {
    expect(tenantSlugFromHost(host)).toBeNull()
  })

  // *.localhost resolves to loopback in every current browser with no DNS and
  // no /etc/hosts entry, which is what makes a tenant host reproducible in dev.
  it.each([
    ["bagatelka.localhost", "bagatelka"],
    ["dwor-pod-lipami.localhost", "dwor-pod-lipami"],
  ])("resolves %s in dev to %s", (host, slug) => {
    expect(tenantSlugFromHost(host)).toBe(slug)
  })

  describe("slug shape", () => {
    it.each([
      // Too short: the regex floor is 3 characters.
      ["ab"],
      ["a"],
      // Hyphen at either edge.
      ["-bagatelka"],
      ["bagatelka-"],
      ["-"],
      // Characters outside the alphabet. Underscores are not valid in a DNS
      // label; uppercase never reaches here; a dot is a nested subdomain.
      ["sala_weselna"],
      ["sala weselna"],
      ["sala.weselna"],
      ["salą"],
      // 33 characters, one over the ceiling.
      ["a".repeat(33)],
    ])("rejects %s as a slug", (label) => {
      expect(tenantSlugFromHost(`${label}.easywed.app`)).toBeNull()
      expect(isTenantSlug(label)).toBe(false)
    })

    it("accepts a slug at each boundary of the length range", () => {
      expect(tenantSlugFromHost(`abc.easywed.app`)).toBe("abc")
      const max = "a".repeat(32)
      expect(tenantSlugFromHost(`${max}.easywed.app`)).toBe(max)
    })

    it("keeps the regex and the helper in agreement", () => {
      expect(TENANT_SLUG_RE.test("bagatelka")).toBe(true)
      expect(isTenantSlug("bagatelka")).toBe(true)
    })
  })

  it("refuses every reserved subdomain", () => {
    const resolved = [...RESERVED_SUBDOMAINS].filter(
      (label) => tenantSlugFromHost(`${label}.easywed.app`) !== null
    )
    expect(resolved).toEqual([])
  })

  it("reserves the labels the routes and infrastructure already use", () => {
    // Spot-check rather than a full list: the point is that these specific ones
    // can never be handed to a tenant, whatever else the set grows to hold.
    for (const label of [
      "www",
      "app",
      "api",
      "crm",
      "venue",
      "admin",
      "mail",
    ]) {
      expect(RESERVED_SUBDOMAINS.has(label)).toBe(true)
    }
  })

  describe("preview deployments", () => {
    // The leading label on a Pages preview URL is a build hash, so it must not
    // be read as a tenant - but previews still need a way to reach a tenant.
    it("ignores the build hash on a preview host", () => {
      expect(tenantSlugFromHost("a1b2c3d4.easywed.pages.dev")).toBeNull()
      expect(tenantSlugFromHost("easywed.pages.dev")).toBeNull()
    })

    it.each([
      ["?tenant=bagatelka", "bagatelka"],
      ["tenant=bagatelka", "bagatelka"],
      ["?foo=1&tenant=bagatelka", "bagatelka"],
      ["?tenant=Bagatelka", "bagatelka"],
    ])("honours %s on a preview host", (search, slug) => {
      expect(tenantSlugFromHost("a1b2c3d4.easywed.pages.dev", search)).toBe(
        slug
      )
    })

    it.each([["?tenant="], ["?tenant=www"], ["?tenant=not_a_slug"], ["?x=1"]])(
      "still rejects %s on a preview host",
      (search) => {
        expect(
          tenantSlugFromHost("a1b2c3d4.easywed.pages.dev", search)
        ).toBeNull()
      }
    )

    // The override is scoped to previews on purpose. On the apex it would let
    // any link drop a visitor into a tenant context; on a tenant host it would
    // let a link claim to be a different tenant. RLS would refuse either way,
    // but the second reads as a spoof and neither should be expressible.
    it("does not honour the override off a preview host", () => {
      expect(tenantSlugFromHost("easywed.app", "?tenant=bagatelka")).toBeNull()
      expect(
        tenantSlugFromHost("www.easywed.app", "?tenant=bagatelka")
      ).toBeNull()
      expect(tenantSlugFromHost("bagatelka.easywed.app", "?tenant=inny")).toBe(
        "bagatelka"
      )
    })
  })
})
