import { createClient } from "@supabase/supabase-js"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase.types"

/**
 * The tenant invitation flow, asserted against a real PostgreSQL with real RLS.
 *
 * The sibling of venueRls.test.ts, and it exists for the same reason: every
 * claim this feature makes is a *policy* claim. "A venue cannot put a stranger
 * on its roster" and "an invitation is spent by the person it names, not by the
 * venue" are enforced by an absent INSERT policy and a definer function, and
 * neither a type nor a comment can hold that.
 *
 * The specific regression this guards is the one 20260817000001 section 4
 * describes: an INSERT policy on `tenant_members` that lets staff name any uuid
 * hands that account's display name to the venue, permanently bars it from
 * every other venue, and makes its weddings attachable. Re-adding one would
 * make the whole feature "work" and turn several of these red.
 *
 * Skipped, not failed, when the local stack is down - see venueRls.test.ts.
 *
 * Fixtures come from supabase/seed.sql: `bagatelka` is invitation-only,
 * `dworek` is open, and solo@easywed.test is the only account in no tenant.
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_KEY ?? import.meta.env.VITE_SUPABASE_KEY

const BAGATELKA = "50000000-0000-4000-8000-000000000001"
// solo@easywed.test, who belongs to no tenant and owns "Tomasz & Kasia".
const SOLO_USER = "10000000-0000-4000-8000-000000000004"
const SOLO_WEDDING = "20000000-0000-4000-8000-000000000002"
// owner@easywed.test, already a 'customer' of bagatelka.
const COUPLE_USER = "10000000-0000-4000-8000-000000000001"
const PASSWORD = "password123"

/**
 * Prefix for every token these tests mint, and the whole cleanup strategy.
 *
 * The seeded `seed-live-customer-invite` is deliberately left alone. Claiming
 * it burns it, and there is no way back: `tenant_invitations` has no UPDATE
 * policy on purpose, so a client cannot un-claim a row, and the second run of
 * the suite would find every claim returning PT404. The seeded token exists for
 * clicking through the flow in a browser; the suite makes its own.
 */
const TEST_TOKEN_PREFIX = "test-invite-"

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

