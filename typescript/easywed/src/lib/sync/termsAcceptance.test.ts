import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  acceptTerms,
  fetchTermsStatus,
  forgetPendingTermsAcceptance,
  recordPendingTermsAcceptance,
} from "./termsAcceptance"
import { TERMS_ENFORCED_SINCE, TERMS_VERSION } from "@/lib/legal/dates"

const mocks = vi.hoisted(() => ({
  profile: null as { terms_version: string | null; created_at: string } | null,
  selectError: null as { message: string } | null,
  updates: [] as Array<Record<string, unknown>>,
}))

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: mocks.profile, error: mocks.selectError }),
        }),
      }),
      update: (values: Record<string, unknown>) => ({
        eq: () => {
          mocks.updates.push(values)
          return Promise.resolve({ error: null })
        },
      }),
    }),
  },
}))

// The environment is "node", so there is no localStorage to speak of - and the
// module treats a missing one as a no-op, which would make every assertion here
// vacuously pass. This gives it a real one.
const storage = new Map<string, string>()
const PENDING_KEY = "easywed.terms.pending"

const NOW = new Date("2026-09-01T12:00:00Z")
const MINUTE = 60 * 1000

// Relative to the frozen cut-off rather than a literal date, so the test still
// says what it means if TERMS_ENFORCED_SINCE is ever legitimately moved.
const enforcedSince = Date.parse(`${TERMS_ENFORCED_SINCE}T00:00:00Z`)
const beforeTheGate = new Date(enforcedSince - 86400000).toISOString()
const afterTheGate = new Date(enforcedSince + 86400000).toISOString()

beforeEach(() => {
  storage.clear()
  mocks.profile = { terms_version: null, created_at: afterTheGate }
  mocks.selectError = null
  mocks.updates = []

  vi.stubGlobal("localStorage", {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  })
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** What the sign-up form leaves behind, `age` milliseconds ago. */
const pendingMarkerAged = (age: number) => {
  storage.set(PENDING_KEY, `${TERMS_VERSION}|${Date.now() - age}`)
}

describe("recordPendingTermsAcceptance", () => {
  it("records a marker from the sign-up that is still in flight", async () => {
    pendingMarkerAged(5 * MINUTE)

    await recordPendingTermsAcceptance("u1")

    expect(mocks.updates).toEqual([{ terms_version: TERMS_VERSION }])
    expect(storage.has(PENDING_KEY)).toBe(false)
  })

  // The one this TTL exists for: someone ticks the box, abandons the sign-up,
  // and the next person to use the browser signs in with Google from /login -
  // a form with no checkbox, which still creates an account. Without the TTL
  // the stale marker records an acceptance that person never gave.
  it("ignores a marker left over from an abandoned sign-up", async () => {
    pendingMarkerAged(30 * MINUTE)

    await recordPendingTermsAcceptance("u2")

    expect(mocks.updates).toEqual([])
    expect(storage.has(PENDING_KEY)).toBe(false)
  })

  it("ignores an undateable marker rather than trusting it", async () => {
    storage.set(PENDING_KEY, TERMS_VERSION)

    await recordPendingTermsAcceptance("u3")

    expect(mocks.updates).toEqual([])
    expect(storage.has(PENDING_KEY)).toBe(false)
  })

  it("leaves an acceptance the signup trigger already recorded alone", async () => {
    mocks.profile = { terms_version: "2026-01-01", created_at: afterTheGate }
    pendingMarkerAged(MINUTE)

    await recordPendingTermsAcceptance("u4")

    expect(mocks.updates).toEqual([])
    expect(storage.has(PENDING_KEY)).toBe(false)
  })

  it("does nothing without a marker", async () => {
    await recordPendingTermsAcceptance("u5")

    expect(mocks.updates).toEqual([])
  })

  it("keeps the marker when the read fails, so the next render retries", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.selectError = { message: "offline" }
    pendingMarkerAged(MINUTE)

    await recordPendingTermsAcceptance("u6")

    expect(mocks.updates).toEqual([])
    expect(storage.has(PENDING_KEY)).toBe(true)
  })
})

describe("forgetPendingTermsAcceptance", () => {
  it("drops a marker without acting on it", async () => {
    pendingMarkerAged(MINUTE)

    forgetPendingTermsAcceptance()
    await recordPendingTermsAcceptance("u7")

    expect(mocks.updates).toEqual([])
  })
})

describe("fetchTermsStatus", () => {
  it("accepts a recorded version", async () => {
    mocks.profile = { terms_version: TERMS_VERSION, created_at: afterTheGate }

    await expect(fetchTermsStatus("u1")).resolves.toBe("accepted")
  })

  // § 16 ust. 2 (notify by email, 14 days to object) is the route for these
  // accounts, not a wall in front of the app.
  it("grandfathers an account that predates the gate", async () => {
    mocks.profile = { terms_version: null, created_at: beforeTheGate }

    await expect(fetchTermsStatus("u2")).resolves.toBe("accepted")
  })

  it("gates an account created under the gate with nothing recorded", async () => {
    mocks.profile = { terms_version: null, created_at: afterTheGate }

    await expect(fetchTermsStatus("u3")).resolves.toBe("outstanding")
  })

  // The cut-off is frozen precisely so that publishing a new Regulamin does not
  // quietly grandfather everyone who slipped through under the previous one.
  // Derived from TERMS_VERSION, this account would flip to "accepted" the day
  // the version moves - without anyone accepting anything.
  it("keeps gating a dodged acceptance after the version is bumped", async () => {
    vi.resetModules()
    vi.doMock("@/lib/legal/dates", () => ({
      TERMS_VERSION: "2027-06-01",
      TERMS_ENFORCED_SINCE,
    }))

    const { fetchTermsStatus: afterBump } = await import("./termsAcceptance")
    mocks.profile = { terms_version: null, created_at: afterTheGate }

    await expect(afterBump("u5")).resolves.toBe("outstanding")

    vi.doUnmock("@/lib/legal/dates")
  })

  it.each([
    ["a failed read", { message: "offline" }, null],
    ["a missing profile row", null, null],
  ])("fails open on %s", async (_, error, profile) => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.selectError = error
    mocks.profile = profile

    await expect(fetchTermsStatus("u4")).resolves.toBe("accepted")
  })
})

describe("acceptTerms", () => {
  it("writes the current version and clears any marker", async () => {
    pendingMarkerAged(MINUTE)

    await expect(acceptTerms("u1")).resolves.toEqual({ error: null })
    expect(mocks.updates).toEqual([{ terms_version: TERMS_VERSION }])
    expect(storage.has(PENDING_KEY)).toBe(false)
  })
})
