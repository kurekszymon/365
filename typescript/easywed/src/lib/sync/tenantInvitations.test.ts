import { createClient } from "@supabase/supabase-js"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase.types"

/**
 * The tenant invitation flow, asserted against a real PostgreSQL with real RLS.
 *
 * The sibling of venueRls.test.ts. "A venue cannot put a stranger on its roster"
 * and "an invitation is spent by the person it names, not by the venue" are
 * enforced by an absent INSERT policy and a definer function, which no type or
 * comment can hold.
 *
 * The regression it guards is 20260817000001 section 4's: an INSERT policy on
 * `tenant_members` letting staff name any uuid hands that account's display name
 * to the venue, permanently bars it from every other venue, and makes its
 * weddings attachable. Re-adding one turns several of these red.
 *
 * Skipped, not failed, when the local stack is down - see venueRls.test.ts.
 *
 * Fixtures come from supabase/seed.sql: `bagatelka` is invitation-only,
 * `dworek` is open, `stodola` is suspended, and solo@, editor@ and viewer@ are
 * in no tenant. solo@ is the one this suite moves between tenants; editor@ is
 * only ever asserted *not* to join, because layoutPresetsRls.test.ts relies on
 * them being in none and the suites share a database concurrently.
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_KEY ?? import.meta.env.VITE_SUPABASE_KEY

const BAGATELKA = "50000000-0000-4000-8000-000000000001"
const DWOREK = "50000000-0000-4000-8000-000000000002"
// "Anna & Piotr": owned by owner@, editor@ is a member, granted to bagatelka.
const COUPLE_WEDDING = "20000000-0000-4000-8000-000000000001"
const EDITOR_USER = "10000000-0000-4000-8000-000000000002"
// solo@easywed.test, who belongs to no tenant and owns "Tomasz & Kasia".
const SOLO_USER = "10000000-0000-4000-8000-000000000004"
const SOLO_WEDDING = "20000000-0000-4000-8000-000000000002"
// owner@easywed.test, already a 'customer' of bagatelka.
const COUPLE_USER = "10000000-0000-4000-8000-000000000001"
const PASSWORD = "password123"

/**
 * Prefix for every token these tests mint, and the whole cleanup strategy.
 *
 * The seeded `seed-live-customer-invite` is left alone: claiming it burns it,
 * and `tenant_invitations` has no UPDATE policy, so a second run would find
 * every claim returning PT404. That token is for clicking through the flow in a
 * browser; the suite mints its own.
 *
 * Hex, and sixteen characters of it, because the INSERT policy pins the token to
 * `^[0-9a-f]{64}$`. A marker this long is what keeps the `like` cleanup from
 * ever matching a real invitation.
 */
const TEST_TOKEN_PREFIX = "7e577e577e577e57"

/** That prefix plus a counter, padded out to the 64 hex characters required. */
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

