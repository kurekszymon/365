import type {
  Dietary,
  Fixture,
  FixtureShape,
  Guest,
  HallPreset,
  Table,
  TableRotation,
  TableShape,
} from "@/stores/planner.store"
import type { Reminder } from "@/stores/reminders.store"
import type { WeddingRole } from "@/stores/global.store"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { usePlannerStore } from "@/stores/planner.store"
import { useRemindersStore } from "@/stores/reminders.store"

export const loadWedding = async (id: string, signal: AbortSignal) => {
  const userId = useAuthStore.getState().session?.user.id

  const [
    weddingRes,
    hallRes,
    tablesRes,
    guestsRes,
    remindersRes,
    memberRes,
    fixturesRes,
  ] = await Promise.all([
    supabase
      .from("weddings")
      .select("id, name, date")
      .eq("id", id)
      .abortSignal(signal)
      .single(),

    supabase
      .from("halls")
      .select("preset, width, height")
      .eq("wedding_id", id)
      .abortSignal(signal)
      .maybeSingle(),

    supabase
      .from("tables")
      .select(
        "id, name, shape, capacity, width, height, rotation, pos_x, pos_y"
      )
      .eq("wedding_id", id)
      .is("deleted_at", null)
      .abortSignal(signal),

    supabase
      .from("guests")
      .select("id, name, dietary, note, table_id")
      .eq("wedding_id", id)
      .is("deleted_at", null)
      .abortSignal(signal),

    supabase
      .from("reminders")
      .select("id, text, due, status, created_at, updated_at")
      .eq("wedding_id", id)
      .abortSignal(signal),

    userId
      ? supabase
          .from("wedding_members")
          .select("role")
          .eq("wedding_id", id)
          .eq("user_id", userId)
          .abortSignal(signal)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    supabase
      .from("fixtures")
      .select("id, name, shape, width, height, rotation, pos_x, pos_y")
      .eq("wedding_id", id)
      .is("deleted_at", null)
      .abortSignal(signal),
  ])

  if (weddingRes.error) throw weddingRes.error
  if (hallRes.error) throw hallRes.error
  if (tablesRes.error) throw tablesRes.error
  if (guestsRes.error) throw guestsRes.error
  if (remindersRes.error) throw remindersRes.error
  if (memberRes.error) throw memberRes.error
  if (fixturesRes.error) throw fixturesRes.error

  useGlobalStore.setState({
    weddingId: id,
    name: weddingRes.data.name || undefined,
    date: weddingRes.data.date ? new Date(weddingRes.data.date) : undefined,
    role: (memberRes.data?.role as WeddingRole | undefined) ?? undefined,
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

  const guests: Array<Guest> = guestsRes.data.map((g) => ({
    id: g.id,
    name: g.name,
    dietary: g.dietary as Array<Dietary>,
    tableId: g.table_id,
    note: g.note ?? undefined,
  }))

  const hall = hallRes.data
    ? {
        preset: hallRes.data.preset as HallPreset,
        dimensions: {
          width: Number(hallRes.data.width),
          height: Number(hallRes.data.height),
        },
      }
    : { preset: undefined, dimensions: { width: 20, height: 12 } }

  const fixtures: Array<Fixture> = fixturesRes.data.map((f) => ({
    id: f.id,
    name: f.name,
    shape: f.shape as FixtureShape,
    size: { width: Number(f.width), height: Number(f.height) },
    rotation: f.rotation as TableRotation,
    position: { x: Number(f.pos_x), y: Number(f.pos_y) },
  }))

  usePlannerStore.setState({ tables, guests, hall, fixtures })

  const reminders: Array<Reminder> = remindersRes.data.map((r) => ({
    uuid: r.id,
    text: r.text,
    due: r.due ? new Date(r.due) : undefined,
    status: r.status as "open" | "completed",
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }))

  useRemindersStore.setState({ reminders })
}
