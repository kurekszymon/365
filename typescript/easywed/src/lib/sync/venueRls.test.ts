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
const PASSWORD = "password123"

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

  beforeAll(async () => {
    ;[venue, otherVenue, couple] = await Promise.all([
      signIn("venue@easywed.test"),
      signIn("venue2@easywed.test"),
      signIn("owner@easywed.test"),
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

  describe("isolation", () => {
    it("reaches nothing belonging to a wedding it was not granted", async () => {
      const [weddings, halls, seatmap] = await Promise.all([
        venue.from("weddings").select("id").eq("id", UNLINKED_WEDDING),
        venue.from("halls").select("id").eq("wedding_id", UNLINKED_WEDDING),
        venue
          .from("wedding_seatmap")
          .select("id")
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
          .select("id")
          .eq("wedding_id", GRANTED_WEDDING),
      ])

      expect(weddings.data).toEqual([])
      expect(halls.data).toEqual([])
      expect(tables.data).toEqual([])
      expect(fixtures.data).toEqual([])
      expect(seatmap.data).toEqual([])
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
            .select("id")
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
