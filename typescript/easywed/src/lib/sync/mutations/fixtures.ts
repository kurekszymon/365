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
  }
): Promise<boolean> =>
  run(
    "updateFixtureRow",
    supabase.from("fixtures").update(withGeometry(fields)).eq("id", id)
  )

export const updateFixturePos = (
  id: string,
  x: number,
  y: number
): Promise<boolean> => updatePos("fixtures", id, x, y)

export const softDeleteFixture = (id: string): Promise<boolean> =>
  markDeleted("fixtures", id)
