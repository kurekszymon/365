import { createClient } from "@supabase/supabase-js"
import { beforeAll, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase.types"

/**
 * The venue menu catalogue, asserted against a real PostgreSQL with real RLS.
 *
 * The third suite in the family, after venueRls.test.ts and
 * tenantInvitations.test.ts, and it exists for the same reason both of those
 * do: every claim this feature makes is a *policy* claim. "A venue authors its
 * own menu and reaches nobody else's" is enforced by twelve policies and two
 * composite foreign keys, and neither a type nor a comment can hold that.
 *
 * The isolation assertions are made **per table**, not once. That is the whole
 * reason the fixture has a second tenant with a package of its own: courses and
 * options carry a denormalised `tenant_id` - kept honest by the composite FKs
 * rather than by a trigger - so each of the three tables has its own policy, and
 * a policy that was forgotten on one of them would still leave the other two
 * green.
 *
 * Skipped, not failed, when the local stack is down - see venueRls.test.ts.
 *
 * Fixtures come from supabase/seed.sql: `bagatelka` owns four packages, `dworek`
 * owns one, and owner@easywed.test is a couple linked to bagatelka.
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_KEY ?? import.meta.env.VITE_SUPABASE_KEY

const BAGATELKA = "50000000-0000-4000-8000-000000000001"
const DWOREK = "50000000-0000-4000-8000-000000000002"

// MENU SERWOWANE, and its plated "Danie glowne" course - the fixture the rest
// of phase 4 is built on.
const SERVED_PACKAGE = "60000000-0000-4000-8000-000000000004"
const PLATED_COURSE = "61000000-0000-4000-8000-000000000403"
const DWOREK_PACKAGE = "60000000-0000-4000-8000-000000000009"

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

describe.skipIf(!reachable)("venue menu catalogue", () => {
  // Owner of `bagatelka`, whose catalogue this is.
  let venue: SupabaseClient<Database>
  // Owner of `dworek`. Staff of a real tenant, with a real menu of their own -
  // which is what makes every "reads zero" below a statement about scope rather
  // than about being logged out.
  let otherVenue: SupabaseClient<Database>
  // owner@easywed.test: a couple, and a 'customer' of bagatelka.
  let couple: SupabaseClient<Database>

  let venueUserId: string

  beforeAll(async () => {
    ;[venue, otherVenue, couple] = await Promise.all([
      signIn("venue@easywed.test"),
      signIn("venue2@easywed.test"),
      signIn("owner@easywed.test"),
    ])
    venueUserId = (await venue.auth.getUser()).data.user!.id
  })

  describe("a venue reads its own catalogue", () => {
    it("sees its packages, courses and options", async () => {
      const [packages, courses, options] = await Promise.all([
        venue.from("menu_packages").select("id, name"),
        venue.from("menu_courses").select("id, per_guest_choice"),
        venue.from("menu_options").select("id"),
      ])

      expect(packages.data!.length).toBe(4)
      expect(courses.data!.length).toBeGreaterThan(0)
      expect(options.data!.length).toBeGreaterThan(0)

      // The plated course exists and is flagged - the one boolean the whole
      // two-shapes decision rests on.
      expect(
        courses.data!.some(
          (row) => row.id === PLATED_COURSE && row.per_guest_choice
        )
      ).toBe(true)
    })

    it("does not see the other venue's package", async () => {
      const { data } = await venue.from("menu_packages").select("id, tenant_id")

      expect(data!.every((row) => row.tenant_id === BAGATELKA)).toBe(true)
      expect(data!.some((row) => row.id === DWOREK_PACKAGE)).toBe(false)
    })
  })

  describe("isolation, per table", () => {
    // Three separate assertions rather than one, because there are three
    // separate policies. Collapsing them would let a missing policy on
    // menu_options pass because menu_packages is fine.
    it("keeps packages out of another tenant's reach", async () => {
      const { data } = await otherVenue
        .from("menu_packages")
        .select("id")
        .eq("tenant_id", BAGATELKA)

      expect(data).toEqual([])
    })

    it("keeps courses out of another tenant's reach", async () => {
      const { data } = await otherVenue
        .from("menu_courses")
        .select("id")
        .eq("tenant_id", BAGATELKA)

      expect(data).toEqual([])
    })

    it("keeps options out of another tenant's reach", async () => {
      const { data } = await otherVenue
        .from("menu_options")
        .select("id")
        .eq("tenant_id", BAGATELKA)

      expect(data).toEqual([])
    })

    it("does not let another tenant update a package", async () => {
      const { data, error } = await otherVenue
        .from("menu_packages")
        .update({ price_per_person_minor: 1 })
        .eq("id", SERVED_PACKAGE)
        .select("id")

      // `.select()` back is mandatory. An UPDATE that RLS filters to nothing is
      // a clean 204 - no error, no rows - so without it this reads as success
      // and the test proves nothing.
      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it("does not let another tenant delete a package", async () => {
      const { data, error } = await otherVenue
        .from("menu_packages")
        .delete()
        .eq("id", SERVED_PACKAGE)
        .select("id")

      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it("does not let another tenant claim a package for itself", async () => {
      const { error } = await otherVenue
        .from("menu_packages")
        .insert({ tenant_id: BAGATELKA, name: "Podszyte menu" })

      // RLS refuses an INSERT rather than filtering it, so unlike the two above
      // this really is an error.
      expect(error?.code).toBe("42501")
    })

    it("does not let another tenant add a course to a foreign package", async () => {
      const { error } = await otherVenue.from("menu_courses").insert({
        tenant_id: BAGATELKA,
        menu_package_id: SERVED_PACKAGE,
        name: "Podszyte danie",
      })

      expect(error?.code).toBe("42501")
    })

    /**
     * The composite FK, doing the job a scope trigger would otherwise do.
     *
     * This is the write that *passes* RLS - `tenant_id` is dworek's own, so
     * `is_tenant_staff` is true - and is refused by referential integrity
     * instead, because (dworek, bagatelka's package) is not a row of
     * menu_packages(tenant_id, id). Without the composite key this insert would
     * succeed and put a dworek-owned course inside a bagatelka package, which
     * every policy here would then happily show to dworek.
     */
    it("refuses a course whose tenant and package disagree", async () => {
      const { error } = await otherVenue.from("menu_courses").insert({
        tenant_id: DWOREK,
        menu_package_id: SERVED_PACKAGE,
        name: "Danie nie z tej sali",
      })

      expect(error?.code).toBe("23503")
    })
  })

  describe("reorder RPCs", () => {
    const positions = async (
      db: SupabaseClient<Database>,
      courseId: string
    ): Promise<Array<{ id: string; position: number }>> => {
      const { data } = await db
        .from("menu_options")
        .select("id, position")
        .eq("menu_course_id", courseId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
      return data!
    }

    it("reorders a course the caller owns", async () => {
      const before = await positions(venue, PLATED_COURSE)
      const reversed = [...before].reverse().map((row) => row.id)

      try {
        const { error } = await venue.rpc("reorder_menu_options", {
          p_course_id: PLATED_COURSE,
          p_ids: reversed,
        })
        expect(error).toBeNull()

        const after = await positions(venue, PLATED_COURSE)
        expect(after.map((row) => row.id)).toEqual(reversed)
        // `with ordinality` assigns 1..n, so a reorder also compacts whatever
        // the positions were before.
        expect(after.map((row) => row.position)).toEqual(
          reversed.map((_, i) => i + 1)
        )
      } finally {
        await venue.rpc("reorder_menu_options", {
          p_course_id: PLATED_COURSE,
          p_ids: before.map((row) => row.id),
        })
      }
    })

    /**
     * The RLS-filters-the-update path, which is the entire authorization story
     * for these two functions: they are **invoker rights**, not definer, so a
     * caller who is not staff of the owning tenant updates zero rows.
     *
     * Easy to get wrong and invisible without this test - the call returns
     * successfully either way, so only re-reading the positions can tell a
     * silent no-op from a silent scramble.
     */
    it("is a no-op when called by another tenant's staff", async () => {
      const before = await positions(venue, PLATED_COURSE)

      const { error } = await otherVenue.rpc("reorder_menu_options", {
        p_course_id: PLATED_COURSE,
        p_ids: [...before].reverse().map((row) => row.id),
      })

      // No error: the statement ran, it just matched nothing.
      expect(error).toBeNull()
      expect(await positions(venue, PLATED_COURSE)).toEqual(before)
    })

    /**
     * The `and o.menu_course_id = p_course_id` clause in the function body.
     * Without it, ids from another course of the *same* tenant - which RLS
     * happily admits - would be renumbered against a list they do not belong to.
     */
    it("ignores ids that belong to a different course", async () => {
      const otherCourse = "61000000-0000-4000-8000-000000000205"
      const before = await positions(venue, otherCourse)

      const { error } = await venue.rpc("reorder_menu_options", {
        p_course_id: PLATED_COURSE,
        p_ids: [...before].reverse().map((row) => row.id),
      })

      expect(error).toBeNull()
      expect(await positions(venue, otherCourse)).toEqual(before)
    })

    it("reorders courses within a package the caller owns", async () => {
      const { data: before } = await venue
        .from("menu_courses")
        .select("id, position")
        .eq("menu_package_id", SERVED_PACKAGE)
        .order("position", { ascending: true })

      const reversed = [...before!].reverse().map((row) => row.id)

      try {
        const { error } = await venue.rpc("reorder_menu_courses", {
          p_menu_package_id: SERVED_PACKAGE,
          p_ids: reversed,
        })
        expect(error).toBeNull()

        const { data: after } = await venue
          .from("menu_courses")
          .select("id")
          .eq("menu_package_id", SERVED_PACKAGE)
          .order("position", { ascending: true })

        expect(after!.map((row) => row.id)).toEqual(reversed)
      } finally {
        await venue.rpc("reorder_menu_courses", {
          p_menu_package_id: SERVED_PACKAGE,
          p_ids: before!.map((row) => row.id),
        })
      }
    })
  })

  /**
   * What this migration deliberately does *not* open.
   *
   * A couple reads the venue's menu through their wedding's link to the tenant,
   * and that policy lands in 20260822000002 with the planner surface that needs
   * it. Until then the blast radius of the catalogue is exactly "staff of this
   * tenant", which is what makes this migration a no-op for every existing user.
   *
   * These three flip to ">0" in the next PR of the stack, and the flip is meant
   * to be visible in that diff.
   */
  describe("what a couple cannot read yet", () => {
    it("reads no packages, courses or options", async () => {
      const [packages, courses, options] = await Promise.all([
        couple.from("menu_packages").select("id"),
        couple.from("menu_courses").select("id"),
        couple.from("menu_options").select("id"),
      ])

      // A 'customer' of the venue, and still nothing: every policy in this
      // migration gates on `is_tenant_staff`, which excludes 'customer'.
      expect(packages.data).toEqual([])
      expect(courses.data).toEqual([])
      expect(options.data).toEqual([])
    })

    it("cannot write one either", async () => {
      const { error } = await couple
        .from("menu_packages")
        .insert({ tenant_id: BAGATELKA, name: "Menu pary mlodej" })

      expect(error?.code).toBe("42501")
    })
  })

  it("leaves the seeded fixture as it found it", async () => {
    // Cheap guard for the suites sharing this database: everything above either
    // restores what it changed or was refused outright, so the catalogue must
    // be exactly what seed.sql wrote.
    const { data } = await venue
      .from("menu_packages")
      .select("id, price_per_person_minor")
      .eq("id", SERVED_PACKAGE)
      .single()

    expect(data).toEqual({
      id: SERVED_PACKAGE,
      price_per_person_minor: 45500,
    })
    expect(venueUserId).toBeTruthy()
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