describe.skipIf(!reachable)("tenant invitations", () => {
  // Owner of `bagatelka`.
  let venue: SupabaseClient<Database>
  // Owner of `dworek`, the isolation control.
  let otherVenue: SupabaseClient<Database>
  // In no tenant at seed time, which is what makes them claimable.
  let solo: SupabaseClient<Database>
  // Already a 'customer' of bagatelka.
  let couple: SupabaseClient<Database>

  let venueUserId: string
  let tokenSeq = 0

  /**
   * A live `customer` invitation to `bagatelka`, minted by its owner.
   *
   * The token is supplied rather than left to the column default so cleanup can
   * match on it - `token` is `not null unique` with a default, and an explicit
   * value is as legitimate as the seed's.
   */
  const mintInvitation = async (
    role: "customer" | "staff" = "customer"
  ): Promise<string> => {
    const token = `${TEST_TOKEN_PREFIX}${++tokenSeq}`
    const { error } = await venue.from("tenant_invitations").insert({
      tenant_id: BAGATELKA,
      role,
      token,
      invited_by: venueUserId,
    })
    if (error) throw error
    return token
  }

  beforeAll(async () => {
    ;[venue, otherVenue, solo, couple] = await Promise.all([
      signIn("venue@easywed.test"),
      signIn("venue2@easywed.test"),
      signIn("solo@easywed.test"),
      signIn("owner@easywed.test"),
    ])
    venueUserId = (await venue.auth.getUser()).data.user!.id
  })

  // A suite that only passes on a freshly reset database is a suite people stop
  // running, so every test puts the fixture back: `solo` leaves whatever tenant
  // they joined, and every minted invitation is dropped, claimed or not.
  //
  // One residue is deliberately *not* undone: the linking test below points
  // "Tomasz & Kasia" at `bagatelka` in state 'pending', and nothing a client
  // can call unlinks a wedding - `enforce_wedding_tenant_columns` makes both
  // columns unwritable and there is no inverse of link_wedding_to_venue. It is
  // harmless on a re-run: 'pending' is what the wedding would be left in
  // anyway, the derived 'venue' role requires 'granted', so venueRls.test.ts's
  // "reaches nothing belonging to a wedding it was not granted" still holds,
  // and the PT403 that test asserts first comes from solo's *membership* being
  // gone, not from the wedding being unlinked.
  afterEach(async () => {
    await solo.from("tenant_members").delete().eq("user_id", SOLO_USER)
    await venue
      .from("tenant_invitations")
      .delete()
      .like("token", `${TEST_TOKEN_PREFIX}%`)
  })

  describe("what a venue cannot do to a stranger", () => {
    it("cannot insert a tenant_members row directly", async () => {
      const { error } = await venue
        .from("tenant_members")
        .insert({ tenant_id: BAGATELKA, user_id: SOLO_USER, role: "customer" })

      // The absence of an INSERT policy is the guarantee - 20260817000001
      // section 4. RLS refuses the write rather than filtering it, so unlike a
      // SELECT this really is an error and not an empty result.
      expect(error).not.toBeNull()
    })

    it("cannot read a stranger's display name before they join", async () => {
      const { data } = await venue
        .from("profiles")
        .select("id, display_name")
        .eq("id", SOLO_USER)

      // `staff_can_view_profile` keys off tenant_members, so this is the
      // disclosure the missing INSERT policy prevents. Filtered, not refused.
      expect(data).toEqual([])
    })

    it("cannot create an invitation for another venue's tenant", async () => {
      const { error } = await otherVenue.from("tenant_invitations").insert({
        tenant_id: BAGATELKA,
        role: "customer",
        invited_by: (await otherVenue.auth.getUser()).data.user!.id,
      })

      expect(error).not.toBeNull()
    })

    it("cannot attribute an invitation to a colleague", async () => {
      const { error } = await venue.from("tenant_invitations").insert({
        tenant_id: BAGATELKA,
        role: "customer",
        invited_by: SOLO_USER,
      })

      expect(error).not.toBeNull()
    })
  })

  describe("what a token is worth to whoever holds it", () => {
    it("does not let the holder read the invitation row", async () => {
      const token = await mintInvitation()

      const { data } = await solo
        .from("tenant_invitations")
        .select("*")
        .eq("token", token)

      // SELECT is staff-only. The claim RPC is definer and reads the row
      // itself, so a token grants the ability to spend it and nothing else.
      expect(data).toEqual([])
    })

    it("does not let a customer of the venue enumerate live tokens", async () => {
      await mintInvitation()

      const { data } = await couple.from("tenant_invitations").select("*")

      // `is_tenant_staff` excludes 'customer' - each row here is a bearer
      // credential, and a couple married at the venue is not staff.
      expect(data).toEqual([])
    })

    it("joins the tenant when claimed by its recipient", async () => {
      const token = await mintInvitation()

      const { data, error } = await solo.rpc("claim_tenant_invitation", {
        _token: token,
      })

      expect(error).toBeNull()
      expect(data).toBe(BAGATELKA)

      const { data: rows } = await solo
        .from("tenant_members")
        .select("tenant_id, role")
        .eq("user_id", SOLO_USER)

      expect(rows).toEqual([{ tenant_id: BAGATELKA, role: "customer" }])
    })

    it("burns the token, so a second claim fails", async () => {
      const token = await mintInvitation()
      await solo.rpc("claim_tenant_invitation", { _token: token })
      await solo.from("tenant_members").delete().eq("user_id", SOLO_USER)

      const { error } = await solo.rpc("claim_tenant_invitation", {
        _token: token,
      })

      expect(error?.code).toBe("PT404")
    })

    it("refuses an unknown token with the same code as a spent one", async () => {
      const { error } = await solo.rpc("claim_tenant_invitation", {
        _token: "no-such-token",
      })

      expect(error?.code).toBe("PT404")
    })

    it("refuses an account that already belongs to another venue", async () => {
      const token = await mintInvitation()

      const { error } = await otherVenue.rpc("claim_tenant_invitation", {
        _token: token,
      })

      // Distinct from PT404 on purpose: retrying cannot fix it, and only this
      // code lets the client say why.
      expect(error?.code).toBe("PT409")
    })

    it("leaves an existing membership of the same tenant untouched", async () => {
      // `couple` is already a 'customer' of bagatelka. Claiming again must not
      // change the role, and must not spend the invitation.
      const token = await mintInvitation()

      const { error } = await couple.rpc("claim_tenant_invitation", {
        _token: token,
      })

      expect(error).toBeNull()

      const { data: rows } = await couple
        .from("tenant_members")
        .select("role")
        .eq("user_id", COUPLE_USER)
      expect(rows).toEqual([{ role: "customer" }])

      const { data: invite } = await venue
        .from("tenant_invitations")
        .select("claimed_at")
        .eq("token", token)
        .single()
      expect(invite?.claimed_at).toBeNull()
    })
  })

  describe("what the claimed membership unlocks", () => {
    it("lets the couple link to the invitation-only venue", async () => {
      // The gap this whole migration closes: before it, `bagatelka` has
      // open_linking = false and nothing could write the tenant_members row
      // that link_wedding_to_venue looks for, so this call returned PT403.
      const before = await solo.rpc("link_wedding_to_venue", {
        p_wedding_id: SOLO_WEDDING,
        p_slug: "bagatelka",
      })
      expect(before.error?.code).toBe("PT403")

      await solo.rpc("claim_tenant_invitation", {
        _token: await mintInvitation(),
      })

      const after = await solo.rpc("link_wedding_to_venue", {
        p_wedding_id: SOLO_WEDDING,
        p_slug: "bagatelka",
      })
      expect(after.error).toBeNull()
      expect(after.data).toBe(BAGATELKA)

      // Linking alone still discloses nothing - the wedding lands in 'pending',
      // and the derived 'venue' role requires 'granted'.
      const { data: peek } = await venue
        .from("weddings")
        .select("id")
        .eq("id", SOLO_WEDDING)
      expect(peek).toEqual([])
    })

    it("does not make the couple staff", async () => {
      await solo.rpc("claim_tenant_invitation", {
        _token: await mintInvitation(),
      })

      // A 'customer' reaches none of the CRM. The roster is the sharpest test:
      // the SELECT policy is `is_tenant_staff(tenant_id) or user_id =
      // auth.uid()`, so they see exactly their own row and nobody else's.
      const { data } = await solo.from("tenant_members").select("user_id")

      expect(data).toEqual([{ user_id: SOLO_USER }])
    })

    it("lets staff read the display name of someone who joined", async () => {
      const bare = await venue.from("profiles").select("id").eq("id", SOLO_USER)
      expect(bare.data).toEqual([])

      await solo.rpc("claim_tenant_invitation", {
        _token: await mintInvitation(),
      })

      const { data } = await venue
        .from("profiles")
        .select("id, display_name")
        .eq("id", SOLO_USER)

      // The roster screen needs this, and it is exactly the disclosure the
      // couple consented to by claiming - which is why the claim is theirs to
      // make and not the venue's.
      expect(data).toEqual([
        { id: SOLO_USER, display_name: "Tomasz Zielinski" },
      ])
    })

    it("lets the member leave again", async () => {
      await solo.rpc("claim_tenant_invitation", {
        _token: await mintInvitation(),
      })

      // `.select()` because a DELETE that RLS filters to nothing comes back a
      // clean 204 - the same trap useWeddingMembers documents. Asserting the
      // returned row is what makes this a test of the policy.
      const { data, error } = await solo
        .from("tenant_members")
        .delete()
        .eq("user_id", SOLO_USER)
        .select("user_id")

      expect(error).toBeNull()
      expect(data).toEqual([{ user_id: SOLO_USER }])
    })

    it("does not let a member delete an owner row", async () => {
      await solo.rpc("claim_tenant_invitation", {
        _token: await mintInvitation(),
      })

      const { data } = await solo
        .from("tenant_members")
        .delete()
        .eq("tenant_id", BAGATELKA)
        .neq("user_id", SOLO_USER)
        .select("user_id")

      // Both policies that admit a DELETE exclude 'owner', and a customer
      // matches neither for anyone else's row. Filtered to nothing.
      expect(data).toEqual([])
    })
  })

  describe("who may invite whom", () => {
    // Through the helper, so the row this one *succeeds* in creating carries a
    // prefixed token and afterEach reaps it. The refusals below can insert
    // directly - a row that was never written needs no cleanup.
    it("lets the owner create a staff invitation", async () => {
      await expect(mintInvitation("staff")).resolves.toMatch(TEST_TOKEN_PREFIX)
    })

    it("refuses an owner invitation outright", async () => {
      // The generated type widens `role` to plain `string` - Postgres CHECKs do
      // not survive into the schema types - so this is a runtime assertion, not
      // a compile-time one, and the constraint is the only thing refusing it.
      const { error } = await venue.from("tenant_invitations").insert({
        tenant_id: BAGATELKA,
        role: "owner",
        invited_by: venueUserId,
      })

      expect(error).not.toBeNull()
    })

    it("keeps invitations of one tenant out of another's list", async () => {
      const token = await mintInvitation()

      const { data } = await otherVenue
        .from("tenant_invitations")
        .select("token")

      expect(data?.some((row) => row.token === token)).toBe(false)
    })
  })

  it("does not disturb the seeded venue peek", async () => {
    // The two suites share a database and `dworek` is the isolation control in
    // both. Cheap guard that nothing here leaked into venueRls.test.ts.
    const { data } = await otherVenue.from("weddings").select("id")
    expect(data).toEqual([])
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
