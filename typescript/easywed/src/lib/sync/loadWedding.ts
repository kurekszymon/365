import type {
  Dietary,
  Fixture,
  FixtureShape,
  Geometry,
  Guest,
  Hall,
  HallPreset,
  Seat,
  Table,
  TableRotation,
  TableShape,
} from "@/stores/planner.store"
import type { Reminder } from "@/stores/reminders.store"
import type { WeddingRole } from "@/stores/global.store"
import { supabase } from "@/lib/supabase"
import {
  insertHall,
  updateFixturePos,
  updateTablePos,
} from "@/lib/sync/mutations"
import { DEFAULT_HALL, usePlannerStore } from "@/stores/planner.store"
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { useRemindersStore } from "@/stores/reminders.store"

export const loadWedding = async (id: string, signal: AbortSignal) => {
  const userId = useAuthStore.getState().session?.user.id

  const [
    weddingRes,
    hallsRes,
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
      .select("id, name, floor, preset, width, height, pos_x, pos_y, geometry")
      .eq("wedding_id", id)
      .order("created_at")
      .abortSignal(signal),

    supabase
      .from("tables")
      .select(
        "id, hall_id, name, shape, capacity, width, height, rotation, pos_x, pos_y, geometry, seats"
      )
      .eq("wedding_id", id)
      .is("deleted_at", null)
      .abortSignal(signal),

    supabase
      .from("guests")
      .select("id, name, dietary, note, table_id, seat_id")
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
      .select(
        "id, hall_id, name, shape, width, height, rotation, pos_x, pos_y, geometry"
      )
      .eq("wedding_id", id)
      .is("deleted_at", null)
      .abortSignal(signal),
  ])

  if (weddingRes.error) throw weddingRes.error
  if (hallsRes.error) throw hallsRes.error
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

  const halls: Array<Hall> = hallsRes.data.map((h) => {
    // Enforce the geometry <=> non-rectangle-preset invariant in both
    // directions at the load boundary (the DB CHECK guards it too; this
    // covers rows that predate the constraint): a polygon preset without
    // geometry falls back to rectangle, a rectangle's stray geometry is
    // dropped.
    const geometry =
      h.preset !== "rectangle"
        ? (h.geometry as unknown as Geometry | null)
        : null
    return {
      id: h.id,
      name: h.name,
      floor: h.floor,
      preset: geometry ? (h.preset as HallPreset) : "rectangle",
      size: { width: Number(h.width), height: Number(h.height) },
      position: { x: Number(h.pos_x), y: Number(h.pos_y) },
      ...(geometry ? { geometry } : {}),
    }
  })

  // Self-healing for rows without a hall: the migration backfilled hall_id,
  // but a fire-and-forget insert race (or a hall row deleted server-side via
  // `on delete set null`) can still leave orphans. Adopt them into the first
  // hall - creating a default one when entities exist but no hall does - and
  // repair the rows in the background. The fallback insert is awaited: the
  // orphan backfill below and any user mutation against the adoptive hall
  // reference its id, so it must exist server-side first or they FK-violate.
  //
  // Known race: two clients loading a hall-less wedding at once each insert
  // their own fallback hall, leaving a duplicate. Accepted - the state is
  // already anomalous and the surplus hall is visible/deletable in the UI.
  const hasOrphans =
    tablesRes.data.some((t) => !t.hall_id) ||
    fixturesRes.data.some((f) => !f.hall_id)
  let adoptiveHallPersisted = true
  if (
    halls.length === 0 &&
    (tablesRes.data.length > 0 || fixturesRes.data.length > 0)
  ) {
    const fallback: Hall = {
      ...DEFAULT_HALL,
      id: crypto.randomUUID(),
      position: { x: 0, y: 0 },
    }
    halls.push(fallback)
    adoptiveHallPersisted = await insertHall(fallback)
  }
  const adoptiveHallId = halls[0]?.id

  const tables: Array<Table> = tablesRes.data.map((t) => ({
    id: t.id,
    name: t.name,
    shape: t.shape as TableShape,
    capacity: t.capacity,
    size: { width: Number(t.width), height: Number(t.height) },
    rotation: t.rotation as TableRotation,
    position: { x: Number(t.pos_x), y: Number(t.pos_y) },
    hallId: t.hall_id ?? adoptiveHallId,
    // Json -> Geometry needs the unknown hop (see toJsonOrNull in
    // mutations/shared.ts for the inverse cast and why).
    ...(t.geometry ? { geometry: t.geometry as unknown as Geometry } : {}),
    seats: (t.seats as unknown as Array<Seat> | null) ?? [],
  }))

  const guests: Array<Guest> = guestsRes.data.map((g) => ({
    id: g.id,
    name: g.name,
    dietary: g.dietary as Array<Dietary>,
    tableId: g.table_id,
    seatId: g.seat_id,
    note: g.note ?? undefined,
  }))

  const fixtures: Array<Fixture> = fixturesRes.data.map((f) => ({
    id: f.id,
    name: f.name,
    shape: f.shape as FixtureShape,
    size: { width: Number(f.width), height: Number(f.height) },
    rotation: f.rotation as TableRotation,
    position: { x: Number(f.pos_x), y: Number(f.pos_y) },
    hallId: f.hall_id ?? adoptiveHallId,
    ...(f.geometry ? { geometry: f.geometry as unknown as Geometry } : {}),
  }))

  if (hasOrphans && adoptiveHallId && adoptiveHallPersisted) {
    for (const t of tablesRes.data)
      if (!t.hall_id)
        void updateTablePos(
          t.id,
          Number(t.pos_x),
          Number(t.pos_y),
          adoptiveHallId
        )
    for (const f of fixturesRes.data)
      if (!f.hall_id)
        void updateFixturePos(
          f.id,
          Number(f.pos_x),
          Number(f.pos_y),
          adoptiveHallId
        )
  }

  // hallZOrder reset: the raise order is per-wedding UI state, so a freshly
  // loaded wedding starts from creation order.
  usePlannerStore.setState({ tables, guests, halls, fixtures, hallZOrder: [] })

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
