import type { Guest, Hall } from "@/stores/planner.store"
import type { Reminder } from "@/stores/reminders.store"
import type {
  VenueAccess,
  WeddingMember,
  WeddingRole,
} from "@/stores/global.store"
import { supabase } from "@/lib/supabase"
import {
  insertHall,
  updateFixturePos,
  updateTablePos,
} from "@/lib/sync/mutations"
import { fetchDisplayNames } from "@/lib/sync/profile"
import { loadMenuCatalogue } from "@/lib/sync/menuCatalogue"
import { toFixture, toHall, toTable } from "@/lib/sync/rows"
import { DEFAULT_HALL, usePlannerStore } from "@/stores/planner.store"
import { useAuthStore } from "@/stores/auth.store"
import { useGlobalStore } from "@/stores/global.store"
import { useMenuStore } from "@/stores/menu.store"
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
    roleRes,
    menuSelectionsRes,
  ] = await Promise.all([
    // The `tenants` embed rides on weddings.tenant_id's foreign key and costs
    // nothing extra: it is null for every unlinked wedding, and for a linked
    // one it saves the grant dialog a second round trip to learn the venue's
    // name. RLS still decides - "wedding members can view their linked venue"
    // (20260817000002) is what makes the row visible to a couple who is not a
    // member of the tenant.
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
      .select("id, name, dietary, age_group, note, table_id, seat_id")
      .eq("wedding_id", id)
      .is("deleted_at", null)
      .abortSignal(signal),

    supabase
      .from("reminders")
      .select("id, text, due, status, created_at, updated_at")
      .eq("wedding_id", id)
      .abortSignal(signal),

    // Every member, not just this user's row: the header avatar stack shows
    // editors that they aren't alone in here. RLS ("members can view
    // co-members") already permits this for any role, so no extra gating.
    // Ordered by created_at so the owner - inserted first by the trigger -
    // leads the stack and the order stays stable across loads.
    userId
      ? supabase
          .from("wedding_members")
          .select("user_id, role")
          .eq("wedding_id", id)
          .order("created_at")
          .abortSignal(signal)
      : Promise.resolve({ data: null, error: null }),

    supabase
      .from("fixtures")
      .select(
        "id, hall_id, name, shape, width, height, rotation, pos_x, pos_y, geometry"
      )
      .eq("wedding_id", id)
      .is("deleted_at", null)
      .abortSignal(signal),

    // The caller's own role, straight from wedding_role(). It used to be read
    // off the member rows above, and cannot be any more: 20260817000003
    // narrowed `wedding_members` SELECT to the three explicit member roles, so
    // a venue reads zero rows there - and "no row" is indistinguishable from
    // "no access", which is the state selectCanEdit fails closed on. Signed-out
    // callers never reach here (requireAuth gates the route), but the RPC is
    // authenticated-only, so the null-session branch skips it rather than
    // spending a guaranteed 401.
    userId
      ? supabase
          .rpc("my_wedding_role", { p_wedding_id: id })
          .abortSignal(signal)
      : Promise.resolve({ data: null, error: null }),

    // The served set. This one *can* ride the batch - it is keyed on the
    // wedding id, which we already have. The catalogue those uuids point into
    // cannot: it needs weddings.tenant_id, so it is a second round trip below.
    supabase
      .from("wedding_menu_selections")
      .select("menu_option_id")
      .eq("wedding_id", id)
      .abortSignal(signal),
  ])

  if (weddingRes.error) throw weddingRes.error
  if (hallsRes.error) throw hallsRes.error
  if (tablesRes.error) throw tablesRes.error
  if (guestsRes.error) throw guestsRes.error
  if (remindersRes.error) throw remindersRes.error
  if (memberRes.error) throw memberRes.error
  if (fixturesRes.error) throw fixturesRes.error
  if (roleRes.error) throw roleRes.error
  if (menuSelectionsRes.error) throw menuSelectionsRes.error

  const memberRows = memberRes.data ?? []

  const members: Array<WeddingMember> = memberRows.map((m) => ({
    userId: m.user_id,
    role: m.role as WeddingRole,
    displayName: null,
  }))

  // PostgREST returns a to-one embed as an object (null when unlinked); the
  // generated types describe it the same way.
  const tenant = weddingRes.data.tenants

  useGlobalStore.setState({
    weddingId: id,
    name: weddingRes.data.name || undefined,
    date: weddingRes.data.date ? new Date(weddingRes.data.date) : undefined,
    role: (roleRes.data as WeddingRole | null) ?? undefined,
    members,
    venue: tenant
      ? { tenantId: tenant.id, slug: tenant.slug, name: tenant.name }
      : null,
    venueAccess: weddingRes.data.venue_access as VenueAccess,
  })

  // The order is known now; the catalogue it points into is one round trip
  // away. Reset first so a previously loaded wedding's menu is never briefly
  // shown against this one.
  useMenuStore.getState().clear()
  useMenuStore.getState().setOrder(
    weddingRes.data.menu_package_id,
    menuSelectionsRes.data.map((row) => row.menu_option_id)
  )

  // Deliberately not awaited, for the same reason fetchDisplayNames is not: the
  // Menu tab is one tab of the planner, and holding up the canvas for it would
  // make every wedding open pay a serial request. The tab renders a spinner
  // until this lands - `status` starts "idle" and goes "loading" inside.
  //
  // Unlinked weddings skip it entirely and stay "idle", which is also the state
  // the Menu tab is hidden on. Guest mode never reaches here.
  if (tenant) void loadMenuCatalogue(tenant.id, signal)

  // Names live in profiles, not wedding_members, and there's no FK between
  // them (both point at auth.users), so PostgREST can't embed them in the
  // batch above - it's a second round trip that needs the ids first.
  //
  // Deliberately not awaited: the avatar stack already renders a neutral glyph
  // for a member without a name, so holding up first paint for this would cost
  // every wedding open a serial request to change a tooltip. Names patch
  // themselves in when they arrive.
  void fetchDisplayNames(
    memberRows.map((m) => m.user_id),
    signal
  ).then((profileNames) => {
    if (signal.aborted) return

    // A different wedding may have finished loading in the meantime; these
    // names belong to this one.
    if (useGlobalStore.getState().weddingId !== id) return

    // One write for the whole batch rather than setMemberDisplayName per
    // member: that action re-maps the entire array and publishes a new
    // `members` identity each time, so patching n names re-rendered the avatar
    // stack n times to reach a single settled state.
    useGlobalStore.setState((state) => ({
      members: state.members.map((member) =>
        profileNames.has(member.userId)
          ? {
              ...member,
              displayName: profileNames.get(member.userId) ?? null,
            }
          : member
      ),
    }))
  })

  const halls: Array<Hall> = hallsRes.data.map(toHall)

  // Self-healing for rows whose hall is missing: the migration backfilled
  // hall_id, but a fire-and-forget insert race (or a hall row deleted
  // server-side via `on delete set null`) can still leave orphans - either a
  // null hall_id or a non-null one pointing at a hall absent from this
  // wedding's hall list. Adopt both into the first hall - creating a default
  // one when entities exist but no hall does - and repair the rows in the
  // background. The fallback insert is awaited: the orphan backfill below and
  // any user mutation against the adoptive hall reference its id, so it must
  // exist server-side first or they FK-violate.
  //
  // Known race: two clients loading a hall-less wedding at once each insert
  // their own fallback hall, leaving a duplicate. Accepted - the state is
  // already anomalous and the surplus hall is visible/deletable in the UI.
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
  // A row is orphaned when its hall_id is null or points outside this
  // wedding's halls (computed after the fallback push so it's in the set).
  const hallIds = new Set(halls.map((h) => h.id))
  const isOrphan = (hallId: string | null) => !hallId || !hallIds.has(hallId)
  const hasOrphans =
    tablesRes.data.some((t) => isOrphan(t.hall_id)) ||
    fixturesRes.data.some((f) => isOrphan(f.hall_id))
  // isOrphan's inverse, spelled out rather than negated, so the non-orphan
  // branch narrows to a non-null string without a cast.
  const adoptOrphan = (hallId: string | null) =>
    hallId && hallIds.has(hallId) ? hallId : adoptiveHallId

  const tables = tablesRes.data.map((t) => toTable(t, adoptOrphan))

  const guests: Array<Guest> = guestsRes.data.map((g) => ({
    id: g.id,
    name: g.name,
    dietary: g.dietary,
    // NULL is the adult default; the store leaves it undefined in that case.
    ageGroup: g.age_group ?? undefined,
    tableId: g.table_id,
    seatId: g.seat_id,
    note: g.note ?? undefined,
  }))

  const fixtures = fixturesRes.data.map((f) => toFixture(f, adoptOrphan))

  if (hasOrphans && adoptiveHallId && adoptiveHallPersisted) {
    for (const t of tablesRes.data)
      if (isOrphan(t.hall_id))
        void updateTablePos(
          t.id,
          Number(t.pos_x),
          Number(t.pos_y),
          adoptiveHallId
        )
    for (const f of fixturesRes.data)
      if (isOrphan(f.hall_id))
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
