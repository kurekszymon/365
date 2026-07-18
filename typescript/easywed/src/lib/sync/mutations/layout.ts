import type { Fixture, Hall, Table } from "@/stores/planner.store"
import type { Json } from "@/lib/supabase.types"
import { supabase } from "@/lib/supabase"
import {
  fixtureRow,
  getWeddingId,
  hallRow,
  run,
  tableRow,
} from "@/lib/sync/mutations/shared"

// Atomic counterpart to per-row inserts: replaces the entire planner layout
// for a wedding in a single transaction via the `replace_planner_layout` RPC.
// Used by the local-wedding migration (MigrateLocalWeddingDialog) when a
// signed-in user adopts a guest-mode plan.
export const replacePlannerLayout = (
  halls: Array<Hall>,
  tables: Array<Table>,
  fixtures: Array<Fixture>
): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "replacePlannerLayout",
    supabase.rpc("replace_planner_layout", {
      p_wedding_id: weddingId,
      p_halls: halls.map(hallRow) as unknown as Json,
      p_tables: tables.map(tableRow) as unknown as Json,
      p_fixtures: fixtures.map(fixtureRow) as unknown as Json,
    })
  )
}
