import { createClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase.types"

/**
 * The venue role's access matrix, asserted against a real PostgreSQL with real
 * RLS - not against types, and not against a mock.
 *
 * This file is the acceptance gate for 20260817000003. Everything the venue
 * feature promises is a *policy* claim: "the venue sees the room and never sees
 * the people". A comment cannot hold that, a type cannot hold that, and the
 * client cannot hold it either, because the client is not what enforces it. Two
 * signed-in PostgREST clients and a set of row counts can.
 *
 * Skipped, not failed, when the local stack is down: `supabase start` is not a
 * prerequisite for `pnpm test`, and a red suite on a laptop with no Docker
 * running teaches people to ignore red suites.
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
    // The revocation test restores the grant itself; this is the safety net for
    // a failure between the two, so a red run does not leave the local database
    // in a state that makes every later run red as well.
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

      // Not an error - RLS filters rather than refuses, which is exactly why
      // this has to be asserted rather than assumed from a 403 never arriving.
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
      // `select("*")` on purpose. Naming the columns would ask the view for a
      // projection we already believe in and prove nothing; the star is what
      // makes this an assertion about the *view*, so a `name` column added to
      // it later fails here.
      const { data, error } = await venue
        .from("wedding_seatmap")
        .select("*")
        .eq("wedding_id", GRANTED_WEDDING)

      expect(error).toBeNull()
      expect(data?.length).toBeGreaterThan(0)

      for (const row of data ?? []) {
        // Key absence, not value absence, and the difference is the whole
        // point of this assertion. `expect(row.name).toBeUndefined()` also
        // passes against a view that returns `name: null` - which would mean
        // the column exists, is being selected, and is one projection change
        // away from being populated. These two say the key is not in the
        // response object at all.
        expect(Object.keys(row)).not.toContain("name")
        expect(Object.keys(row)).not.toContain("note")
        expect(row).not.toHaveProperty("name")
        expect(row).not.toHaveProperty("note")

        // The per-guest dish, added by 20260822000003. A **uuid or null**, and
        // that is the assertion: the column is a foreign key into the venue's
        // own catalogue, so unlike `dietary` and `age_group` it is structurally
        // incapable of carrying a name somebody typed. This fails the moment
        // anyone "helpfully" changes the projection to join the dish label in.
        expect(Object.keys(row)).toContain("menu_option_id")
        expect(
          row.menu_option_id === null || UUID_RE.test(row.menu_option_id)
        ).toBe(true)

        // The real upgrade over the four assertions above: they only forbid two
        // names, so *any* third column could be added to this view silently.
        // Pinning the whole set makes every future change to the projection a
        // deliberate edit to this file - which is the only place the "there is
        // nothing here to redact" argument is actually checked.
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

      // `.select()` back is what makes this meaningful: an UPDATE whose rows
      // are all filtered out by RLS is not an error to PostgREST - it answers
      // 204 with no body, which supabase-js reports as a clean success. The
      // returned rows are the only evidence either way. Same reason
      // deleteWedding and leaveWedding ask for them.
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
      // One table further out than the rest of this file, and the same
      // question: what may a venue do to someone who has agreed to nothing?
      //
      // `tenant_members` carried a "staff can add members" INSERT policy, so
      // any account a venue could name by uuid became its 'customer' on the
      // venue's say-so alone. One such row disclosed that person's
      // profiles.display_name to the venue (staff_can_view_profile reads this
      // very table), barred them from ever joining another venue
      // (tenant_members_one_per_user is unique), and satisfied the
      // invitation-only gate in link_wedding_to_venue. The policy is gone. This
      // is what keeps it gone - a re-added INSERT policy fails here.
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
          // `menu_option_id` named explicitly, here and in the two blocks
          // below: the per-guest dish is the newest thing the seat map carries,
          // so every "reaches nothing" assertion has to be about it too rather
          // than only about the columns that predate it.
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
   * `set_venue_access` authorizes before it answers.
   *
   * A `security definer` function reads the whole table, so every refusal it
   * can raise *before* it knows who is calling is a question anyone may ask
   * about any wedding id. This one used to raise three distinguishable ones -
   * `P0002` for an id that names nothing, "not linked to a venue" for a real
   * unlinked wedding, and the generic refusal for a real linked one - so a
   * stranger with a list of uuids could sort them into "not a wedding", "a
   * wedding", and "a wedding with a venue" without being allowed to touch any
   * of them.
   *
   * The fix is ordering, not a new check: the owner and staff branches still
   * answer in detail, because reaching either one means the caller has already
   * been placed on this wedding. Everything else collapses.
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
      // `dworek`'s staff: real venue staff, and a stranger to all three ids -
      // which is what makes this a statement about scope rather than about
      // being signed out.
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
      // entitled to the specific answer. An owner asking about their own
      // unlinked wedding learns nothing they do not already own.
      //
      // On a **throwaway wedding**, not the seeded unlinked one. That one is
      // "Tomasz & Kasia", and tenantInvitations.test.ts links it to bagatelka
      // and deliberately leaves it linked - it says so in its own afterEach,
      // because nothing a client can call unlinks a wedding. The two files run
      // concurrently against one database, so borrowing it makes this test's
      // result depend on which suite got there first, and a `p_granted: true`
      // that lands on a *linked* wedding does not refuse at all: it grants, and
      // hands a venue a wedding the rest of this file asserts it cannot see.
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

        // privacy.venue.revoke promises "natychmiast i calkowicie". This is
        // that sentence as an assertion: the derived role reads venue_access on
        // every policy evaluation, so there is no cache to expire and no
        // background job to wait for.
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
 * Whether a local Supabase is answering.
 *
 * Deliberately probes PostgREST rather than trusting the env vars: `.env.local`
 * always names `127.0.0.1:54321`, so their presence says nothing about whether
 * Docker is running. The timeout keeps a stopped stack from costing five
 * seconds per suite run.
 *
 * A skip is visible in vitest's own summary - `410 passed | 24 skipped` rather
 * than `434 passed` - which is the only place it can be seen: console output
 * from a file whose tests are all skipped is not printed by the reporter.
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
