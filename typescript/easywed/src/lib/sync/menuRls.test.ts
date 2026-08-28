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
// MENU II, the buffet-shaped package. Used as "some other package of the same
// venue", which is the interesting negative - a package the couple can read and
// still may not draw dishes from.
const BUFFET_PACKAGE = "60000000-0000-4000-8000-000000000002"
// MENU I's first soup: a real dish of this same venue, in a package this
// wedding did not order.
const MENU_I_SOUP = "62000000-0000-4000-8000-000000010101"
// MENU SERWOWANE's first starter: a dish of the package this wedding *did*
// order, on a course that is not per-guest. The sharper negative of the two.
const SERVED_STARTER = "62000000-0000-4000-8000-000000040101"

// Three of the six plated mains. A/B/C are what seed.sql picks; D and E are the
// unpicked ones, so a test can add and remove one without disturbing the
// fixture the client work is demoed on.
const PLATED_MAIN_A = "62000000-0000-4000-8000-000000040301"
const PLATED_MAIN_D = "62000000-0000-4000-8000-000000040304"
const PLATED_MAIN_E = "62000000-0000-4000-8000-000000040305"

// "Anna & Piotr" - linked to bagatelka, granted, and ordering MENU SERWOWANE.
const COUPLE_WEDDING = "20000000-0000-4000-8000-000000000001"
// "Tomasz & Kasia" - linked to nothing, owned by solo@.
const SOLO_WEDDING = "20000000-0000-4000-8000-000000000002"