describe.skipIf(!reachable)("tenant invitations", () => {
  // Owner of `bagatelka`.
  let venue: SupabaseClient<Database>
  // Owner of `dworek`, the isolation control.
  let otherVenue: SupabaseClient<Database>
  // In no tenant at seed time, which is what makes them claimable.
  let solo: SupabaseClient<Database>
  // Already a 'customer' of bagatelka.
  let couple: SupabaseClient<Database>
  // Editor - not owner - of "Anna & Piotr", in no tenant: the wrong partner.
  let editor: SupabaseClient<Database>

  let venueUserId: string
  let otherVenueUserId: string
  let tokenSeq = 0

  /**
   * A live `customer` invitation to `bagatelka`, minted by its owner. The token
   * is supplied rather than left to the column default so cleanup can match on
   * it.
   */
  const mintInvitation = async (
    role: "customer" | "staff" = "customer"
  ): Promise<string> => {
    const token = testToken(++tokenSeq)
    const { error } = await venue.from("tenant_invitations").insert({
      tenant_id: BAGATELKA,
      role,
      token,
      invited_by: venueUserId,
    })
    if (error) throw error
    return token
  }

  /** The same, minted by `dworek`'s owner - the "other venue" of a switch. */
  const mintDworekInvitation = async (): Promise<string> => {
    const token = testToken(++tokenSeq)
    const { error } = await otherVenue.from("tenant_invitations").insert({
      tenant_id: DWOREK,
      role: "customer",
      token,
      invited_by: otherVenueUserId,
    })
    if (error) throw error
    return token
  }

  /** Whether a token is still unspent, read as the venue that issued it. */
  const claimedAt = async (
    issuer: SupabaseClient<Database>,
    token: string
  ): Promise<string | null> => {
    const { data, error } = await issuer
      .from("tenant_invitations")
      .select("claimed_at")
      .eq("token", token)
      .single()
    if (error) throw error
    return data.claimed_at
  }

  /**
   * A wedding of the caller's own that nothing else reads, deleted by the
   * returned function. Never the seeded ones: venueRls.test.ts and
   * menuRls.test.ts assert their link state concurrently.
   *
   * The id is generated here rather than read back with `.insert().select()`,
   * which RLS refuses until the AFTER trigger has written the owner's
   * `wedding_members` row (the gotcha in CLAUDE.md).
   */
  const scratchWedding = async (
    owner: SupabaseClient<Database>
  ): Promise<{ id: string; drop: () => Promise<void> }> => {
    const id = crypto.randomUUID()
    // From the client's own session rather than `auth.getUser()`, which is a
    // round trip to the auth server per call and nothing this needs.
    const ownerId = (await owner.auth.getSession()).data.session!.user.id
    const { error } = await owner
      .from("weddings")
      .insert({ id, owner_id: ownerId, name: "Invite accept probe" })
    if (error) throw error
    return {
      id,
      drop: async () => {
        await owner.from("weddings").delete().eq("id", id)
      },
    }
  }

  const weddingLink = async (
    reader: SupabaseClient<Database>,
    weddingId: string
  ) => {
    const { data, error } = await reader
      .from("weddings")
      .select("tenant_id, venue_access, menu_package_id")
      .eq("id", weddingId)
      .single()
    if (error) throw error
    return data
  }

  beforeAll(async () => {
    ;[venue, otherVenue, solo, couple, editor] = await Promise.all([
      signIn("venue@easywed.test"),
      signIn("venue2@easywed.test"),
      signIn("solo@easywed.test"),
      signIn("owner@easywed.test"),
      signIn("editor@easywed.test"),
    ])
    venueUserId = (await venue.auth.getUser()).data.user!.id
    otherVenueUserId = (await otherVenue.auth.getUser()).data.user!.id
  })

  // Every test puts the fixture back, so the suite does not need a freshly reset
  // database: `solo` leaves whatever tenant they joined, and every minted
  // invitation is dropped, claimed or not.
  //
  // One residue is deliberately *not* undone: the linking test points "Tomasz &
  // Kasia" at `bagatelka` in 'pending', and nothing a client can call unlinks a
  // wedding (`enforce_wedding_tenant_columns` makes both columns unwritable, and
  // link_wedding_to_venue has no inverse). Harmless on a re-run - the derived
  // 'venue' role requires 'granted', so venueRls.test.ts still holds, and the
  // PT403 it asserts comes from solo's membership being gone.
  afterEach(async () => {
    await solo.from("tenant_members").delete().eq("user_id", SOLO_USER)
    await Promise.all(
      [venue, otherVenue].map((issuer) =>
        issuer
          .from("tenant_invitations")
          .delete()
          .like("token", `${TEST_TOKEN_PREFIX}%`)
      )
    )
  })

  describe("what a venue cannot do to a stranger", () => {
    it("cannot insert a tenant_members row directly", async () => {
      const { error } = await venue
        .from("tenant_members")
        .insert({ tenant_id: BAGATELKA, user_id: SOLO_USER, role: "customer" })

      // The absence of an INSERT policy is the guarantee (20260817000001 §4).
      // RLS refuses the write rather than filtering it, so unlike a SELECT this
      // really is an error and not an empty result.
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

  describe("a suspended venue", () => {
    // Seeded rather than minted: `status` is unwritable from the client, and
    // the INSERT policy would refuse nothing here anyway - suspension is not
    // checked there. The row is never spent, so it survives every run.
    const SUSPENDED_TOKEN = "seed-suspended-customer-invite"

    it("refuses a claim with PT410", async () => {
      const { error } = await solo.rpc("claim_tenant_invitation", {
        _token: SUSPENDED_TOKEN,
      })
      expect(error?.code).toBe("PT410")
    })

    it("refuses an accept with PT410, and leaves the token live", async () => {
      const { error } = await solo.rpc("accept_customer_invitation", {
        _token: SUSPENDED_TOKEN,
        _wedding_id: SOLO_WEDDING,
      })
      expect(error?.code).toBe("PT410")

      // Still previewable, which is only true of an unspent token.
      const { data } = await solo.rpc("tenant_invitation_preview", {
        _token: SUSPENDED_TOKEN,
      })
      expect(data).toHaveLength(1)
    })
  })

  describe("tenant_invitation_preview", () => {
    it("names the venue and role to a signed-out visitor", async () => {
      const token = await mintInvitation()

      // `client()` with no sign-in is the anon role - the visitor who has not
      // created an account yet.
      const { data, error } = await client().rpc("tenant_invitation_preview", {
        _token: token,
      })

      expect(error).toBeNull()
      expect(data).toEqual([
        expect.objectContaining({
          role: "customer",
          tenant_slug: "bagatelka",
          tenant_name: "Sala Bagatelka",
          tenant_status: "active",
        }),
      ])
    })

    it("projects exactly the venue's public face", async () => {
      const token = await mintInvitation()
      const { data } = await client().rpc("tenant_invitation_preview", {
        _token: token,
      })

      // Pinned, so `label` (staff's note about the recipient), `invited_by` or
      // the tenant id can only arrive by a deliberate edit of this line.
      expect(Object.keys(data![0]).sort()).toEqual([
        "expires_at",
        "logo_url",
        "primary_color",
        "role",
        "tenant_name",
        "tenant_slug",
        "tenant_status",
      ])
    })

    it.each([
      ["unknown", "no-such-token"],
      ["claimed", "seed-claimed-customer-invite"],
      ["expired", "seed-expired-customer-invite"],
    ])("returns nothing for an %s token", async (_label, token) => {
      const { data, error } = await client().rpc("tenant_invitation_preview", {
        _token: token,
      })
      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it("still names a suspended venue, with its status", async () => {
      const { data } = await client().rpc("tenant_invitation_preview", {
        _token: "seed-suspended-customer-invite",
      })
      expect(data).toEqual([
        expect.objectContaining({
          tenant_slug: "stodola",
          tenant_status: "suspended",
        }),
      ])
    })
  })

  describe("accept_customer_invitation", () => {
    it("joins and links in one call, and spends the token", async () => {
      const token = await mintInvitation()
      const wedding = await scratchWedding(solo)

      try {
        const { data, error } = await solo.rpc("accept_customer_invitation", {
          _token: token,
          _wedding_id: wedding.id,
        })

        expect(error).toBeNull()
        expect(data).toBe(BAGATELKA)

        const { data: rows } = await solo
          .from("tenant_members")
          .select("tenant_id, role")
          .eq("user_id", SOLO_USER)
        expect(rows).toEqual([{ tenant_id: BAGATELKA, role: "customer" }])

        // 'pending' - accepting is not the art. 9 consent; that stays a
        // separate set_venue_access(true).
        expect(await weddingLink(solo, wedding.id)).toMatchObject({
          tenant_id: BAGATELKA,
          venue_access: "pending",
        })
        expect(await claimedAt(venue, token)).not.toBeNull()
      } finally {
        await wedding.drop()
      }
    })

    it("refuses the editor partner without spending the token", async () => {
      // The case the function exists for: before it, the claim succeeded and
      // burned the link for someone link_wedding_to_venue would then refuse.
      const token = await mintInvitation()

      const { error } = await editor.rpc("accept_customer_invitation", {
        _token: token,
        _wedding_id: COUPLE_WEDDING,
      })

      expect(error?.code).toBe("42501")
      expect(await claimedAt(venue, token)).toBeNull()

      const { data: rows } = await editor
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", EDITOR_USER)
      expect(rows).toEqual([])
    })

    it("refuses a wedding the caller does not own", async () => {
      const token = await mintInvitation()

      const { error } = await solo.rpc("accept_customer_invitation", {
        _token: token,
        _wedding_id: COUPLE_WEDDING,
      })

      expect(error?.code).toBe("42501")
      expect(await claimedAt(venue, token)).toBeNull()
    })

    it("refuses a staff token as if it were unknown", async () => {
      const token = await mintInvitation("staff")

      const { error } = await solo.rpc("accept_customer_invitation", {
        _token: token,
        _wedding_id: SOLO_WEDDING,
      })

      expect(error?.code).toBe("PT404")
      expect(await claimedAt(venue, token)).toBeNull()
    })

    it("refuses a signed-out caller", async () => {
      const token = await mintInvitation()

      const { error } = await client().rpc("accept_customer_invitation", {
        _token: token,
        _wedding_id: SOLO_WEDDING,
      })

      expect(error).not.toBeNull()
      expect(await claimedAt(venue, token)).toBeNull()
    })

    it("links an existing customer without spending the token", async () => {
      // owner@ is bagatelka's customer already. Same rule as the claim: the
      // link stays live for whoever it was actually meant for.
      const token = await mintInvitation()
      const wedding = await scratchWedding(couple)

      try {
        const { error } = await couple.rpc("accept_customer_invitation", {
          _token: token,
          _wedding_id: wedding.id,
        })

        expect(error).toBeNull()
        expect(await weddingLink(couple, wedding.id)).toMatchObject({
          tenant_id: BAGATELKA,
          venue_access: "pending",
        })
        expect(await claimedAt(venue, token)).toBeNull()

        const { data: rows } = await couple
          .from("tenant_members")
          .select("role")
          .eq("user_id", COUPLE_USER)
        expect(rows).toEqual([{ role: "customer" }])
      } finally {
        await wedding.drop()
      }
    })

    it("leaves a wedding already granted to this venue granted", async () => {
      // The same-venue no-op inside link_wedding_to_venue, reached through the
      // new door. A reset here would revoke a live grant and wipe a chosen menu.
      const before = await weddingLink(couple, COUPLE_WEDDING)
      expect(before.venue_access).toBe("granted")

      const { error } = await couple.rpc("accept_customer_invitation", {
        _token: await mintInvitation(),
        _wedding_id: COUPLE_WEDDING,
      })

      expect(error).toBeNull()
      expect(await weddingLink(couple, COUPLE_WEDDING)).toEqual(before)
    })

    describe("switching venue", () => {
      it("asks first (PT412) and changes nothing", async () => {
        const wedding = await scratchWedding(solo)

        try {
          await solo.rpc("accept_customer_invitation", {
            _token: await mintInvitation(),
            _wedding_id: wedding.id,
          })
          const dworekToken = await mintDworekInvitation()

          const { error } = await solo.rpc("accept_customer_invitation", {
            _token: dworekToken,
            _wedding_id: wedding.id,
          })

          expect(error?.code).toBe("PT412")
          expect(await claimedAt(otherVenue, dworekToken)).toBeNull()
          expect(await weddingLink(solo, wedding.id)).toMatchObject({
            tenant_id: BAGATELKA,
          })

          const { data: rows } = await solo
            .from("tenant_members")
            .select("tenant_id")
            .eq("user_id", SOLO_USER)
          expect(rows).toEqual([{ tenant_id: BAGATELKA }])
        } finally {
          await wedding.drop()
        }
      })

      it("swaps the membership and re-links only the named wedding", async () => {
        const first = await scratchWedding(solo)
        const second = await scratchWedding(solo)

        try {
          for (const w of [first, second]) {
            await solo.rpc("accept_customer_invitation", {
              _token: await mintInvitation(),
              _wedding_id: w.id,
            })
          }
          const dworekToken = await mintDworekInvitation()

          const { data, error } = await solo.rpc("accept_customer_invitation", {
            _token: dworekToken,
            _wedding_id: second.id,
            _leave_current: true,
          })

          expect(error).toBeNull()
          expect(data).toBe(DWOREK)

          const { data: rows } = await solo
            .from("tenant_members")
            .select("tenant_id, role")
            .eq("user_id", SOLO_USER)
          expect(rows).toEqual([{ tenant_id: DWOREK, role: "customer" }])

          expect(await weddingLink(solo, second.id)).toMatchObject({
            tenant_id: DWOREK,
            venue_access: "pending",
            menu_package_id: null,
          })
          // Leaving a venue is not unlinking from it: membership and the
          // wedding link are separate decisions (20260820000001 §3).
          expect(await weddingLink(solo, first.id)).toMatchObject({
            tenant_id: BAGATELKA,
          })
          expect(await claimedAt(otherVenue, dworekToken)).not.toBeNull()
        } finally {
          await Promise.all([first.drop(), second.drop()])
        }
      })

      it("never swaps away a staff membership", async () => {
        const wedding = await scratchWedding(solo)

        try {
          await solo.rpc("claim_tenant_invitation", {
            _token: await mintInvitation("staff"),
          })
          const dworekToken = await mintDworekInvitation()

          const { error } = await solo.rpc("accept_customer_invitation", {
            _token: dworekToken,
            _wedding_id: wedding.id,
            _leave_current: true,
          })

          expect(error?.code).toBe("PT409")
          expect(await claimedAt(otherVenue, dworekToken)).toBeNull()

          const { data: rows } = await solo
            .from("tenant_members")
            .select("tenant_id, role")
            .eq("user_id", SOLO_USER)
          expect(rows).toEqual([{ tenant_id: BAGATELKA, role: "staff" }])
        } finally {
          await wedding.drop()
        }
      })
    })
  })

  describe("invitation labels", () => {
    const insertWithLabel = (label: string) =>
      venue.from("tenant_invitations").insert({
        tenant_id: BAGATELKA,
        role: "customer",
        token: testToken(++tokenSeq),
        invited_by: venueUserId,
        label,
      })

    it("stores a label for staff to read back", async () => {
      const { error } = await insertWithLabel("Kowalscy, 12.06")
      expect(error).toBeNull()

      const { data } = await venue
        .from("tenant_invitations")
        .select("label")
        .eq("label", "Kowalscy, 12.06")
      expect(data).toEqual([{ label: "Kowalscy, 12.06" }])
    })

    it.each([
      ["empty", ""],
      ["over 80 characters", "x".repeat(81)],
    ])("refuses an %s label", async (_case, label) => {
      const { error } = await insertWithLabel(label)
      expect(error?.code).toBe("23514")
    })
  })

  describe("what the claimed membership unlocks", () => {
    it("lets the couple link to the invitation-only venue", async () => {
      // The gap the migration closes: `bagatelka` has open_linking = false, and
      // before it nothing could write the tenant_members row that
      // link_wedding_to_venue looks for, so this call returned PT403.
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

    /**
     * Why `fetchTenantRole` takes a `userId`: for a *staff* claimer the first
     * disjunct fires, so the same unfiltered select returns the venue's whole
     * roster. Reading "my role" without the `user_id` filter gets multiple rows,
     * which `.maybeSingle()` reports as an error - and a fail-closed fallback
     * then renders a fresh staff member as a customer.
     */
    it("shows a staff claimer the whole roster, not just their row", async () => {
      await solo.rpc("claim_tenant_invitation", {
        _token: await mintInvitation("staff"),
      })

      const { data } = await solo
        .from("tenant_members")
        .select("user_id")
        .eq("tenant_id", BAGATELKA)

      expect(data!.length).toBeGreaterThan(1)

      // Filtering on both columns is what makes the read answer the question
      // the caller actually asked.
      const own = await solo
        .from("tenant_members")
        .select("role")
        .eq("tenant_id", BAGATELKA)
        .eq("user_id", SOLO_USER)
        .maybeSingle()

      expect(own.error).toBeNull()
      expect(own.data).toEqual({ role: "staff" })
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

      // The roster screen needs this, and it is the disclosure the couple
      // consented to by claiming - which is why the claim is theirs to make.
      expect(data).toEqual([
        { id: SOLO_USER, display_name: "Tomasz Zielinski" },
      ])
    })

    it("lets the member leave again", async () => {
      await solo.rpc("claim_tenant_invitation", {
        _token: await mintInvitation(),
      })

      // `.select()` because a DELETE that RLS filters to nothing comes back a
      // clean 204; asserting the returned row is what tests the policy.
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
      // The generated type widens `role` to plain `string`, since Postgres CHECKs
      // do not survive into the schema types, so the constraint is the only
      // thing refusing this.
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

  /**
   * The columns the INSERT policy has to pin, one test each.
   *
   * Each is `bagatelka`'s own owner writing into `bagatelka`'s own table, so the
   * three columns the policy originally constrained are all correct. What is
   * asserted is that being allowed to insert *a* row is not being allowed to
   * insert *any* row: a `with check` says nothing about the columns it does not
   * name, and defaults are defaults rather than guarantees.
   *
   * All five are refusals, so none leaves a row for `afterEach` to reap.
   */
  describe("the columns an inserter must not choose", () => {
    const forge = async (row: Record<string, unknown>) => {
      const { error } = await venue.from("tenant_invitations").insert({
        tenant_id: BAGATELKA,
        role: "customer",
        invited_by: venueUserId,
        ...row,
      } as never)
      return error
    }

    it("refuses an invitation minted already claimed", async () => {
      // The forgery worth naming: a row reading "this account joined on that
      // date", about someone who never clicked anything. `claimed_by` is an
      // `auth.users` FK, so the forger picks whose acceptance to fabricate.
      const error = await forge({
        claimed_at: new Date().toISOString(),
        claimed_by: SOLO_USER,
      })

      expect(error?.code).toBe("42501")
    })

    it("refuses a claimed_at with no claimer", async () => {
      const error = await forge({ claimed_at: new Date().toISOString() })
      expect(error?.code).toBe("42501")
    })

    it("refuses a claimed_by with no timestamp", async () => {
      const error = await forge({ claimed_by: SOLO_USER })
      expect(error?.code).toBe("42501")
    })

    it("refuses an invitation that would outlive the bound", async () => {
      const error = await forge({
        expires_at: new Date("2099-01-01T00:00:00Z").toISOString(),
      })

      expect(error?.code).toBe("42501")
    })

    it("refuses an invitation born expired", async () => {
      // Not an attack - a support ticket. A link that never worked, and no
      // message that says why.
      const error = await forge({
        expires_at: new Date(Date.now() - 60_000).toISOString(),
      })

      expect(error?.code).toBe("42501")
    })

    it("refuses a chosen token", async () => {
      // A token's entire security is that nobody who was not sent it can guess
      // it, and `guess-me` is as good as no token.
      const error = await forge({ token: "guess-me" })
      expect(error?.code).toBe("42501")
    })

    it("still accepts a row that takes every default", async () => {
      // The hardening must not break the only insert the application makes:
      // `useTenantRoster` sends these three columns and nothing else.
      const { data, error } = await venue
        .from("tenant_invitations")
        .insert({
          tenant_id: BAGATELKA,
          role: "customer",
          invited_by: venueUserId,
        })
        .select("token, expires_at, claimed_at, claimed_by")
        .single()

      expect(error).toBeNull()
      expect(data!.token).toMatch(/^[0-9a-f]{64}$/)
      expect(data!.claimed_at).toBeNull()
      expect(data!.claimed_by).toBeNull()

      await venue.from("tenant_invitations").delete().eq("token", data!.token)
    })
  })

  it("does not disturb the seeded venue peek", async () => {
    // The suites share a database and `dworek` is the isolation control in both,
    // so this guards against anything here leaking into venueRls.test.ts.
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
