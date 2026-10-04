import { createClient } from "@supabase/supabase-js"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase.types"

/**
 * `wedding_invitations` INSERT, asserted against a real PostgreSQL with real
 * RLS.
 *
 * Deliberately narrow: it covers the one policy `20260828000001` replaces, not
 * the whole invitation flow. What is new is that `"owners create invites"` pins
 * the columns it used to leave to the caller.
 *
 * The forgeries are identical to `tenantInvitations.test.ts`'s - the two tables
 * are the same shape - so a suite on one and none on the other would leave the
 * *applied* half of the fix untested.
 *
 * Every case is a refusal except the last two, which clean up after themselves:
 * this database is shared with three other suites running concurrently.
 *
 * Skipped, not failed, when the local stack is down - see venueRls.test.ts.
 *
 * Fixtures come from supabase/seed.sql: owner@easywed.test owns "Anna & Piotr",
 * editor@ is an editor on it, and solo@ owns a different wedding entirely.
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_KEY ?? import.meta.env.VITE_SUPABASE_KEY

const WEDDING = "20000000-0000-4000-8000-000000000001"
// owner@easywed.test, who owns it.
const OWNER_USER = "10000000-0000-4000-8000-000000000001"
// editor@easywed.test: a member with write access to the planner, and no
// business issuing invitations.
const EDITOR_USER = "10000000-0000-4000-8000-000000000002"
// viewer@easywed.test, the account whose acceptance the forgeries fabricate.
const VIEWER_USER = "10000000-0000-4000-8000-000000000003"

const PASSWORD = "password123"

/**
 * Marks the rows this suite creates, so cleanup can find them. Hex, sixteen
 * characters, because the INSERT policy pins the token to `^[0-9a-f]{64}$` -
 * same marker as tenantInvitations.test.ts.
 */
const TEST_TOKEN_PREFIX = "7e577e577e577e57"

const testToken = (seq: number) =>
  `${TEST_TOKEN_PREFIX}${String(seq).padStart(48, "0")}`

const reachable = await probeLocalStack()

const client = () =>
  createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

const signIn = async (email: string) => {
  const supabase = client()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: PASSWORD,
  })
  if (error) throw error
  return supabase
}

describe.skipIf(!reachable)("wedding invitations", () => {
  // The wedding's owner: the only role that may invite.
  let owner: SupabaseClient<Database>
  // An editor on the same wedding - the interesting negative, because they can
  // write the planner and still may not hand out access to it.
  let editor: SupabaseClient<Database>

  let tokenSeq = 0

  beforeAll(async () => {
    ;[owner, editor] = await Promise.all([
      signIn("owner@easywed.test"),
      signIn("editor@easywed.test"),
    ])
  })

  afterEach(async () => {
    await owner
      .from("wedding_invitations")
      .delete()
      .like("token", `${TEST_TOKEN_PREFIX}%`)
  })

  /**
   * The forgeries. Each is the wedding's own owner writing into their own
   * wedding, so `invited_by` and the ownership check - everything the policy
   * constrained before `20260828000001` - already pass.
   */
  describe("the columns an owner must not choose", () => {
    const forge = async (row: Record<string, unknown>) => {
      const { error } = await owner.from("wedding_invitations").insert({
        wedding_id: WEDDING,
        role: "viewer",
        invited_by: OWNER_USER,
        token: testToken(++tokenSeq),
        ...row,
      } as never)
      return error
    }

    it("refuses an invitation minted already claimed", async () => {
      // A row reading, in the couple's own invitation manager, as a named
      // account accepting a link they never saw. `claimed_by` is an `auth.users`
      // FK, so the uuid names a real person.
      const error = await forge({
        claimed_at: new Date().toISOString(),
        claimed_by: VIEWER_USER,
      })

      expect(error?.code).toBe("42501")
    })

    it("refuses a claimed_at with no claimer", async () => {
      const error = await forge({ claimed_at: new Date().toISOString() })
      expect(error?.code).toBe("42501")
    })

    it("refuses a claimed_by with no timestamp", async () => {
      const error = await forge({ claimed_by: VIEWER_USER })
      expect(error?.code).toBe("42501")
    })

    it("refuses an invitation that would outlive the bound", async () => {
      const error = await forge({
        expires_at: new Date("2099-01-01T00:00:00Z").toISOString(),
      })

      expect(error?.code).toBe("42501")
    })

    it("refuses an invitation born expired", async () => {
      const error = await forge({
        expires_at: new Date(Date.now() - 60_000).toISOString(),
      })

      expect(error?.code).toBe("42501")
    })

    it("refuses a guessable token", async () => {
      const error = await forge({ token: "guess-me" })
      expect(error?.code).toBe("42501")
    })
  })

  /**
   * The half of the predicate that was already there. `20260828000001` drops and
   * recreates the policy rather than adding a second, so the original clauses
   * are restated by hand - and a restated clause can be mistyped.
   */
  describe("who may invite at all", () => {
    it("refuses an editor of the same wedding", async () => {
      const { error } = await editor.from("wedding_invitations").insert({
        wedding_id: WEDDING,
        role: "viewer",
        invited_by: EDITOR_USER,
        token: testToken(++tokenSeq),
      })

      expect(error?.code).toBe("42501")
    })

    it("refuses an owner attributing the invitation to someone else", async () => {
      const { error } = await owner.from("wedding_invitations").insert({
        wedding_id: WEDDING,
        role: "viewer",
        invited_by: EDITOR_USER,
        token: testToken(++tokenSeq),
      })

      expect(error?.code).toBe("42501")
    })
  })

  it("still accepts the insert the application actually makes", async () => {
    // The hardening must not break the only insert the application makes:
    // `useWeddingMembers` sends these three columns and nothing else. If this
    // goes red, inviting anyone to a wedding is broken.
    const { data, error } = await owner
      .from("wedding_invitations")
      .insert({
        wedding_id: WEDDING,
        role: "viewer",
        invited_by: OWNER_USER,
      })
      .select("id, token, expires_at, claimed_at, claimed_by")
      .single()

    expect(error).toBeNull()
    expect(data!.token).toMatch(/^[0-9a-f]{64}$/)
    expect(data!.claimed_at).toBeNull()
    expect(data!.claimed_by).toBeNull()
    expect(new Date(data!.expires_at).getTime()).toBeGreaterThan(Date.now())

    // Not covered by afterEach - this one takes the default token.
    await owner.from("wedding_invitations").delete().eq("id", data!.id)
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
