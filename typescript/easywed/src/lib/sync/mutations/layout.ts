import type { Fixture, HallPreset, Table } from "@/stores/planner.store"
import type { Json } from "@/lib/supabase.types"
import { supabase } from "@/lib/supabase"
import {
  fixtureRow,
  getWeddingId,
  run,
  tableRow,
} from "@/lib/sync/mutations/shared"

// Atomic counterpart to per-row inserts: replaces the entire planner layout
// for a wedding in a single transaction via the `replace_planner_layout` RPC.
// Used by the DXF import wizard once the user confirms the preview.
export const replacePlannerLayout = (
  hall: { preset: HallPreset; width: number; height: number },
  tables: Array<Table>,
  fixtures: Array<Fixture>
): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "replacePlannerLayout",
    supabase.rpc("replace_planner_layout", {
      p_wedding_id: weddingId,
      p_hall_preset: hall.preset,
      p_hall_width: hall.width,
      p_hall_height: hall.height,
      p_tables: tables.map(tableRow) as unknown as Json,
      p_fixtures: fixtures.map(fixtureRow) as unknown as Json,
    })
  )
}
