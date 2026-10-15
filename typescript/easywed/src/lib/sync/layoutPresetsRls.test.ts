import { createClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Json } from "@/lib/supabase.types"
import type { LayoutPresetPayload } from "@/lib/sync/layoutPresets"
import { rekeyLayout } from "@/lib/sync/layoutPresets"

/**
 * Venue layout presets (20261007000001), asserted against a real PostgreSQL
 * with real RLS: staff own their venue's presets, couples linked to that venue
 * read them, and nobody else reaches either.
 *
 * Skipped, not failed, when the local stack is down - see venueRls.test.ts.
 *
 * Fixtures come from supabase/seed.sql: owner@easywed.test is a couple linked
 * to `bagatelka`; editor@ and viewer@ are the other two members of that
 * wedding. The cross-tenant negatives use editor@ rather than owner@, because
 * menuRls.test.ts briefly links one of owner@'s throwaway weddings to `dworek`
 * and the suites run concurrently against one database.
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_KEY ?? import.meta.env.VITE_SUPABASE_KEY

const BAGATELKA = "50000000-0000-4000-8000-000000000001"
const DWOREK = "50000000-0000-4000-8000-000000000002"

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

const HALL = "a0000000-0000-4000-8000-000000000001"

/** One rectangular hall, two tables, a stage - in the RPC's row shape. */
const PAYLOAD: LayoutPresetPayload = {
  halls: [
    {
      id: HALL,
      name: "Sala glowna",
      floor: null,
      preset: "rectangle",
      width: 20,
      height: 12,
      pos_x: 0,
      pos_y: 0,
      geometry: null,
    },
  ],
  tables: [
    {
      id: "a1000000-0000-4000-8000-000000000001",
      hall_id: HALL,
      name: "Stol 1",
      shape: "round",
      capacity: 8,
      width: 1.8,
      height: 1.8,
      rotation: 0,
      pos_x: 3,
      pos_y: 3,
      geometry: null,
    },
    {
      id: "a1000000-0000-4000-8000-000000000002",
      hall_id: HALL,
      name: "Stol Pary Mlodej",
      shape: "rectangular",
      capacity: 6,
      width: 3,
      height: 1,
      rotation: 0,
      pos_x: 8,
      pos_y: 1,
      geometry: null,
    },
  ],
  fixtures: [
    {
      id: "a2000000-0000-4000-8000-000000000001",
      hall_id: HALL,
      name: "Scena",
      shape: "rectangle",
      width: 4,
      height: 2,
      rotation: 0,
      pos_x: 14,
      pos_y: 8,
      geometry: null,
    },
  ],
}

const asRow = (tenantId: string, name: string) => ({
  tenant_id: tenantId,
  name,
  halls: PAYLOAD.halls as unknown as Json,
  tables: PAYLOAD.tables as unknown as Json,
  fixtures: PAYLOAD.fixtures as unknown as Json,
})