/** Exactly what seed.sql writes as the served set, for restoring after a wipe. */
const SEEDED_SELECTION_IDS = [
  "62000000-0000-4000-8000-000000040101",
  "62000000-0000-4000-8000-000000040201",
  PLATED_MAIN_A,
  "62000000-0000-4000-8000-000000040302",
  "62000000-0000-4000-8000-000000040303",
  "62000000-0000-4000-8000-000000040401",
]

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
  // The other two roles on that same wedding.
  let editor: SupabaseClient<Database>
  let viewer: SupabaseClient<Database>

  let venueUserId: string

  /**
   * Puts the seeded order back: the package first, then the served set.
   *
   * Switching package wipes the selections by design, so the test that proves
   * it has to put them back - a suite that only passes on a freshly reset
   * database is a suite people stop running. Same rule as
   * tenantInvitations.test.ts: every test restores the fixture.
   *
   * The order of the two statements is the whole helper. Selections are refused
   * with 23514 while the wedding holds no package, so restoring them first
   * silently does nothing and every later assertion reads an empty menu.
   */
  const restoreSeededMenu = async () => {
    await couple
      .from("weddings")
      .update({ menu_package_id: SERVED_PACKAGE })
      .eq("id", COUPLE_WEDDING)

    await couple.from("wedding_menu_selections").insert(
      SEEDED_SELECTION_IDS.map((menu_option_id) => ({
        wedding_id: COUPLE_WEDDING,
        menu_option_id,
      }))
    )
  }

  /**
   * The guests' dishes, for the tests that destroy them.
   *
   * Needed from 20260822000003 onwards and not before: switching package used
   * to clear only the selections, and now clears `guests.menu_option_id` too.
   * Snapshotting beats recomputing - the seed assigns dishes round-robin over
   * the seated guests, and duplicating that rule here would be a second copy to
   * keep in step for no benefit.
   */
  const guestDishes = async (): Promise<
    Array<{ id: string; menu_option_id: string | null }>
  > => {
    const { data } = await couple
      .from("guests")
      .select("id, menu_option_id")
      .eq("wedding_id", COUPLE_WEDDING)
      .not("menu_option_id", "is", null)
    return data!
  }

  /**
   * Puts them back, one statement per distinct dish.
   *
   * Order matters as much as it does in `restoreSeededMenu`: the package has to
   * be back first, or `enforce_guest_menu_option` refuses every one of these
   * with 23514 and the restore silently does nothing.
   */
  const restoreGuestDishes = async (
    rows: Array<{ id: string; menu_option_id: string | null }>
  ) => {
    const byDish = new Map<string, Array<string>>()
    for (const row of rows) {
      if (!row.menu_option_id) continue
      byDish.set(row.menu_option_id, [
        ...(byDish.get(row.menu_option_id) ?? []),
        row.id,
      ])
    }

    for (const [menu_option_id, ids] of byDish) {
      await couple.from("guests").update({ menu_option_id }).in("id", ids)
    }
  }

  beforeAll(async () => {
    ;[venue, otherVenue, couple, editor, viewer] = await Promise.all([
      signIn("venue@easywed.test"),
      signIn("venue2@easywed.test"),
      signIn("owner@easywed.test"),
      signIn("editor@easywed.test"),
      signIn("viewer@easywed.test"),
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
   * The couple's read, opened by 20260822000002.
   *
   * In the previous migration these three assertions were `toEqual([])` - the
   * catalogue's whole blast radius was "staff of this tenant". They read `>0`
   * now, and the route in is the **wedding's link to the tenant**, not a
   * `tenant_members` row: `solo@` belongs to no tenant and owns a wedding linked
   * to none, and reads zero of all three.
   *
   * Deliberately not gated on `venue_access = 'granted'`. A menu is the venue's
   * own data, published to be read, and a couple deciding whether to grant
   * anything needs to see the offer first.
   */
  describe("what a linked couple can read", () => {
    it("reads the venue's packages, courses and options", async () => {
      const [packages, courses, options] = await Promise.all([
        couple.from("menu_packages").select("id, tenant_id"),
        couple.from("menu_courses").select("id"),
        couple.from("menu_options").select("id"),
      ])

      expect(packages.data!.length).toBeGreaterThan(0)
      expect(courses.data!.length).toBeGreaterThan(0)
      expect(options.data!.length).toBeGreaterThan(0)

      // Their venue's, and only their venue's. dworek's package is linked to no
      // wedding of theirs, so the predicate finds nothing for it.
      expect(packages.data!.every((row) => row.tenant_id === BAGATELKA)).toBe(
        true
      )
    })

    /**
     * The other half of the same policy: the link scopes the read, so a couple
     * reaches their own venue's catalogue and no other venue's.
     *
     * Asserted against dworek's rows rather than by signing in as a couple
     * linked to nothing, and the reason is worth writing down so nobody
     * "restores" the simpler version. The only seeded account in that state is
     * solo@, and tenantInvitations.test.ts deliberately leaves their wedding
     * linked to `bagatelka` in 'pending' - documented residue, harmless there,
     * and fatal here: the couple-read policy is deliberately not gated on
     * `venue_access`, so a linked-but-not-granted wedding reads the menu by
     * design. Vitest runs the two files concurrently against one database, so a
     * "solo reads zero" assertion passes or fails depending on which suite got
     * there first.
     */
    it("reads nothing belonging to a venue it is not linked to", async () => {
      const [packages, courses, options] = await Promise.all([
        couple.from("menu_packages").select("id").eq("tenant_id", DWOREK),
        couple.from("menu_courses").select("id").eq("tenant_id", DWOREK),
        couple.from("menu_options").select("id").eq("tenant_id", DWOREK),
      ])

      expect(packages.data).toEqual([])
      expect(courses.data).toEqual([])
      expect(options.data).toEqual([])
    })

    // Read-only, asserted per table for the reason the isolation block is:
    // three tables, three sets of policies, and the couple gains SELECT on all
    // three and nothing else on any of them.
    it("cannot write a package", async () => {
      const insert = await couple
        .from("menu_packages")
        .insert({ tenant_id: BAGATELKA, name: "Menu pary mlodej" })
      expect(insert.error?.code).toBe("42501")

      const update = await couple
        .from("menu_packages")
        .update({ price_per_person_minor: 1 })
        .eq("id", SERVED_PACKAGE)
        .select("id")
      expect(update.data).toEqual([])

      const remove = await couple
        .from("menu_packages")
        .delete()
        .eq("id", SERVED_PACKAGE)
        .select("id")
      expect(remove.data).toEqual([])
    })

    it("cannot write a course", async () => {
      const insert = await couple.from("menu_courses").insert({
        tenant_id: BAGATELKA,
        menu_package_id: SERVED_PACKAGE,
        name: "Danie pary mlodej",
      })
      expect(insert.error?.code).toBe("42501")

      const update = await couple
        .from("menu_courses")
        .update({ choose_count: 9 })
        .eq("id", PLATED_COURSE)
        .select("id")
      expect(update.data).toEqual([])

      const remove = await couple
        .from("menu_courses")
        .delete()
        .eq("id", PLATED_COURSE)
        .select("id")
      expect(remove.data).toEqual([])
    })

    it("cannot write a dish", async () => {
      const insert = await couple.from("menu_options").insert({
        tenant_id: BAGATELKA,
        menu_course_id: PLATED_COURSE,
        name: "Danie pary mlodej",
      })
      expect(insert.error?.code).toBe("42501")

      const update = await couple
        .from("menu_options")
        .update({ name: "Przemianowane" })
        .eq("id", PLATED_MAIN_A)
        .select("id")
      expect(update.data).toEqual([])

      const remove = await couple
        .from("menu_options")
        .delete()
        .eq("id", PLATED_MAIN_A)
        .select("id")
      expect(remove.data).toEqual([])
    })
  })

  describe("the wedding's package", () => {
    /**
     * The assertion that makes an ordinary UPDATE policy on
     * `weddings.menu_package_id` safe.
     *
     * The column is client-writable, unlike `tenant_id` and `venue_access`,
     * because choosing a package discloses nothing. What keeps it honest is
     * `enforce_wedding_menu_package`: a package from a venue this wedding is
     * not linked to is refused outright, so the couple cannot point their
     * wedding at a catalogue they have no relationship with.
     */
    it("refuses a package belonging to another venue", async () => {
      const { error } = await couple
        .from("weddings")
        .update({ menu_package_id: DWOREK_PACKAGE })
        .eq("id", COUPLE_WEDDING)

      expect(error?.code).toBe("23514")
    })

    it("keeps the seeded package on the wedding", async () => {
      const { data } = await couple
        .from("weddings")
        .select("menu_package_id")
        .eq("id", COUPLE_WEDDING)
        .single()

      expect(data?.menu_package_id).toBe(SERVED_PACKAGE)
    })

    /**
     * The re-link case, and the single most likely thing in this stack to have
     * been missed.
     *
     * `link_wedding_to_venue` re-links an already-linked wedding on purpose,
     * and its UPDATE now fires `enforce_wedding_menu_package`. Without the
     * `menu_package_id = null` that 20260822000002 adds to that statement, a
     * wedding still holding the old venue's package fails with 23514 and
     * changing venue simply stops working - discovered by a customer, not by a
     * test.
     *
     * Runs against a **throwaway wedding this test creates and deletes**, not
     * the seeded one, and that is not tidiness. Re-linking rewrites `tenant_id`
     * and lands `venue_access` back in 'pending' - consent is given to *a*
     * recipient - which is exactly the state venueRls.test.ts asserts its peek
     * against. Vitest runs the two files concurrently against one database, so
     * borrowing the shared fixture here makes that suite fail at random, in a
     * way that reads as a policy bug.
     *
     * `dworek` has `open_linking = true` and owner@ is already a `customer` of
     * `bagatelka`, so both legs of the round trip are reachable with no
     * invitation to mint or clean up.
     */
    it("survives a re-link to another venue, clearing the menu", async () => {
      const scratchId = crypto.randomUUID()
      const userId = (await couple.auth.getUser()).data.user!.id

      const created = await couple
        .from("weddings")
        .insert({ id: scratchId, owner_id: userId, name: "Re-link probe" })
      expect(created.error).toBeNull()

      try {
        const linked = await couple.rpc("link_wedding_to_venue", {
          p_wedding_id: scratchId,
          p_slug: "dworek",
        })
        expect(linked.error).toBeNull()

        // A package of the venue it is linked to *now*, so the state under test
        // is the real one: a wedding holding one venue's package at the moment
        // it is pointed at another.
        const picked = await couple
          .from("weddings")
          .update({ menu_package_id: DWOREK_PACKAGE })
          .eq("id", scratchId)
        expect(picked.error).toBeNull()

        const relinked = await couple.rpc("link_wedding_to_venue", {
          p_wedding_id: scratchId,
          p_slug: "bagatelka",
        })
        // The assertion this whole test exists for. Without the
        // `menu_package_id = null` in the replaced RPC, this is 23514 and
        // changing venue is broken.
        expect(relinked.error).toBeNull()

        const { data: after } = await couple
          .from("weddings")
          .select("tenant_id, menu_package_id")
          .eq("id", scratchId)
          .single()

        expect(after?.tenant_id).toBe(BAGATELKA)
        expect(after?.menu_package_id).toBeNull()
      } finally {
        await couple.from("weddings").delete().eq("id", scratchId)
      }
    })
  })

  describe("selections", () => {
    it("lets the owner pick and unpick a dish", async () => {
      const insert = await couple
        .from("wedding_menu_selections")
        .insert({
          wedding_id: COUPLE_WEDDING,
          menu_option_id: PLATED_MAIN_D,
        })
        .select("menu_option_id")

      expect(insert.error).toBeNull()
      expect(insert.data).toEqual([{ menu_option_id: PLATED_MAIN_D }])

      const remove = await couple
        .from("wedding_menu_selections")
        .delete()
        .eq("wedding_id", COUPLE_WEDDING)
        .eq("menu_option_id", PLATED_MAIN_D)
        .select("menu_option_id")

      expect(remove.data).toEqual([{ menu_option_id: PLATED_MAIN_D }])
    })

    /**
     * The write shape `insertMenuSelection` uses, and why it is an upsert.
     *
     * `(wedding_id, menu_option_id)` is the primary key, so a plain insert of a
     * dish already picked raises 23505 - which `run()` turns into a
     * "could not save" toast for a write the database is already consistent
     * with. Two people editing the menu at once hit that, and so does a single
     * client doing pick → unpick → pick, since the writes are fire-and-forget
     * with no ordering guarantee.
     */
    it("absorbs a duplicate pick instead of failing it", async () => {
      const duplicate = await couple
        .from("wedding_menu_selections")
        .upsert(
          { wedding_id: COUPLE_WEDDING, menu_option_id: PLATED_MAIN_A },
          { ignoreDuplicates: true }
        )
      expect(duplicate.error).toBeNull()

      // Still one row, not two - the primary key saw to that either way; what
      // changed is that the caller is not told it failed.
      const { data } = await couple
        .from("wedding_menu_selections")
        .select("menu_option_id")
        .eq("wedding_id", COUPLE_WEDDING)
        .eq("menu_option_id", PLATED_MAIN_A)

      expect(data).toEqual([{ menu_option_id: PLATED_MAIN_A }])

      // The contrast, so the reason for the upsert is visible here rather than
      // only in a comment.
      const plain = await couple
        .from("wedding_menu_selections")
        .insert({ wedding_id: COUPLE_WEDDING, menu_option_id: PLATED_MAIN_A })
      expect(plain.error?.code).toBe("23505")
    })

    it("lets an editor write, and a viewer neither", async () => {
      const asEditor = await editor
        .from("wedding_menu_selections")
        .insert({ wedding_id: COUPLE_WEDDING, menu_option_id: PLATED_MAIN_D })
      expect(asEditor.error).toBeNull()

      const asViewerInsert = await viewer
        .from("wedding_menu_selections")
        .insert({ wedding_id: COUPLE_WEDDING, menu_option_id: PLATED_MAIN_E })
      expect(asViewerInsert.error?.code).toBe("42501")

      const asViewerDelete = await viewer
        .from("wedding_menu_selections")
        .delete()
        .eq("wedding_id", COUPLE_WEDDING)
        .eq("menu_option_id", PLATED_MAIN_D)
        .select("menu_option_id")
      expect(asViewerDelete.data).toEqual([])

      // Cleanup through a role that may.
      await couple
        .from("wedding_menu_selections")
        .delete()
        .eq("wedding_id", COUPLE_WEDDING)
        .eq("menu_option_id", PLATED_MAIN_D)
    })

    /**
     * A stranger reads nothing, and the stranger is dworek's owner rather than
     * solo@ for the same cross-suite reason the catalogue block explains - with
     * a sharper edge here. tenantInvitations.test.ts has solo@ claim a *staff*
     * invitation to bagatelka mid-run, and staff of the linked tenant is
     * exactly what `wedding_role()` derives 'venue' from, so for the length of
     * that test solo@ can legitimately read this wedding's selections. dworek
     * has no relationship to this wedding in any suite.
     */
    it("reads nothing for a caller with no relationship to the wedding", async () => {
      const { data } = await otherVenue
        .from("wedding_menu_selections")
        .select("menu_option_id")
        .eq("wedding_id", COUPLE_WEDDING)

      expect(data).toEqual([])
    })

    /**
     * `enforce_menu_selection_in_package`. MENU I's soup is a perfectly real
     * dish of this same venue, and it is still refused: the wedding ordered
     * MENU SERWOWANE, and every option row belongs to exactly one course of
     * exactly one package.
     */
    it("refuses a dish from a package this wedding did not order", async () => {
      const { error } = await couple.from("wedding_menu_selections").insert({
        wedding_id: COUPLE_WEDDING,
        menu_option_id: MENU_I_SOUP,
      })

      expect(error?.code).toBe("23514")
    })

    /**
     * Switching package is destructive by design, and the wipe happens in the
     * database rather than the client - there is no rollback layer, and the
     * switch can arrive from another device.
     */
    it("wipes the selections when the package changes", async () => {
      // Captured before the switch, because from 20260822000003 the same
      // trigger also clears every guest's dish - which is the point, and which
      // makes this the one test that has to restore three things.
      const dishes = await guestDishes()

      try {
        const { error } = await couple
          .from("weddings")
          .update({ menu_package_id: BUFFET_PACKAGE })
          .eq("id", COUPLE_WEDDING)
        expect(error).toBeNull()

        const { data } = await couple
          .from("wedding_menu_selections")
          .select("menu_option_id")
          .eq("wedding_id", COUPLE_WEDDING)
        expect(data).toEqual([])

        // And the guests with it. Leaving them holding a dish from a package
        // the wedding no longer orders is the exact state the trigger exists
        // to prevent - it would print on the kitchen report as food nobody
        // agreed to cook.
        expect(await guestDishes()).toEqual([])
      } finally {
        await restoreSeededMenu()
        await restoreGuestDishes(dishes)
      }
    })

    /**
     * The assertion that keeps "read-only by construction" true for the derived
     * role. This is the first relation in the wedding tree that admits 'venue'
     * on SELECT *and* the couple writes, so the write half has to be pinned.
     */
    it("lets the granted venue read them and write none", async () => {
      const { data: read } = await venue
        .from("wedding_menu_selections")
        .select("menu_option_id")
        .eq("wedding_id", COUPLE_WEDDING)
      expect(read!.length).toBeGreaterThan(0)

      const insert = await venue.from("wedding_menu_selections").insert({
        wedding_id: COUPLE_WEDDING,
        menu_option_id: PLATED_MAIN_D,
      })
      expect(insert.error?.code).toBe("42501")

      const remove = await venue
        .from("wedding_menu_selections")
        .delete()
        .eq("wedding_id", COUPLE_WEDDING)
        .select("menu_option_id")
      expect(remove.data).toEqual([])
    })

    it("shows the venue nothing for a wedding it was not linked to", async () => {
      const { data } = await venue
        .from("wedding_menu_selections")
        .select("menu_option_id")
        .eq("wedding_id", SOLO_WEDDING)

      expect(data).toEqual([])
    })
  })

  describe("the per-guest dish", () => {
    /** One seated guest of the granted wedding, and their dish. */
    const someGuest = async (): Promise<{
      id: string
      menu_option_id: string | null
    }> => {
      const { data } = await couple
        .from("guests")
        .select("id, menu_option_id")
        .eq("wedding_id", COUPLE_WEDDING)
        .not("menu_option_id", "is", null)
        .limit(1)
        .single()
      return data!
    }

    it("assigns a dish from the plated course", async () => {
      const guest = await someGuest()

      try {
        const { error } = await couple
          .from("guests")
          .update({ menu_option_id: PLATED_MAIN_A })
          .eq("id", guest.id)

        expect(error).toBeNull()
      } finally {
        await couple
          .from("guests")
          .update({ menu_option_id: guest.menu_option_id })
          .eq("id", guest.id)
      }
    })

    /**
     * The `per_guest_choice` half of `enforce_guest_menu_option`, and the half
     * that would be silently wrong if it were dropped.
     *
     * MENU SERWOWANE's Przystawka is a dish of the very package this wedding
     * ordered - the package half of the check passes - but its course is a
     * buffet course, where nobody is plating anything per guest. Assigned to a
     * guest it would tally as a portion the kitchen has to plate, and it would
     * look right on the report.
     */
    it("refuses a dish from a course that is not per-guest", async () => {
      const guest = await someGuest()

      const { error } = await couple
        .from("guests")
        .update({ menu_option_id: SERVED_STARTER })
        .eq("id", guest.id)

      expect(error?.code).toBe("23514")
    })

    it("refuses a dish from another package entirely", async () => {
      const guest = await someGuest()

      const { error } = await couple
        .from("guests")
        .update({ menu_option_id: MENU_I_SOUP })
        .eq("id", guest.id)

      expect(error?.code).toBe("23514")
    })

    /**
     * Repair, not refusal. Unpicking a dish four guests already hold releases
     * those guests rather than rejecting the unpick with a message about people
     * the couple would then have to hunt down - the same direction as soft
     * deletes and orphan adoption.
     */
    it("clears the guests holding a dish when it is unpicked", async () => {
      const { data: before } = await couple
        .from("guests")
        .select("id")
        .eq("wedding_id", COUPLE_WEDDING)
        .eq("menu_option_id", PLATED_MAIN_A)

      expect(before!.length).toBeGreaterThan(0)

      try {
        const { error } = await couple
          .from("wedding_menu_selections")
          .delete()
          .eq("wedding_id", COUPLE_WEDDING)
          .eq("menu_option_id", PLATED_MAIN_A)
        expect(error).toBeNull()

        const { data: after } = await couple
          .from("guests")
          .select("id")
          .eq("wedding_id", COUPLE_WEDDING)
          .eq("menu_option_id", PLATED_MAIN_A)

        expect(after).toEqual([])
      } finally {
        await couple.from("wedding_menu_selections").insert({
          wedding_id: COUPLE_WEDDING,
          menu_option_id: PLATED_MAIN_A,
        })
        await couple
          .from("guests")
          .update({ menu_option_id: PLATED_MAIN_A })
          .in(
            "id",
            before!.map((row) => row.id)
          )
      }
    })

    /**
     * Re-asserted here as well as in venueRls.test.ts, deliberately.
     *
     * This is the migration that gives the venue a new per-guest column, so a
     * reviewer of *this* feature should be able to see, in *this* file, that it
     * bought them nothing on `guests` itself. What the venue reads is
     * `wedding_seatmap`, whose projection has no name and no note to leak.
     */
    it("still shows the venue zero guest rows", async () => {
      const { data, error } = await venue
        .from("guests")
        .select("*")
        .eq("wedding_id", COUPLE_WEDDING)

      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it("shows the venue the dish through the seat map instead", async () => {
      const { data } = await venue
        .from("wedding_seatmap")
        .select("menu_option_id")
        .eq("wedding_id", COUPLE_WEDDING)
        .not("menu_option_id", "is", null)

      expect(data!.length).toBeGreaterThan(0)
    })
  })

  /**
   * The three `on delete restrict` FKs, asserted from the side that hits them.
   *
   * These are the only tests in the file where staff pass RLS and are refused
   * anyway. Every "does not let another tenant..." case above expects an empty
   * filtered result, because a policy declined to show the row; here the policy
   * says yes - it is this venue's own dish - and referential integrity says no,
   * which is what makes `23503` the assertion rather than `[]`.
   *
   * What they are protecting is not the catalogue but the *wedding tree*: while
   * these FKs were `set null` / `cascade`, this same delete wrote `guests`,
   * `wedding_menu_selections` and `weddings` rows of a couple, through a role
   * that holds no policy on any of them. So each case checks the couple's side
   * is untouched, not merely that the statement failed.
   *
   * The tenant-retirement path is the one interaction not testable here:
   * deleting a `tenants` row needs privileges no anon-key session has, the same
   * limit `20260822000002` section 5 records. Verified with psql instead, in
   * both referential orders - see docs/supabase.md.
   */
  describe("hard delete once a couple has ordered", () => {
    /** Sorted, because neither query promises an order. */
    const byId = (rows: Array<{ id: string; menu_option_id: string | null }>) =>
      [...rows].sort((a, b) => a.id.localeCompare(b.id))

    it("refuses to delete a dish the couple is serving", async () => {
      const before = await guestDishes()

      const { data, error } = await venue
        .from("menu_options")
        .delete()
        .eq("id", PLATED_MAIN_A)
        .select("id")

      expect(error?.code).toBe("23503")
      expect(data).toBeNull()

      const { data: selection } = await couple
        .from("wedding_menu_selections")
        .select("menu_option_id")
        .eq("wedding_id", COUPLE_WEDDING)
        .eq("menu_option_id", PLATED_MAIN_A)

      expect(selection!.length).toBe(1)
      // The guests who were eating it are still eating it. This is the
      // assertion the whole phase is for: `set null` here was a venue writing
      // `guests`, a table its role may not even SELECT.
      expect(byId(await guestDishes())).toEqual(byId(before))
    })

    it("refuses to delete the course that dish is on", async () => {
      const { error } = await venue
        .from("menu_courses")
        .delete()
        .eq("id", PLATED_COURSE)
        .select("id")

      // The course itself is referenced by nothing in the wedding tree - the
      // delete cascades down to its options and the restrict fires there. Same
      // code, one level further in, which is why the CRM's `23503` branch is on
      // all three deletes and not just the dish.
      expect(error?.code).toBe("23503")

      const { data: course } = await venue
        .from("menu_courses")
        .select("id")
        .eq("id", PLATED_COURSE)
      expect(course!.length).toBe(1)
    })

    it("refuses to delete the package the couple ordered", async () => {
      const { error } = await venue
        .from("menu_packages")
        .delete()
        .eq("id", SERVED_PACKAGE)
        .select("id")

      expect(error?.code).toBe("23503")

      const { data: order } = await couple
        .from("weddings")
        .select("menu_package_id")
        .eq("id", COUPLE_WEDDING)
        .single()
      expect(order?.menu_package_id).toBe(SERVED_PACKAGE)
    })

    it("still deletes a dish nobody has ordered", async () => {
      // The other half of the claim, and the one that keeps `archived_at` from
      // becoming the only way out of a typo: a dish no selection and no guest
      // points at is still deletable. Created here rather than borrowing an
      // unpicked seeded main, so a failure leaves the fixture alone.
      const { data: created, error: insertError } = await venue
        .from("menu_options")
        .insert({
          tenant_id: BAGATELKA,
          menu_course_id: PLATED_COURSE,
          name: "Literowka",
        })
        .select("id")
        .single()

      expect(insertError).toBeNull()

      const { data, error } = await venue
        .from("menu_options")
        .delete()
        .eq("id", created!.id)
        .select("id")

      expect(error).toBeNull()
      expect(data).toEqual([{ id: created!.id }])
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

    // And the couple's order, which two tests above deliberately destroy and
    // restore. Six dishes, and the wedding still on MENU SERWOWANE.
    const { data: order } = await couple
      .from("weddings")
      .select("menu_package_id, wedding_menu_selections(menu_option_id)")
      .eq("id", COUPLE_WEDDING)
      .single()

    expect(order?.menu_package_id).toBe(SERVED_PACKAGE)
    expect(order?.wedding_menu_selections.length).toBe(
      SEEDED_SELECTION_IDS.length
    )
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
