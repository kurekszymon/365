import type { Fixture, Hall, Table } from "@/stores/planner.store"
import type { Json } from "@/lib/supabase.types"
import type { FixtureRow, HallRow, TableRow } from "@/lib/sync/rows"
import { supabase } from "@/lib/supabase"
import { fixtureRow, hallRow, run, tableRow } from "@/lib/sync/mutations/shared"

/**
 * A venue's saved room layouts (`layout_presets`, 20261007000001), and the
 * couple's way of starting from one.
 *
 * A preset is a snapshot in exactly the shape `replace_planner_layout` takes,
 * so applying one is a re-key plus that RPC. The copy is the whole model: the
 * couple's edits never reach the preset and the venue's later edits never reach
 * a wedding that already used it.
 *
 * The venue-side calls stand outside `run()`, for the reason `sync/venue.ts`
 * gives: `run()` gates on `selectCanEdit` for the *loaded wedding*, and saving a
 * preset is a write to the venue's catalogue, authorized by `is_tenant_staff`.
 * Only the apply - a write to the couple's wedding - goes through `run()`.
 */

/** Payload rows as stored. Tables carry no `seats`: see `snapshotLayout`. */
type PresetTableRow = Omit<TableRow, "seats">

export type LayoutPresetPayload = {
  halls: Array<HallRow>
  tables: Array<PresetTableRow>
  fixtures: Array<FixtureRow>
}

export type LayoutPreset = LayoutPresetPayload & {
  id: string
  tenantId: string
  name: string
  createdAt: string
}

const COLUMNS = "id, tenant_id, name, halls, tables, fixtures, created_at"

type PresetRow = {
  id: string
  tenant_id: string
  name: string
  halls: Json
  tables: Json
  fixtures: Json
  created_at: string
}

const toPreset = (row: PresetRow): LayoutPreset => ({
  id: row.id,
  tenantId: row.tenant_id,
  name: row.name,
  createdAt: row.created_at,
  halls: row.halls as unknown as Array<HallRow>,
  tables: row.tables as unknown as Array<PresetTableRow>,
  fixtures: row.fixtures as unknown as Array<FixtureRow>,
})

/**
 * The current layout as a preset payload.
 *
 * `seats` is dropped on purpose. It holds per-seat overrides of a table the
 * couple has been seating at, and a preset is a room, not anyone's seating -
 * the RPC ignores the field anyway, so keeping it would only store data nobody
 * reads.
 */
export const snapshotLayout = (
  halls: Array<Hall>,
  tables: Array<Table>,
  fixtures: Array<Fixture>
): LayoutPresetPayload => ({
  halls: halls.map(hallRow),
  tables: tables.map((t) => {
    const { seats, ...row } = tableRow(t)
    void seats
    return row
  }),
  fixtures: fixtures.map(fixtureRow),
})

/**
 * The same layout under fresh ids.
 *
 * Required, not tidy: hall/table/fixture ids are primary keys and the RPC
 * inserts them as given, so a second wedding applying the same preset would
 * collide with the first. A table or fixture whose hall is not in the preset is
 * dropped rather than inserted pointing nowhere.
 */
export const rekeyLayout = (
  payload: LayoutPresetPayload,
  newId: () => string = () => crypto.randomUUID()
): LayoutPresetPayload => {
  const hallIds = new Map(payload.halls.map((h) => [h.id, newId()]))
  const inHall = <T extends { hall_id: string | null }>(row: T) =>
    row.hall_id !== null && hallIds.has(row.hall_id)

  return {
    halls: payload.halls.map((h) => ({ ...h, id: hallIds.get(h.id)! })),
    tables: payload.tables.filter(inHall).map((t) => ({
      ...t,
      id: newId(),
      hall_id: hallIds.get(t.hall_id!)!,
    })),
    fixtures: payload.fixtures.filter(inHall).map((f) => ({
      ...f,
      id: newId(),
      hall_id: hallIds.get(f.hall_id!)!,
    })),
  }
}

/** Active presets of one venue, oldest first. RLS decides who gets rows. */
export const fetchLayoutPresets = async (
  tenantId: string
): Promise<Array<LayoutPreset> | null> => {
  const { data, error } = await supabase
    .from("layout_presets")
    .select(COLUMNS)
    .eq("tenant_id", tenantId)
    .is("archived_at", null)
    .order("created_at")

  if (error) {
    console.error("[layoutPresets] fetch failed", error)
    return null
  }
  return data.map(toPreset)
}

export const saveLayoutPreset = async (
  tenantId: string,
  name: string,
  payload: LayoutPresetPayload
): Promise<boolean> => {
  const { error } = await supabase.from("layout_presets").insert({
    tenant_id: tenantId,
    name: name.trim(),
    halls: payload.halls as unknown as Json,
    tables: payload.tables as unknown as Json,
    fixtures: payload.fixtures as unknown as Json,
  })

  if (error) {
    console.error("[layoutPresets] save failed", error)
    return false
  }
  return true
}

/**
 * Archives rather than deletes, so a retired layout can be brought back by
 * hand. Nothing in the wedding tree points here, so either would be safe.
 *
 * `.select("id")` because RLS turns an UPDATE it does not admit into zero rows
 * and no error - without it a refusal would read as success.
 */
export const archiveLayoutPreset = async (id: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from("layout_presets")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")

  if (error || data.length === 0) {
    console.error("[layoutPresets] archive failed", error)
    return false
  }
  return true
}

/**
 * Replaces the wedding's whole layout with a copy of the preset.
 *
 * Destructive by design, and the caller must have said so to the user first:
 * `replace_planner_layout` hard-deletes every hall, table and fixture, and the
 * guests seated at those tables come out unassigned (`guests.table_id` is
 * `on delete set null`). The caller reloads the wedding afterwards - the store
 * still holds the old layout.
 */
export const applyLayoutPreset = (
  weddingId: string,
  preset: LayoutPresetPayload
): Promise<boolean> => {
  const layout = rekeyLayout(preset)
  return run(
    "applyLayoutPreset",
    supabase.rpc("replace_planner_layout", {
      p_wedding_id: weddingId,
      p_halls: layout.halls as unknown as Json,
      p_tables: layout.tables as unknown as Json,
      p_fixtures: layout.fixtures as unknown as Json,
    })
  )
}
