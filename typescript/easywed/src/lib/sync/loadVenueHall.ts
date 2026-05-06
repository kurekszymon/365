import type {
  Fixture,
  FixtureShape,
  HallPreset,
  Table,
  TableRotation,
  TableShape,
} from "@/stores/planner.store"
import { supabase } from "@/lib/supabase"
import { useGlobalStore } from "@/stores/global.store"
import { usePlannerStore } from "@/stores/planner.store"
import { useRemindersStore } from "@/stores/reminders.store"

// Hydrate the planner store from a venue_hall row + its template tables and
// fixtures. Mirrors loadWedding.ts but writes the planner with subjectKind=
// 'venue_hall' so subsequent mutations route to the venue_hall_* tables.
//
// Templates have no guests or reminders, so those slices are reset to empty.
export const loadVenueHall = async (id: string, signal: AbortSignal) => {
  const [hallRes, tablesRes, fixturesRes] = await Promise.all([
    supabase
      .from("venue_halls")
      .select("id, venue_id, name, description, preset, width, height, is_public")
      .eq("id", id)
      .abortSignal(signal)
      .single(),

    supabase
      .from("venue_hall_tables")
      .select(
        "id, name, shape, capacity, width, height, rotation, pos_x, pos_y"
      )
      .eq("hall_id", id)
      .is("deleted_at", null)
      .abortSignal(signal),

    supabase
      .from("venue_hall_fixtures")
      .select("id, name, shape, width, height, rotation, pos_x, pos_y")
      .eq("hall_id", id)
      .is("deleted_at", null)
      .abortSignal(signal),
  ])

  if (hallRes.error) throw hallRes.error
  if (tablesRes.error) throw tablesRes.error
  if (fixturesRes.error) throw fixturesRes.error

  useGlobalStore.setState({
    weddingId: undefined,
    subjectKind: "venue_hall",
    subjectId: id,
    name: hallRes.data.name || undefined,
    date: undefined,
    role: undefined,
  })

  const tables: Array<Table> = tablesRes.data.map((t) => ({
    id: t.id,
    name: t.name,
    shape: t.shape as TableShape,
    capacity: t.capacity,
    size: { width: Number(t.width), height: Number(t.height) },
    rotation: t.rotation as TableRotation,
    position: { x: Number(t.pos_x), y: Number(t.pos_y) },
  }))

  const fixtures: Array<Fixture> = fixturesRes.data.map((f) => ({
    id: f.id,
    name: f.name,
    shape: f.shape as FixtureShape,
    size: { width: Number(f.width), height: Number(f.height) },
    rotation: f.rotation as TableRotation,
    position: { x: Number(f.pos_x), y: Number(f.pos_y) },
  }))

  const hall = {
    preset: hallRes.data.preset as HallPreset,
    dimensions: {
      width: Number(hallRes.data.width),
      height: Number(hallRes.data.height),
    },
  }

  usePlannerStore.setState({ tables, fixtures, hall, guests: [] })
  useRemindersStore.setState({ reminders: [] })

  return {
    venueId: hallRes.data.venue_id,
    name: hallRes.data.name,
    description: hallRes.data.description,
    isPublic: hallRes.data.is_public,
  }
}
