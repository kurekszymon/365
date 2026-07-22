import type {
  Fixture,
  FixtureShape,
  Geometry,
  TableRotation,
} from "@/stores/planner.store"
import { supabase } from "@/lib/supabase"
import {
  fixtureRow,
  getWeddingId,
  markDeleted,
  markDeletedMany,
  run,
  updatePos,
  withGeometry,
} from "@/lib/sync/mutations/shared"

export const insertFixture = (fixture: Fixture): Promise<boolean> => {
  const weddingId = getWeddingId()
  if (!weddingId) return Promise.resolve(false)
  return run(
    "insertFixture",
    supabase
      .from("fixtures")
      .insert({ ...fixtureRow(fixture), wedding_id: weddingId })
  )
}

export const updateFixtureRow = (
  id: string,
  fields: {
    name?: string
    shape?: FixtureShape
    width?: number
    height?: number
    rotation?: TableRotation
    geometry?: Geometry | null
    // Shape edits ride the position along (a re-anchored outline shifts the
    // bbox origin) so shape + geometry + position land in one write.
    pos_x?: number
    pos_y?: number
  }
): Promise<boolean> =>
  run(
    "updateFixtureRow",
    supabase.from("fixtures").update(withGeometry(fields)).eq("id", id)
  )

export const updateFixturePos = (
  id: string,
  x: number,
  y: number,
  hallId?: string
): Promise<boolean> => updatePos("fixtures", id, x, y, hallId)

export const softDeleteFixture = (id: string): Promise<boolean> =>
  markDeleted("fixtures", id)

// Bulk counterpart for wiping a hall's fixtures (deleteHall): one soft-delete
// covering every id. Fixtures have no guests to unassign, so this is a thin
// wrapper over markDeletedMany.
export const softDeleteFixtures = (ids: Array<string>): Promise<boolean> =>
  markDeletedMany("fixtures", ids)
