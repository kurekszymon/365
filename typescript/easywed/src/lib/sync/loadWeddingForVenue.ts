import type { Guest, Hall } from "@/stores/planner.store"
import type { VenueAccess } from "@/stores/global.store"
import { supabase } from "@/lib/supabase"
import { toFixture, toHall, toTable } from "@/lib/sync/rows"
import {
  DEFAULT_HALL,
  seatIndexFromId,
  usePlannerStore,
} from "@/stores/planner.store"
import { useGlobalStore } from "@/stores/global.store"
import { useMenuStore } from "@/stores/menu.store"
import { useRemindersStore } from "@/stores/reminders.store"
import { loadMenuCatalogue } from "@/lib/sync/menuCatalogue"
import i18n from "@/i18n"

/**
 * The venue's peek: the same wedding, hydrated into the same stores, with the
 * people taken out.
 *
 * Shaped exactly like `loadWedding` - one `Promise.all`, one `AbortSignal`, the
 * same store writes - and differs in three ways, each deliberate:
 *
 *   1. **No guests, reminders or members request at all.** 20260817000003
 *      narrows those SELECT policies to the explicit member roles, so asking
 *      would return zero rows; not asking says why in the code.
 *   2. **Seats come from `wedding_seatmap`**, a definer view whose projection
 *      has no `name` and no `note` column. Nothing is redacted here because
 *      there is nothing to redact *with* - the guarantee is the view's shape,
 *      not this file's discipline.
 *   3. **Seats are labelled at the load boundary.** Every downstream renderer
 *      takes a `Guest` with a `name`, so handing them "Gosc 12" means none of
 *      them needs to know a venue exists - the alternative is a nullable name
 *      threaded through a dozen components, each of which could forget.
 *
 * No self-healing: `loadWedding` repairs hall-less rows in the background, but a
 * venue is read-only in the database and stays read-only here, so orphans are
 * adopted for display only.
 */
export const loadWeddingForVenue = async (id: string, signal: AbortSignal) => {
  const [weddingRes, hallsRes, tablesRes, fixturesRes, seatsRes] =
    await Promise.all([
      supabase
        .from("weddings")
        .select(
          "id, name, date, venue_access, menu_package_id, tenants(id, slug, name)"
        )
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

      // Columns listed rather than `*`, so a column added to the view later has
      // to be opted into by a human. The view already filters soft-deleted rows.
      supabase
        .from("wedding_seatmap")
        .select("id, table_id, seat_id, dietary, age_group, menu_option_id")
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
    // Pinned rather than read from my_wedding_role, as wedding.local.tsx pins
    // "owner": this path exists only inside the CRM, so the surface is read-only
    // whatever else the caller might be. selectCanEdit excludes "venue", which
    // disables every write affordance and dnd-kit sensor in the planner.
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
  // render somewhere, and halls[0] is where loadWedding would have put it -
  // except nothing is written back.
  //
  // Hence the hall-less branch. `loadWedding` makes halls[0] exist by *inserting*
  // a default hall; a venue cannot write, so the same hall is built in memory.
  // Without it every row comes back with an undefined hallId and the peek
  // renders an empty canvas, which reads as "the couple has planned nothing".
  // Condition mirrors loadWedding's, fixtures included.
  if (
    halls.length === 0 &&
    (tablesRes.data.length > 0 || fixturesRes.data.length > 0)
  ) {
    halls.push({
      ...DEFAULT_HALL,
      id: crypto.randomUUID(),
      position: { x: 0, y: 0 },
    })
  }

  const hallIds = new Set(halls.map((h) => h.id))
  const fallbackHallId = halls[0]?.id
  const adoptOrphan = (hallId: string | null) =>
    hallId && hallIds.has(hallId) ? hallId : fallbackHallId

  const tables = tablesRes.data.map((t) => toTable(t, adoptOrphan))
  const fixtures = fixturesRes.data.map((f) => toFixture(f, adoptOrphan))

  // Stable numbering: by table, then by seat *index* rather than seat id as a
  // string ("seat-10" sorts before "seat-2" lexically), so the same guest keeps
  // the same label across reloads and the printed report. Unseated guests trail
  // the list - still a head count the kitchen needs.
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
    // A uuid of this venue's own catalogue, deliberately *not* resolved to a
    // name by the view - the seat map's safety argument is that there is no text
    // in the projection to redact. Named client-side from the catalogue below.
    menuOptionId: row.menu_option_id,
  }))

  usePlannerStore.setState({ tables, guests, halls, fixtures, hallZOrder: [] })

  // The catalogue, so those uuids can be named. Read through the *staff*
  // policies from 20260822000001 - the venue's own data - and unfiltered by
  // `archived_at`, so a dish archived after a couple ordered it is still
  // nameable on the kitchen report.
  //
  // The package id comes along so the report can group by course. The served set
  // deliberately does not: the kitchen cooks what the guests hold, and an
  // unpicked dish is already cleared off every guest by 20260822000003.
  useMenuStore.getState().clear()
  useMenuStore.getState().setOrder(weddingRes.data.menu_package_id, [])
  if (tenant) void loadMenuCatalogue(tenant.id, signal)

  // Cleared rather than left alone: these stores are module singletons, so a
  // staff member planning their own wedding in the same tab would otherwise see
  // their own reminders under a customer's name.
  useRemindersStore.setState({ reminders: [] })
}

/**
 * The inverse of `loadWeddingForVenue`: take the customer's layout back out of
 * the stores it was hydrated into.
 *
 * What makes a revocation *visible* rather than merely true. The database stops
 * answering the moment `set_venue_access(false)` commits, but that governs the
 * next request, not the pixels already on screen - without this, a staff member
 * who hands back access keeps the seat map and dietary tags rendered from the
 * hydrated store, and `privacy.venue.revoke`'s "natychmiast i calkowicie" would
 * be a sentence the UI contradicts.
 *
 * Called on unmount rather than only after a release, so every route out of the
 * peek ends it the same way. These stores are module singletons shared with the
 * couple's own planner, which is the second reason not to leave a customer's
 * layout in them.
 */
export const clearVenuePeek = () => {
  usePlannerStore.setState({
    tables: [],
    guests: [],
    halls: [],
    fixtures: [],
    hallZOrder: [],
  })
  useGlobalStore.setState({
    weddingId: undefined,
    name: undefined,
    date: undefined,
    role: undefined,
    members: [],
    venue: null,
    venueAccess: "none",
  })
  useRemindersStore.setState({ reminders: [] })
  // Same reason as the reminders reset above: menu.store is a module singleton,
  // so a staff member who also plans their own wedding here must not be left
  // holding a customer's menu, nor the catalogue keyed to it.
  useMenuStore.getState().clear()
}

// Unassigned rows sort last in both keys. `~` is above every character a uuid
// can contain, so it puts a null table after every real one without a second
// comparison branch.
const tableOrder = (tableId: string | null): string => tableId ?? "~"

const seatOrder = (seatId: string | null): number =>
  seatId === null ? Number.MAX_SAFE_INTEGER : (seatIndexFromId(seatId) ?? 0)
