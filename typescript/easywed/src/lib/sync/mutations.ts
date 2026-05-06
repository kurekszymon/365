import type {
  Fixture,
  FixtureShape,
  Guest,
  HallPreset,
  Table,
  TableRotation,
  TableShape,
} from "@/stores/planner.store"
import type { Reminder } from "@/stores/reminders.store"
import type { SubjectKind } from "@/stores/global.store"
import { supabase } from "@/lib/supabase"
import { useGlobalStore } from "@/stores/global.store"

// Resolve the current planner subject. The planner UI is reused for editing
// either a wedding (writes to public.tables/fixtures/halls) or a venue hall
// template (writes to public.venue_hall_tables/fixtures and venue_halls).
// Mutations that are wedding-only (guests, reminders, wedding metadata)
// short-circuit when subjectKind is not 'wedding'.
const getSubject = (): { kind: SubjectKind; id: string } | null => {
  const { subjectKind, subjectId, weddingId } = useGlobalStore.getState()
  const id =
    subjectKind === "wedding" ? (subjectId ?? weddingId) : subjectId
  if (!id) {
    console.warn("[sync] no subject loaded; skipping mutation")
    return null
  }
  return { kind: subjectKind, id }
}

const getWeddingId = (): string | null => {
  const { subjectKind, weddingId } = useGlobalStore.getState()
  if (subjectKind !== "wedding" || !weddingId) {
    return null
  }
  return weddingId
}

const log = (label: string, error: unknown) =>
  console.error(`[sync] ${label}`, error)

// Persist the planner subject's name/date. In wedding mode this updates
// public.weddings; in venue_hall mode only the name is meaningful (halls
// have no date) and it goes to public.venue_halls.
export const updateWedding = async (updates: {
  name?: string
  date?: string | null
}) => {
  const subject = getSubject()
  if (!subject) return

  if (subject.kind === "wedding") {
    const { error } = await supabase
      .from("weddings")
      .update(updates)
      .eq("id", subject.id)
    if (error) log("updateWedding", error)
    return
  }

  if (updates.name !== undefined) {
    const { error } = await supabase
      .from("venue_halls")
      .update({ name: updates.name })
      .eq("id", subject.id)
    if (error) log("updateWedding(venue)", error)
  }
}

export const upsertHall = async (
  preset: HallPreset,
  width: number,
  height: number
) => {
  const subject = getSubject()
  if (!subject) return

  if (subject.kind === "wedding") {
    const { error } = await supabase.from("halls").upsert(
      { wedding_id: subject.id, preset, width, height },
      { onConflict: "wedding_id" }
    )
    if (error) log("upsertHall", error)
    return
  }

  // venue_hall: the row already exists (venue dashboard created it before
  // navigating to the editor); just update preset + dimensions in place.
  const { error } = await supabase
    .from("venue_halls")
    .update({ preset, width, height })
    .eq("id", subject.id)
  if (error) log("upsertHall(venue)", error)
}

export const insertTable = async (table: Table): Promise<boolean> => {
  const subject = getSubject()
  if (!subject) return false

  const row = {
    id: table.id,
    name: table.name,
    shape: table.shape,
    capacity: table.capacity,
    width: table.size.width,
    height: table.size.height,
    rotation: table.rotation,
    pos_x: table.position.x,
    pos_y: table.position.y,
  }
  const { error } =
    subject.kind === "wedding"
      ? await supabase
          .from("tables")
          .insert({ ...row, wedding_id: subject.id })
      : await supabase
          .from("venue_hall_tables")
          .insert({ ...row, hall_id: subject.id })
  if (error) {
    log("insertTable", error)
    return false
  }
  return true
}

export const insertTables = async (tables: Array<Table>): Promise<boolean> => {
  const subject = getSubject()
  if (!subject || tables.length === 0) return false

  const rows = tables.map((table) => ({
    id: table.id,
    name: table.name,
    shape: table.shape,
    capacity: table.capacity,
    width: table.size.width,
    height: table.size.height,
    rotation: table.rotation,
    pos_x: table.position.x,
    pos_y: table.position.y,
  }))

  const { error } =
    subject.kind === "wedding"
      ? await supabase
          .from("tables")
          .insert(rows.map((r) => ({ ...r, wedding_id: subject.id })))
      : await supabase
          .from("venue_hall_tables")
          .insert(rows.map((r) => ({ ...r, hall_id: subject.id })))
  if (error) {
    log("insertTables", error)
    return false
  }
  return true
}

