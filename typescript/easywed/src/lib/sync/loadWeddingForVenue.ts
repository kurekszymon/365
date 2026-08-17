import type { Guest, Hall } from "@/stores/planner.store"
import type { VenueAccess } from "@/stores/global.store"
import { supabase } from "@/lib/supabase"
import { toFixture, toHall, toTable } from "@/lib/sync/rows"
import { seatIndexFromId, usePlannerStore } from "@/stores/planner.store"
import { useGlobalStore } from "@/stores/global.store"
import { useRemindersStore } from "@/stores/reminders.store"
import i18n from "@/i18n"

/**
 * The venue's peek: the same wedding, hydrated into the same stores, with the
 * people taken out.
 *
 * Shaped exactly like `loadWedding` - one `Promise.all`, one `AbortSignal`,
 * the same store writes - and differs in three ways, each of which is a
 * decision rather than an omission:
 *
 *   1. **No guests, reminders or members request at all.** 20260817000003
 *      narrows those three SELECT policies to the explicit member roles, so
 *      asking would return zero rows; not asking says why in the code instead
 *      of leaving three empty results to be explained.
 *   2. **Seats come from `wedding_seatmap`**, a definer view whose projection
 *      has no `name` column and no `note` column. There is nothing to redact
 *      here because there is nothing to redact *with* - the guarantee is the
 *      shape of the view, not the discipline of this file.
 *   3. **Seats are labelled here, at the load boundary.** Every renderer
 *      downstream - the canvas, the guest list, `PlannerPrintView` - takes a
 *      `Guest` with a `name`, so giving them "Gosc 12" rather than a special
 *      anonymous mode means none of them needs to know a venue exists. The
 *      alternative was a nullable name threaded through a dozen components,
 *      each of which could forget.
 *
 * No self-healing. `loadWedding` adopts hall-less rows into the first hall and
 * repairs them in the background; a venue is read-only in the database and must
 * stay read-only here, so orphans are adopted for display only and nothing is
 * written back.
 */
export const loadWeddingForVenue = async (id: string, signal: AbortSignal) => {
  const [weddingRes, hallsRes, tablesRes, fixturesRes, seatsRes] =
    await Promise.all([
      supabase
        .from("weddings")
        .select("id, name, date, venue_access, tenants(id, slug, name)")
        .eq("id", id)
        .abortSignal(signal)
        .single(),

      supabase
        .from("halls")
        .select(
          "id, name, floor, preset, width, height, pos_x, pos_y, geometry"
        )
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
        .from("fixtures")
        .select(
          "id, hall_id, name, shape, width, height, rotation, pos_x, pos_y, geometry"
        )
        .eq("wedding_id", id)
        .is("deleted_at", null)
        .abortSignal(signal),

      // Columns listed rather than `*`, for the same reason every other query
      // here lists them: so a column added to the view later has to be opted
      // into by a human. The view already filters soft-deleted guests.
      supabase
        .from("wedding_seatmap")
        .select("id, table_id, seat_id, dietary, age_group")
        .eq("wedding_id", id)
        .abortSignal(signal),
    ])

  if (weddingRes.error) throw weddingRes.error
  if (hallsRes.error) throw hallsRes.error
  if (tablesRes.error) throw tablesRes.error
  if (fixturesRes.error) throw fixturesRes.error
  if (seatsRes.error) throw seatsRes.error

  const tenant = weddingRes.data.tenants

  useGlobalStore.setState({
    weddingId: id,
    name: weddingRes.data.name || undefined,
    date: weddingRes.data.date ? new Date(weddingRes.data.date) : undefined,
    // Pinned rather than read back from my_wedding_role, the same way
    // wedding.local.tsx pins "owner": this load path exists only inside the
    // CRM, so the surface is read-only regardless of what else the caller
    // might happen to be. selectCanEdit excludes "venue", which disables every
    // write affordance and every dnd-kit sensor in the planner.
    role: "venue",
    // The venue is not a member of the wedding and cannot read who is.
    members: [],
    venue: tenant
      ? { tenantId: tenant.id, slug: tenant.slug, name: tenant.name }
      : null,
    venueAccess: weddingRes.data.venue_access as VenueAccess,
  })

  const halls: Array<Hall> = hallsRes.data.map(toHall)

  // Display-only orphan adoption: a table whose hall is missing still has to
  // render somewhere, and halls[0] is where loadWedding would have put it.
  // Unlike there, nothing is written back.
  const hallIds = new Set(halls.map((h) => h.id))
  const fallbackHallId = halls[0]?.id
  const adoptOrphan = (hallId: string | null) =>
    hallId && hallIds.has(hallId) ? hallId : fallbackHallId

  const tables = tablesRes.data.map((t) => toTable(t, adoptOrphan))
  const fixtures = fixturesRes.data.map((f) => toFixture(f, adoptOrphan))

  // Stable numbering. Sorted by table, then by seat *index* rather than by the
  // seat id as a string - "seat-10" sorts before "seat-2" lexically - so the
  // same guest carries the same label across reloads and across the printed
  // report. Unseated guests trail the list; they are still a head count the
  // kitchen needs.
  const seatRows = [...seatsRes.data].sort(
    (a, b) =>
      tableOrder(a.table_id).localeCompare(tableOrder(b.table_id)) ||
      seatOrder(a.seat_id) - seatOrder(b.seat_id) ||
      (a.id ?? "").localeCompare(b.id ?? "")
  )

  const guests: Array<Guest> = seatRows.map((row, index) => ({
    // The view projects `guests.id`, so a seat keeps its identity across loads
    // and the existing seat-lookup code needs no special case.
    id: row.id ?? `${index}`,
    name: i18n.t("venue.anonymous_guest", { n: index + 1 }),
    dietary: row.dietary ?? [],
    ageGroup: row.age_group ?? undefined,
    tableId: row.table_id,
    seatId: row.seat_id,
  }))

  usePlannerStore.setState({ tables, guests, halls, fixtures, hallZOrder: [] })

  // Cleared rather than left alone: these stores are module singletons, so a
  // staff member who also plans their own wedding in the same tab would
  // otherwise see their own reminders under a customer's name.
  useRemindersStore.setState({ reminders: [] })
}

// Unassigned rows sort last in both keys. `~` is above every character a uuid
// can contain, so it puts a null table after every real one without a second
// comparison branch.
const tableOrder = (tableId: string | null): string => tableId ?? "~"

const seatOrder = (seatId: string | null): number =>
  seatId === null ? Number.MAX_SAFE_INTEGER : (seatIndexFromId(seatId) ?? 0)
