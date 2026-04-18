import type {
  Dietary,
  Guest,
  HallPreset,
  Table,
  TableShape,
} from "@/stores/planner.store"
import type { Reminder } from "@/stores/reminders.store"
import { supabase } from "@/lib/supabase"
import { useGlobalStore } from "@/stores/global.store"
import { usePlannerStore } from "@/stores/planner.store"
import { useRemindersStore } from "@/stores/reminders.store"

export const loadWedding = async (id: string) => {
  const [weddingRes, hallRes, tablesRes, guestsRes, remindersRes] =
    await Promise.all([
      supabase.from("weddings").select("id, name, date").eq("id", id).single(),

      supabase
        .from("halls")
        .select("preset, width, height")
        .eq("wedding_id", id)
        .maybeSingle(),

      supabase
        .from("tables")
        .select("id, name, shape, capacity, width, height, pos_x, pos_y")
        .eq("wedding_id", id)
        .is("deleted_at", null),

      supabase
        .from("guests")
        .select("id, name, dietary, note, table_id")
        .eq("wedding_id", id)
        .is("deleted_at", null),

      supabase
        .from("reminders")
        .select("id, text, due, status, created_at, updated_at")
        .eq("wedding_id", id),
    ])

  if (weddingRes.error) throw weddingRes.error
  if (hallRes.error) throw hallRes.error
  if (tablesRes.error) throw tablesRes.error
  if (guestsRes.error) throw guestsRes.error
  if (remindersRes.error) throw remindersRes.error

  useGlobalStore.setState({
    weddingId: id,
    name: weddingRes.data.name || undefined,
    date: weddingRes.data.date ? new Date(weddingRes.data.date) : undefined,
  })

  const tables: Array<Table> = tablesRes.data.map((t) => ({
    id: t.id,
    name: t.name,
    shape: t.shape as TableShape,
    capacity: t.capacity,
    size: { width: Number(t.width), height: Number(t.height) },
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

  usePlannerStore.setState({ tables, guests, hall })

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
