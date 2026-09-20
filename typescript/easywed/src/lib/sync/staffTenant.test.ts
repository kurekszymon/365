// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { fetchMyStaffTenant } from "./tenant"
import { supabase } from "@/lib/supabase"

/**
 * The apex's half of the sign-in landing, against a real PostgreSQL.
 *
 * `fetchMyStaffTenant` is what decides that an account belongs in a CRM on the
 * one origin that cannot tell from its hostname, and every claim it makes is a
 * policy claim: that `tenant_members` lets the caller read their own row, that
 * `tenants` lets a member read the slug through it, and - the one that matters
 * - that a `customer` is not staff. A venue's couples are `tenant_members` too;
 * answering "yes" for one of them would take a couple who signed in to plan
 * their wedding and drop them in their venue's CRM.
 *
 * Signs into the app's own client rather than building fresh ones like the
 * sibling suites, because the identity under test is the one the app actually
 * queries with. Skipped, not failed, when the local stack is down - see
 * venueRls.test.ts.
 *
 * Fixtures come from supabase/seed.sql.
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_KEY ?? import.meta.env.VITE_SUPABASE_KEY

const PASSWORD = "password123"

const reachable = await probeLocalStack()

/** Signs the app client in and hands back the user id the app would pass. */
const signIn = async (email: string): Promise<string> => {
  await supabase.auth.signOut()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: PASSWORD,
  })
  if (error) throw error
  return data.user.id
}

describe.skipIf(!reachable)("fetchMyStaffTenant", () => {
  afterAll(async () => {
    await supabase.auth.signOut()
  })

  it("names the venue a staff account runs, slug and all", async () => {
    const userId = await signIn("venue@easywed.test")

    expect(await fetchMyStaffTenant(userId)).toEqual({
      id: "50000000-0000-4000-8000-000000000001",
      slug: "bagatelka",
    })
  })

  it("keeps the two venues apart", async () => {
    const userId = await signIn("venue2@easywed.test")

    expect(await fetchMyStaffTenant(userId)).toMatchObject({ slug: "dworek" })
  })

  // Anna is bagatelka's `customer`: married at the venue, not working for it.
  // The whole point of the role filter, and the case a `my_tenant_id()`-shaped
  // lookup would get wrong - that one answers for any membership.
  it("refuses a venue's customer", async () => {
    const userId = await signIn("owner@easywed.test")

    expect(await fetchMyStaffTenant(userId)).toBeNull()
  })

  it("refuses an account in no venue at all", async () => {
    const userId = await signIn("solo@easywed.test")

    expect(await fetchMyStaffTenant(userId)).toBeNull()
  })
})

async function probeLocalStack(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SUPABASE_KEY },
      signal: AbortSignal.timeout(1500),
    })
    return res.ok
  } catch {
    return false
  }
}

beforeAll(() => {
  if (!reachable) {
    console.warn("[staffTenant] local Supabase not reachable - suite skipped")
  }
})