describe.skipIf(!reachable)("venue layout presets", () => {
  // Owner of `bagatelka`, whose presets these are.
  let venue: SupabaseClient<Database>
  // Owner of `dworek`: staff of a real tenant, so every "reads zero" below is
  // about scope rather than about being anonymous.
  let otherVenue: SupabaseClient<Database>
  // owner@: a couple linked to bagatelka, and the one who applies a preset.
  let couple: SupabaseClient<Database>
  // The other two members of that wedding - linked through it, never a
  // 'customer' of the venue themselves.
  let editor: SupabaseClient<Database>
  let viewer: SupabaseClient<Database>

  let presetId: string
  let otherPresetId: string

  beforeAll(async () => {
    ;[venue, otherVenue, couple, editor, viewer] = await Promise.all([
      signIn("venue@easywed.test"),
      signIn("venue2@easywed.test"),
      signIn("owner@easywed.test"),
      signIn("editor@easywed.test"),
      signIn("viewer@easywed.test"),
    ])

    const mine = await venue
      .from("layout_presets")
      .insert(asRow(BAGATELKA, "Uklad weselny 120 osob"))
      .select("id")
      .single()
    if (mine.error) throw mine.error
    presetId = mine.data.id

    const theirs = await otherVenue
      .from("layout_presets")
      .insert(asRow(DWOREK, "Dworek - sala kominkowa"))
      .select("id")
      .single()
    if (theirs.error) throw theirs.error
    otherPresetId = theirs.data.id
  })

  afterAll(async () => {
    if (!reachable) return
    await venue.from("layout_presets").delete().eq("id", presetId)
    await otherVenue.from("layout_presets").delete().eq("id", otherPresetId)
  })

  describe("staff", () => {
    it("read their own venue's presets and no other venue's", async () => {
      const own = await venue
        .from("layout_presets")
        .select("id")
        .eq("id", presetId)
      expect(own.data).toHaveLength(1)

      const foreign = await venue
        .from("layout_presets")
        .select("id")
        .eq("id", otherPresetId)
      expect(foreign.data).toHaveLength(0)
    })

    it("cannot create a preset in another venue", async () => {
      const { error } = await venue
        .from("layout_presets")
        .insert(asRow(DWOREK, "Planted"))
      expect(error?.code).toBe("42501")
    })

    it("cannot move a preset into another venue", async () => {
      const { error } = await venue
        .from("layout_presets")
        .update({ tenant_id: DWOREK })
        .eq("id", presetId)
      expect(error?.code).toBe("42501")
    })

    it("can archive and restore their own preset", async () => {
      const archived = await venue
        .from("layout_presets")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", presetId)
        .select("id")
      expect(archived.data).toHaveLength(1)

      const restored = await venue
        .from("layout_presets")
        .update({ archived_at: null })
        .eq("id", presetId)
        .select("id")
      expect(restored.data).toHaveLength(1)
    })

    it("cannot reach another venue's preset to update or delete it", async () => {
      const updated = await otherVenue
        .from("layout_presets")
        .update({ name: "Hijacked" })
        .eq("id", presetId)
        .select("id")
      expect(updated.data).toHaveLength(0)

      const deleted = await otherVenue
        .from("layout_presets")
        .delete()
        .eq("id", presetId)
        .select("id")
      expect(deleted.data).toHaveLength(0)
    })
  })

  describe("the payload shape check", () => {
    it.each([
      ["no hall", { halls: [] as Array<never> }],
      ["halls not an array", { halls: { id: HALL } }],
      ["tables not an array", { tables: "nope" }],
    ])("refuses a preset with %s", async (_label, override) => {
      const { error } = await venue
        .from("layout_presets")
        .insert({ ...asRow(BAGATELKA, "Broken"), ...override } as never)
      expect(error?.code).toBe("23514")
    })

    it("refuses a blank name", async () => {
      const { error } = await venue
        .from("layout_presets")
        .insert(asRow(BAGATELKA, "   "))
      expect(error?.code).toBe("23514")
    })
  })

  describe("couples", () => {
    it("every member of a linked wedding reads the venue's presets", async () => {
      for (const member of [couple, editor, viewer]) {
        const { data } = await member
          .from("layout_presets")
          .select("id, name, halls, tables, fixtures")
          .eq("id", presetId)
        expect(data).toHaveLength(1)
        expect(data![0].tables).toHaveLength(2)
      }
    })

    it("read no preset of a venue they are not linked to", async () => {
      for (const member of [editor, viewer]) {
        const { data } = await member
          .from("layout_presets")
          .select("id")
          .eq("tenant_id", DWOREK)
        expect(data).toHaveLength(0)
      }
    })

    it("cannot create, edit or delete a preset", async () => {
      const inserted = await couple
        .from("layout_presets")
        .insert(asRow(BAGATELKA, "Couple's own"))
      expect(inserted.error?.code).toBe("42501")

      const updated = await couple
        .from("layout_presets")
        .update({ name: "Renamed by couple" })
        .eq("id", presetId)
        .select("id")
      expect(updated.data).toHaveLength(0)

      const deleted = await couple
        .from("layout_presets")
        .delete()
        .eq("id", presetId)
        .select("id")
      expect(deleted.data).toHaveLength(0)
    })

    /**
     * The apply path end to end: the stored payload, re-keyed, is accepted by
     * `replace_planner_layout` as-is. Applied **twice** to two weddings, which
     * is the case `rekeyLayout` exists for - the ids are primary keys, and a
     * second wedding using the same preset would otherwise collide.
     *
     * Throwaway weddings, never the seeded one: the RPC hard-deletes the whole
     * layout every other suite reads.
     */
    it("applies to two weddings without the ids colliding", async () => {
      const userId = (await couple.auth.getUser()).data.user!.id
      const { data: stored } = await couple
        .from("layout_presets")
        .select("halls, tables, fixtures")
        .eq("id", presetId)
        .single()
      const payload = stored as unknown as LayoutPresetPayload

      const scratch = [crypto.randomUUID(), crypto.randomUUID()]
      try {
        for (const id of scratch) {
          const created = await couple
            .from("weddings")
            .insert({ id, owner_id: userId, name: "Preset probe" })
          expect(created.error).toBeNull()

          const layout = rekeyLayout(payload)
          const applied = await couple.rpc("replace_planner_layout", {
            p_wedding_id: id,
            p_halls: layout.halls as unknown as Json,
            p_tables: layout.tables as unknown as Json,
            p_fixtures: layout.fixtures as unknown as Json,
          })
          expect(applied.error).toBeNull()

          const [halls, tables, fixtures] = await Promise.all([
            couple.from("halls").select("id").eq("wedding_id", id),
            couple.from("tables").select("name").eq("wedding_id", id),
            couple.from("fixtures").select("id").eq("wedding_id", id),
          ])
          expect(halls.data).toHaveLength(1)
          expect(tables.data?.map((t) => t.name).sort()).toEqual([
            "Stol 1",
            "Stol Pary Mlodej",
          ])
          expect(fixtures.data).toHaveLength(1)
        }
      } finally {
        await couple.from("weddings").delete().in("id", scratch)
      }
    })
  })

  describe("strangers", () => {
    it("an anonymous client reads nothing", async () => {
      const { data } = await client().from("layout_presets").select("id")
      expect(data).toHaveLength(0)
    })
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
