import type {
  Guest,
  HallPreset,
  Table,
  TableShape,
} from "@/stores/planner.store"
import type { Reminder } from "@/stores/reminders.store"
import { supabase } from "@/lib/supabase"
import { useGlobalStore } from "@/stores/global.store"

const getWeddingId = () => {
  const id = useGlobalStore.getState().weddingId
  if (!id) throw new Error("[sync] no wedding loaded")
  return id
}

const log = (label: string, error: unknown) =>
  console.error(`[sync] ${label}`, error)

export const updateWedding = async (updates: {
  name?: string
  date?: string | null
}) => {
  const weddingId = useGlobalStore.getState().weddingId
  if (!weddingId) return
  const { error } = await supabase
    .from("weddings")
    .update(updates)
    .eq("id", weddingId)
  if (error) log("updateWedding", error)
}

export const upsertHall = async (
  preset: HallPreset,
  width: number,
  height: number
) => {
  const { error } = await supabase.from("halls").upsert(
    {
      wedding_id: getWeddingId(),
      preset,
      width,
      height,
    },
    { onConflict: "wedding_id" }
  )
  if (error) log("upsertHall", error)
}

export const insertTable = async (table: Table) => {
  const { error } = await supabase.from("tables").insert({
    id: table.id,
    wedding_id: getWeddingId(),
    name: table.name,
    shape: table.shape,
    capacity: table.capacity,
    width: table.size.width,
    height: table.size.height,
    pos_x: table.position.x,
    pos_y: table.position.y,
  })
  if (error) log("insertTable", error)
}

export const updateTableRow = async (
  id: string,
  fields: {
    name?: string
    shape?: TableShape
    capacity?: number
    width?: number
    height?: number
  }
) => {
  const { error } = await supabase.from("tables").update(fields).eq("id", id)
  if (error) log("updateTableRow", error)
}

export const updateTablePos = async (id: string, x: number, y: number) => {
  const { error } = await supabase
    .from("tables")
    .update({ pos_x: x, pos_y: y })
    .eq("id", id)
  if (error) log("updateTablePos", error)
}

export const softDeleteTable = async (id: string) => {
  const unassign = await supabase
    .from("guests")
    .update({ table_id: null })
    .eq("table_id", id)
  if (unassign.error) log("softDeleteTable unassign", unassign.error)

  const del = await supabase
    .from("tables")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
  if (del.error) log("softDeleteTable", del.error)
}

export const insertGuest = async (guest: Guest) => {
  const { error } = await supabase.from("guests").insert({
    id: guest.id,
    wedding_id: getWeddingId(),
    name: guest.name,
    dietary: guest.dietary,
    note: guest.note ?? null,
    table_id: guest.tableId,
  })
  if (error) log("insertGuest", error)
}

export const updateGuestTable = async (
  guestId: string,
  tableId: string | null
) => {
  const { error } = await supabase
    .from("guests")
    .update({ table_id: tableId })
    .eq("id", guestId)
  if (error) log("updateGuestTable", error)
}

export const reassignTableGuests = async (
  tableId: string,
  guestIds: Array<string>
) => {
  const unassign = await supabase
    .from("guests")
    .update({ table_id: null })
    .eq("table_id", tableId)
  if (unassign.error) log("reassignTableGuests unassign", unassign.error)

  if (guestIds.length === 0) return

  const assign = await supabase
    .from("guests")
    .update({ table_id: tableId })
    .in("id", guestIds)
  if (assign.error) log("reassignTableGuests assign", assign.error)
}

export const insertReminder = async (reminder: Reminder) => {
  const { error } = await supabase.from("reminders").insert({
    id: reminder.uuid,
    wedding_id: getWeddingId(),
    text: reminder.text,
    due: reminder.due ? reminder.due.toISOString() : null,
    status: reminder.status,
  })
  if (error) log("insertReminder", error)
}

export const updateReminderStatus = async (
  uuid: string,
  status: Reminder["status"]
) => {
  const { error } = await supabase
    .from("reminders")
    .update({ status })
    .eq("id", uuid)
  if (error) log("updateReminderStatus", error)
}
