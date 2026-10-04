import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  claimTenantInvitation,
  fetchMyStaffTenant,
  fetchPublicTenant,
  fetchTenantRole,
} from "./tenant"

/**
 * That every helper in tenant.ts is *total*.
 *
 * The sibling suites (staffTenant, tenantBranding, tenantInvitations) run
 * against a real PostgreSQL and assert what these functions read. This one
 * asserts what they do when there is no PostgreSQL to read: a request that
 * never completes - offline, DNS, CORS, a dropped connection - rejects rather
 * than coming back as the PostgREST error *result* the `if (error)` branches
 * handle. So it is a plain vi.mock, in the shape of termsAcceptance.test.ts,
 * and needs no local stack.
 *
 * The stakes are not a logged failure. Every caller in the tenant tree is a
 * fire-and-forget `void x.then(...)` inside an effect with no `.catch()`, so an
 * escaping rejection is a screen that never leaves its loading state: the CRM
 * shell holds on `crm.loading`, /home renders null behind the venue-landing
 * check, and the claim page sits on "claiming" - none of them recoverable
 * without a reload. Each helper documents a fallback for exactly this; these
 * are the tests that keep the documentation true.
 */

const BOOM = new TypeError("Failed to fetch")

// One rejecting thenable standing in for every query shape the module builds.
// `abortSignal`, `maybeSingle`, `single` and the filter methods all chain back
// to the same object, so it does not matter which path a helper takes - it ends
// up awaiting a rejection either way.
const rejecting = (): Record<string, unknown> => {
  const thenable: Record<string, unknown> = {
    then: (_ok: unknown, fail: (e: unknown) => unknown) => {
      // Deliberately a rejection, not `{ data: null, error: BOOM }` - the error
      // result is the path these helpers already handled.
      return Promise.reject(BOOM).then(undefined, fail)
    },
    catch: (fail: (e: unknown) => unknown) => Promise.reject(BOOM).catch(fail),
  }

  for (const method of [
    "select",
    "eq",
    "in",
    "order",
    "abortSignal",
    "maybeSingle",
    "single",
  ]) {
    thenable[method] = () => thenable
  }

  return thenable
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => rejecting(),
    rpc: () => rejecting(),
  },
}))

describe("tenant helpers resolve when the transport rejects", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("fetchPublicTenant answers null", async () => {
    await expect(fetchPublicTenant("bagatelka")).resolves.toBeNull()
  })

  it("fetchTenantRole answers null", async () => {
    await expect(fetchTenantRole("t1", "u1")).resolves.toBeNull()
  })

  it("fetchMyStaffTenant answers null", async () => {
    await expect(fetchMyStaffTenant("u1")).resolves.toBeNull()
  })

  it("claimTenantInvitation answers a generic failure", async () => {
    // Not one of the named reasons: PT404 and PT409 are verdicts the database
    // reached, and a request that never arrived reached none.
    await expect(claimTenantInvitation("tok-123")).resolves.toEqual({
      ok: false,
      reason: "failed",
    })
  })

  it("still logs, so a hung network is not silent", async () => {
    await fetchPublicTenant("bagatelka")

    expect(console.error).toHaveBeenCalledWith(
      "[tenant] fetchPublicTenant threw",
      BOOM
    )
  })

  it("passes an abort signal through without changing the answer", async () => {
    // The signal is the callers' cancellation mechanism, not this one's:
    // supabase-js turns an abort into an error result, so the fallback here is
    // only ever reached by a real transport failure.
    const controller = new AbortController()

    await expect(
      fetchTenantRole("t1", "u1", controller.signal)
    ).resolves.toBeNull()
  })
})