export const updateTableRow = async (
  id: string,
  fields: {
    name?: string
    shape?: TableShape
    capacity?: number
    width?: number
    height?: number
    rotation?: TableRotation
  }
): Promise<boolean> => {
  const { subjectKind } = useGlobalStore.getState()
  const tbl = subjectKind === "wedding" ? "tables" : "venue_hall_tables"
  const { error } = await supabase.from(tbl).update(fields).eq("id", id)
  if (error) {
    log("updateTableRow", error)
    return false
  }
  return true
}

export const updateTablePos = async (id: string, x: number, y: number) => {
  const { subjectKind } = useGlobalStore.getState()
  const tbl = subjectKind === "wedding" ? "tables" : "venue_hall_tables"
  const { error } = await supabase
    .from(tbl)
    .update({ pos_x: x, pos_y: y })
    .eq("id", id)
  if (error) log("updateTablePos", error)
}

export const softDeleteTable = async (id: string) => {
  const { subjectKind } = useGlobalStore.getState()
  if (subjectKind === "wedding") {
    const unassign = await supabase
      .from("guests")
      .update({ table_id: null })
      .eq("table_id", id)
    if (unassign.error) log("softDeleteTable unassign", unassign.error)
  }

  const tbl = subjectKind === "wedding" ? "tables" : "venue_hall_tables"
  const del = await supabase
    .from(tbl)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
  if (del.error) log("softDeleteTable", del.error)
}

export const insertGuest = async (guest: Guest) => {
  const weddingId = getWeddingId()
  if (!weddingId) return

  const { error } = await supabase.from("guests").insert({
    id: guest.id,
    wedding_id: weddingId,
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
  const weddingId = getWeddingId()
  if (!weddingId) return
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
  const weddingId = getWeddingId()
  if (!weddingId) return

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
  const weddingId = getWeddingId()
  if (!weddingId) return

  const { error } = await supabase.from("reminders").insert({
    id: reminder.uuid,
    wedding_id: weddingId,
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

export const insertFixture = async (fixture: Fixture): Promise<boolean> => {
  const subject = getSubject()
  if (!subject) return false

  const row = {
    id: fixture.id,
    name: fixture.name,
    shape: fixture.shape,
    width: fixture.size.width,
    height: fixture.size.height,
    rotation: fixture.rotation,
    pos_x: fixture.position.x,
    pos_y: fixture.position.y,
  }
  const { error } =
    subject.kind === "wedding"
      ? await supabase
          .from("fixtures")
          .insert({ ...row, wedding_id: subject.id })
      : await supabase
          .from("venue_hall_fixtures")
          .insert({ ...row, hall_id: subject.id })
  if (error) {
    log("insertFixture", error)
    return false
  }
  return true
}

export const updateFixtureRow = async (
  id: string,
  fields: {
    name?: string
    shape?: FixtureShape
    width?: number
    height?: number
    rotation?: TableRotation
  }
): Promise<boolean> => {
  const { subjectKind } = useGlobalStore.getState()
  const tbl = subjectKind === "wedding" ? "fixtures" : "venue_hall_fixtures"
  const { error } = await supabase.from(tbl).update(fields).eq("id", id)
  if (error) {
    log("updateFixtureRow", error)
    return false
  }
  return true
}

export const updateFixturePos = async (id: string, x: number, y: number) => {
  const { subjectKind } = useGlobalStore.getState()
  const tbl = subjectKind === "wedding" ? "fixtures" : "venue_hall_fixtures"
  const { error } = await supabase
    .from(tbl)
    .update({ pos_x: x, pos_y: y })
    .eq("id", id)
  if (error) log("updateFixturePos", error)
}

export const softDeleteFixture = async (id: string) => {
  const { subjectKind } = useGlobalStore.getState()
  const tbl = subjectKind === "wedding" ? "fixtures" : "venue_hall_fixtures"
  const { error } = await supabase
    .from(tbl)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
  if (error) log("softDeleteFixture", error)
}
