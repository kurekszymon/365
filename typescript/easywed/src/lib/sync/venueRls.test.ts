import { createClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase.types"

/**
 * The venue role's access matrix, asserted against a real PostgreSQL with real
 * RLS - not against types, and not against a mock.
 *
 * The acceptance gate for 20260817000003. "The venue sees the room and never
 * sees the people" is a *policy* claim, which no type, comment or client can
 * hold; two signed-in PostgREST clients and a set of row counts can.
 *
 * Skipped, not failed, when the local stack is down: `supabase start` is not a
 * prerequisite for `pnpm test`, and a red suite on a laptop with no Docker
 * teaches people to ignore red suites.
 *
 * Fixtures come from supabase/seed.sql. "Anna & Piotr" is linked to `bagatelka`
 * and granted; "Tomasz & Kasia" is linked to nothing; `dworek` is a second
 * tenant with no weddings at all.
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_KEY ?? import.meta.env.VITE_SUPABASE_KEY

const GRANTED_WEDDING = "20000000-0000-4000-8000-000000000001"
const UNLINKED_WEDDING = "20000000-0000-4000-8000-000000000002"
const BAGATELKA = "50000000-0000-4000-8000-000000000001"
// solo@easywed.test, who belongs to no tenant.
const SOLO_USER = "10000000-0000-4000-8000-000000000004"
const PASSWORD = "password123"

// For the seat map's `menu_option_id`: what makes that column safe is that it
// is a key into the venue's own catalogue rather than a label, so the shape is
// the thing worth asserting.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

describe.skipIf(!reachable)("venue RLS matrix", () => {
  // Staff of `bagatelka`, which "Anna & Piotr" granted.
  let venue: SupabaseClient<Database>
  // Staff of `dworek`, which granted nothing and was granted nothing.
  let otherVenue: SupabaseClient<Database>
  // The couple who own "Anna & Piotr" - the only account that can grant.
  // Explicitly optional, because afterAll runs even when beforeAll threw.
  let couple: SupabaseClient<Database> | undefined
  // solo@easywed.test: owns "Tomasz & Kasia", belongs to no tenant. The owner
  // of an *unlinked* wedding, which is a state only they can ask about.
  let solo: SupabaseClient<Database>

  beforeAll(async () => {
    ;[venue, otherVenue, couple, solo] = await Promise.all([
      signIn("venue@easywed.test"),
      signIn("venue2@easywed.test"),
      signIn("owner@easywed.test"),
      signIn("solo@easywed.test"),
    ])
  })

  afterAll(async () => {
    // The revocation test restores the grant itself; this catches a failure
    // between the two, so one red run does not make every later run red.
    if (couple)
      await couple.rpc("set_venue_access", {
        p_wedding_id: GRANTED_WEDDING,
        p_granted: true,
      })
  })

  describe("what a granted venue cannot read", () => {
    it("gets zero guest rows", async () => {
      const { data, error } = await venue
        .from("guests")
        .select("*")
        .eq("wedding_id", GRANTED_WEDDING)

      // Not an error: RLS filters rather than refuses, which is why this has to
      // be asserted rather than assumed from a 403 never arriving.
      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it("gets zero reminder rows", async () => {
      const { data, error } = await venue
        .from("reminders")
        .select("*")
        .eq("wedding_id", GRANTED_WEDDING)

      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it("gets zero member rows", async () => {
      const { data, error } = await venue
        .from("wedding_members")
        .select("*")
        .eq("wedding_id", GRANTED_WEDDING)

      expect(error).toBeNull()
      expect(data).toEqual([])
    })
  })

  describe("what a granted venue can read", () => {
    it("sees the wedding itself", async () => {
      const { data, error } = await venue
        .from("weddings")
        .select("id, name, date")
        .eq("id", GRANTED_WEDDING)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
    })

    it("sees halls, tables and fixtures", async () => {
      const [halls, tables, fixtures] = await Promise.all([
        venue.from("halls").select("id").eq("wedding_id", GRANTED_WEDDING),
        venue.from("tables").select("id").eq("wedding_id", GRANTED_WEDDING),
        venue.from("fixtures").select("id").eq("wedding_id", GRANTED_WEDDING),
      ])

      expect(halls.data?.length).toBeGreaterThan(0)
      expect(tables.data?.length).toBeGreaterThan(0)
      expect(fixtures.data?.length).toBeGreaterThan(0)
    })

    it("sees seat rows with no name key and no note key at all", async () => {
      // `select("*")` on purpose: naming the columns would ask the view for a
      // projection we already believe in. The star makes this an assertion about
      // the *view*, so a `name` column added later fails here.
      const { data, error } = await venue
        .from("wedding_seatmap")
        .select("*")
        .eq("wedding_id", GRANTED_WEDDING)

      expect(error).toBeNull()
      expect(data?.length).toBeGreaterThan(0)

      for (const row of data ?? []) {
        // Key absence, not value absence, and the difference is the point:
        // `expect(row.name).toBeUndefined()` also passes against a view
        // returning `name: null`, which would mean the column exists and is one
        // projection change from being populated.
        expect(Object.keys(row)).not.toContain("name")
        expect(Object.keys(row)).not.toContain("note")
        expect(row).not.toHaveProperty("name")
        expect(row).not.toHaveProperty("note")

        // The per-guest dish, added by 20260822000003. A **uuid or null** is the
        // assertion: a foreign key into the venue's own catalogue, so unlike
        // `dietary` and `age_group` it cannot carry a name somebody typed. Fails
        // the moment anyone joins the dish label into the projection.
        expect(Object.keys(row)).toContain("menu_option_id")
        expect(
          row.menu_option_id === null || UUID_RE.test(row.menu_option_id)
        ).toBe(true)

        // The assertions above only forbid two names, so any third column could
        // be added silently. Pinning the whole set makes every change to the
        // projection a deliberate edit to this file.
        expect(new Set(Object.keys(row))).toEqual(
          new Set([
            "id",
            "wedding_id",
            "table_id",
            "seat_id",
            "dietary",
            "age_group",
            "menu_option_id",
          ])
        )
      }
    })
  })

  describe("the venue role is read-only", () => {
    it("cannot update a table it can read", async () => {
      const { data: tables } = await venue
        .from("tables")
        .select("id, name")
        .eq("wedding_id", GRANTED_WEDDING)
        .limit(1)

      const target = tables?.[0]
      expect(target).toBeDefined()

      // `.select()` back is what makes this meaningful: an UPDATE RLS filters to
      // nothing answers 204, which supabase-js reports as a clean success, so
      // the returned rows are the only evidence either way.
      const { data, error } = await venue
        .from("tables")
        .update({ name: "venue wrote this" })
        .eq("id", target!.id)
        .select()

      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it("cannot insert a hall", async () => {
      const { error } = await venue.from("halls").insert({
        id: crypto.randomUUID(),
        wedding_id: GRANTED_WEDDING,
        name: "venue hall",
        preset: "rectangle",
        width: 5,
        height: 5,
        pos_x: 0,
        pos_y: 0,
      })

      // INSERT has no rows to filter, so RLS refuses outright.
      expect(error?.code).toBe("42501")
    })

    it("cannot grant itself access", async () => {
      const { error } = await venue.rpc("set_venue_access", {
        p_wedding_id: GRANTED_WEDDING,
        p_granted: true,
      })

      // The art. 9(2)(a) consent belongs to the couple. A venue that could
      // call this with `true` would be consenting on the data subject's
      // behalf, and privacy.venue.optin says in writing that it cannot.
      expect(error).not.toBeNull()
    })
  })

  describe("what a venue cannot decide about a person", () => {
    it("cannot enrol an account as one of its members", async () => {
      // What may a venue do to someone who has agreed to nothing?
      //
      // `tenant_members` carried a "staff can add members" INSERT policy, so any
      // account a venue could name by uuid became its 'customer' on the venue's
      // say-so: that row disclosed the person's profiles.display_name (via
      // staff_can_view_profile), barred them from every other venue
      // (tenant_members_one_per_user is unique), and satisfied the
      // invitation-only gate in link_wedding_to_venue. A re-added INSERT policy
      // fails here.
      const { error } = await venue.from("tenant_members").insert({
        tenant_id: BAGATELKA,
        // solo@easywed.test: a real account with no connection to this venue,
        // and not already a member of one - so a refusal here is RLS, not the
        // one-tenant-per-user index answering first.
        user_id: SOLO_USER,
        role: "customer",
      })

      // INSERT has nothing to filter, so RLS refuses outright rather than
      // silently writing nothing.
      expect(error?.code).toBe("42501")
    })
  })

  describe("isolation", () => {
    it("reaches nothing belonging to a wedding it was not granted", async () => {
      const [weddings, halls, seatmap] = await Promise.all([
        venue.from("weddings").select("id").eq("id", UNLINKED_WEDDING),
        venue.from("halls").select("id").eq("wedding_id", UNLINKED_WEDDING),
        venue
          // `menu_option_id` named explicitly, here and in the two blocks below:
          // every "reaches nothing" assertion has to cover the newest column the
          // seat map carries, not only the ones that predate it.
          .from("wedding_seatmap")
          .select("id, menu_option_id")
          .eq("wedding_id", UNLINKED_WEDDING),
      ])

      expect(weddings.data).toEqual([])
      expect(halls.data).toEqual([])
      expect(seatmap.data).toEqual([])
    })

    it("reaches nothing belonging to another tenant's customer", async () => {
      const [weddings, halls, tables, fixtures, seatmap] = await Promise.all([
        otherVenue.from("weddings").select("id").eq("id", GRANTED_WEDDING),
        otherVenue.from("halls").select("id").eq("wedding_id", GRANTED_WEDDING),
        otherVenue
          .from("tables")
          .select("id")
          .eq("wedding_id", GRANTED_WEDDING),
        otherVenue
          .from("fixtures")
          .select("id")
          .eq("wedding_id", GRANTED_WEDDING),
        otherVenue
          .from("wedding_seatmap")
          .select("id, menu_option_id")
          .eq("wedding_id", GRANTED_WEDDING),
      ])

      expect(weddings.data).toEqual([])
      expect(halls.data).toEqual([])
      expect(tables.data).toEqual([])
      expect(fixtures.data).toEqual([])
      expect(seatmap.data).toEqual([])
    })
  })

  /**
   * `set_venue_access` authorizes before it answers. A `security definer`
   * function reads the whole table, so every refusal it raises *before* knowing
   * who is calling is a question anyone may ask about any wedding id - and three
   * distinguishable ones let a stranger with a list of uuids sort them into "not
   * a wedding", "a wedding", and "a wedding with a venue".
   *
   * The fix is ordering, not a new check: the owner and staff branches still
   * answer in detail, since reaching either means the caller is already placed
   * on this wedding. Everything else collapses.
   */
  describe("set_venue_access answers strangers with one refusal", () => {
    // A syntactically valid uuid that names nothing.
    const NO_SUCH_WEDDING = "00000000-0000-4000-8000-0000000000ff"

    const refusalFor = async (weddingId: string) => {
      const { error } = await otherVenue.rpc("set_venue_access", {
        p_wedding_id: weddingId,
        p_granted: false,
      })
      return error
    }

    it("cannot be told apart across linked, unlinked and absent weddings", async () => {
      // `dworek`'s staff: real venue staff and a stranger to all three ids, so
      // this is about scope rather than about being signed out.
      const [linked, unlinked, missing] = await Promise.all([
        refusalFor(GRANTED_WEDDING),
        refusalFor(UNLINKED_WEDDING),
        refusalFor(NO_SUCH_WEDDING),
      ])

      expect(linked?.code).toBe("42501")
      // Pinned so the three comparisons below cannot pass by all being
      // undefined together.
      expect(linked?.message).toBe(
        "Not permitted to change venue access for this wedding"
      )

      // Identical, not merely all-failing. Three refusals that differ are three
      // answers, and the message is as much of an answer as the code.
      expect(unlinked?.code).toBe(linked?.code)
      expect(missing?.code).toBe(linked?.code)
      expect(unlinked?.message).toBe(linked?.message)
      expect(missing?.message).toBe(linked?.message)
    })

    it("still tells an owner that their own wedding has no venue", async () => {
      // The other half: collapsing the refusals must not cost the one caller
      // entitled to the specific answer.
      //
      // On a **throwaway wedding**, not the seeded unlinked one:
      // tenantInvitations.test.ts links "Tomasz & Kasia" to bagatelka and
      // deliberately leaves it linked, since nothing a client can call unlinks a
      // wedding. The suites run concurrently against one database, and a
      // `p_granted: true` landing on a *linked* wedding does not refuse - it
      // grants, handing a venue a wedding this file asserts it cannot see.
      const scratchId = crypto.randomUUID()
      const userId = (await solo.auth.getUser()).data.user!.id

      const created = await solo
        .from("weddings")
        .insert({ id: scratchId, owner_id: userId, name: "Unlinked probe" })
      expect(created.error).toBeNull()

      try {
        const { error } = await solo.rpc("set_venue_access", {
          p_wedding_id: scratchId,
          p_granted: true,
        })

        expect(error?.code).toBe("42501")
        expect(error?.message).toContain("not linked to a venue")
      } finally {
        await solo.from("weddings").delete().eq("id", scratchId)
      }
    })
  })

  describe("revocation", () => {
    it("takes everything away the moment access is withdrawn", async () => {
      const revoked = await couple!.rpc("set_venue_access", {
        p_wedding_id: GRANTED_WEDDING,
        p_granted: false,
      })
      expect(revoked.error).toBeNull()

      try {
        const [weddings, halls, tables, fixtures, seatmap] = await Promise.all([
          venue.from("weddings").select("id").eq("id", GRANTED_WEDDING),
          venue.from("halls").select("id").eq("wedding_id", GRANTED_WEDDING),
          venue.from("tables").select("id").eq("wedding_id", GRANTED_WEDDING),
          venue.from("fixtures").select("id").eq("wedding_id", GRANTED_WEDDING),
          venue
            .from("wedding_seatmap")
            .select("id, menu_option_id")
            .eq("wedding_id", GRANTED_WEDDING),
        ])

        // privacy.venue.revoke promises "natychmiast i calkowicie", as an
        // assertion: the derived role reads venue_access on every policy
        // evaluation, so there is no cache to expire and no job to wait for.
        expect(weddings.data).toEqual([])
        expect(halls.data).toEqual([])
        expect(tables.data).toEqual([])
        expect(fixtures.data).toEqual([])
        expect(seatmap.data).toEqual([])

        expect(
          (
            await venue.rpc("my_wedding_role", {
              p_wedding_id: GRANTED_WEDDING,
            })
          ).data
        ).toBeNull()
      } finally {
        await couple!.rpc("set_venue_access", {
          p_wedding_id: GRANTED_WEDDING,
          p_granted: true,
        })
      }
    })
  })
})

/**
 * Whether a local Supabase is answering. Probes PostgREST rather than trusting
 * the env vars: `.env.local` always names `127.0.0.1:54321`, so their presence
 * says nothing about whether Docker is running. The timeout keeps a stopped
 * stack from costing five seconds per run.
 *
 * A skip shows in vitest's own summary, which is the only place it can - the
 * reporter prints no console output from an all-skipped file.
 */
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
