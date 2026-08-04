import { describe, expect, it } from "vitest"
import { redactInviteToken, scrubInviteTokens } from "./scrubInviteTokens"
import type { CaptureResult } from "posthog-js"

const TOKEN = "8f14e45fceea167a5a36dedd4bea2543a1b2c3d4e5f60718293a4b5c6d7e8f90"

const event = (overrides: Partial<CaptureResult> = {}): CaptureResult => ({
  uuid: "01234567-89ab-cdef-0123-456789abcdef",
  event: "$pageview",
  properties: {},
  ...overrides,
})

// Reaches into the returned event without the caller having to re-assert it's
// non-null on every line - scrubInviteTokens only returns null for a null input.
const scrub = (input: CaptureResult): CaptureResult => {
  const result = scrubInviteTokens(input)
  if (!result) throw new Error("expected an event back")
  return result
}

describe("redactInviteToken", () => {
  it("replaces the token segment of an absolute claim URL", () => {
    expect(redactInviteToken(`https://easywed.app/invite/${TOKEN}`)).toBe(
      "https://easywed.app/invite/<redacted>"
    )
  })

  it("replaces the token segment of a bare pathname", () => {
    expect(redactInviteToken(`/invite/${TOKEN}`)).toBe("/invite/<redacted>")
  })

  it("keeps the query string and hash that follow the token", () => {
    expect(redactInviteToken(`/invite/${TOKEN}?next=/home#top`)).toBe(
      "/invite/<redacted>?next=/home#top"
    )
  })

  it("stops at a trailing slash rather than eating the rest of the path", () => {
    expect(redactInviteToken(`/invite/${TOKEN}/extra`)).toBe(
      "/invite/<redacted>/extra"
    )
  })

  it("leaves unrelated urls untouched", () => {
    expect(redactInviteToken("https://easywed.app/wedding/abc/planner")).toBe(
      "https://easywed.app/wedding/abc/planner"
    )
  })

  it("leaves the bare /invite/ path alone - there is no token to remove", () => {
    expect(redactInviteToken("https://easywed.app/invite/")).toBe(
      "https://easywed.app/invite/"
    )
  })
})

describe("scrubInviteTokens", () => {
  it("passes a null event straight through", () => {
    expect(scrubInviteTokens(null)).toBeNull()
  })

  it("redacts the captured url and pathname of a pageview", () => {
    const result = scrub(
      event({
        properties: {
          $current_url: `https://easywed.app/invite/${TOKEN}`,
          $pathname: `/invite/${TOKEN}`,
        },
      })
    )

    expect(result.properties.$current_url).toBe(
      "https://easywed.app/invite/<redacted>"
    )
    expect(result.properties.$pathname).toBe("/invite/<redacted>")
  })

  // The second half of the leak: after the claim redirects to the wedding, the
  // next pageview reports the invite URL as where the user came from.
  it("redacts the referrer of the navigation away from the claim page", () => {
    const result = scrub(
      event({
        properties: {
          $current_url: "https://easywed.app/wedding/abc/planner",
          $referrer: `https://easywed.app/invite/${TOKEN}`,
        },
      })
    )

    expect(result.properties.$referrer).toBe(
      "https://easywed.app/invite/<redacted>"
    )
  })

  // $initial_current_url is built by prefixing $current_url at runtime, so it
  // is exactly the kind of key a hand-written allowlist would miss.
  it("redacts runtime-prefixed person properties in $set and $set_once", () => {
    const result = scrub(
      event({
        event: "$identify",
        properties: {},
        $set: { $current_url: `https://easywed.app/invite/${TOKEN}` },
        $set_once: {
          $initial_current_url: `https://easywed.app/invite/${TOKEN}`,
          $initial_pathname: `/invite/${TOKEN}`,
        },
      })
    )

    expect(result.$set?.$current_url).toBe(
      "https://easywed.app/invite/<redacted>"
    )
    expect(result.$set_once?.$initial_current_url).toBe(
      "https://easywed.app/invite/<redacted>"
    )
    expect(result.$set_once?.$initial_pathname).toBe("/invite/<redacted>")
  })

  it("reaches urls nested inside a property bag", () => {
    const result = scrub(
      event({
        properties: {
          $set_once: { $initial_current_url: `/invite/${TOKEN}` },
          $external_click_urls: [`https://easywed.app/invite/${TOKEN}`],
        },
      })
    )

    expect(result.properties.$set_once.$initial_current_url).toBe(
      "/invite/<redacted>"
    )
    expect(result.properties.$external_click_urls).toEqual([
      "https://easywed.app/invite/<redacted>",
    ])
  })

  it("leaves non-url properties and unrelated urls alone", () => {
    const result = scrub(
      event({
        properties: {
          $current_url: "https://easywed.app/wedding/abc/planner",
          $host: "easywed.app",
          $screen_height: 1080,
          weddingName: "Ania i Piotr",
        },
      })
    )

    expect(result.properties).toEqual({
      $current_url: "https://easywed.app/wedding/abc/planner",
      $host: "easywed.app",
      $screen_height: 1080,
      weddingName: "Ania i Piotr",
    })
  })

  it("scrubs a snapshot's own properties without walking its payload", () => {
    const snapshotData = [
      { type: 4, data: { href: `https://easywed.app/invite/${TOKEN}` } },
    ]
    const result = scrub(
      event({
        event: "$snapshot",
        properties: {
          $current_url: `https://easywed.app/invite/${TOKEN}`,
          $snapshot_data: snapshotData,
        },
      })
    )

    expect(result.properties.$current_url).toBe(
      "https://easywed.app/invite/<redacted>"
    )
    // Documents the known gap rather than asserting it away: replay payloads
    // are not descended into, so replay has to be excluded for /invite/*
    // server-side. If this ever starts passing redacted, the comment in
    // scrubInviteTokens.ts needs updating too.
    expect(result.properties.$snapshot_data[0].data.href).toBe(
      `https://easywed.app/invite/${TOKEN}`
    )
  })

  it("returns the same object it was handed", () => {
    const input = event({ properties: { $current_url: `/invite/${TOKEN}` } })

    expect(scrubInviteTokens(input)).toBe(input)
  })
})
