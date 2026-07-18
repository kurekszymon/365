import { create } from "zustand"
import { persist } from "zustand/middleware"
import {
  PLANNER_STORAGE_KEY,
  localPlannerStorage,
  normalizeLocalPlannerSnapshot,
} from "@/lib/localWedding"
import {
  deleteHallRow,
  insertFixture,
  insertGuest,
  insertGuests,
  insertHall,
  insertTable,
  insertTables,
  reassignTableGuests,
  softDeleteFixture,
  softDeleteGuest,
  softDeleteTable,
  updateFixturePos,
  updateFixtureRow,
  updateGuestDetails,
  updateGuestSeat,
  updateHallPos,
  updateHallRow,
  updateTablePos,
  updateTableRow,
  updateTableSeats,
} from "@/lib/sync/mutations"
import { useGlobalStore } from "@/stores/global.store"
import { useMeasuresStore } from "@/stores/measures.store"

export type TableShape = "round" | "rectangular" | "custom"

export type FixtureShape = "rectangle" | "circle" | "rounded" | "polygon"

// Polygon geometry in object-local coordinates (top-left origin, meters).
// `width`/`height` on the parent Table/Fixture remain the AABB so all
// drag/clamp/rotation logic continues to work without modification.
export interface Geometry {
  vertices: Array<Position>
  closed: boolean
}

export interface Fixture {
  id: string
  name: string
  shape: FixtureShape
  size: Size
  rotation: TableRotation
  // Hall-local meters, top-left origin. The hall's world position is added at
  // render time, so moving a hall never rewrites its entities.
  position: Position
  hallId: string
  geometry?: Geometry
}

export const DEFAULT_FIXTURE: Omit<Fixture, "id" | "position" | "hallId"> = {
  name: "",
  shape: "rectangle",
  size: { width: 2, height: 1 },
  rotation: 0,
}

// Only 0 and 90 are supported today. 45 / 135 would require trig to compute
// the AABB (width' = |w·cos θ| + |h·sin θ|, height' similarly) and clamp logic.
export type TableRotation = 0 | 90

export interface Position {
  x: number
  y: number
}

export interface Size {
  // naive approach - just width and height, regardless of table shape. For round tables, width will be used as diameter.
  width: number
  height: number
}

// A manually-positioned seat. `x`/`y` are table-local meters (top-left origin,
// same convention as Geometry vertices). Only seats the user has dragged are
// stored; the rest fall back to the auto layout (see seatLayout.ts). `id` is
// deterministic by index - `seat-${i}` - so guest.seatId references stay stable.
export interface Seat {
  id: string
  x: number
  y: number
}

export interface Table {
  id: string
  name: string
  shape: TableShape
  capacity: number
  size: Size
  rotation: TableRotation
  // Hall-local meters, top-left origin (see Fixture.position).
  position: Position
  hallId: string
  geometry?: Geometry
  seats?: Array<Seat>
}

export const DEFAULT_TABLE: Omit<Table, "id" | "position" | "hallId"> = {
  name: "",
  shape: "rectangular",
  capacity: 8,
  size: { width: 2, height: 1 },
  rotation: 0,
}

export const getEffectiveSize = (size: Size, rotation: TableRotation): Size =>
  rotation === 90 ? { width: size.height, height: size.width } : size

export type HallPreset = "rectangle" | "l-shape" | "u-shape" | "custom"

// A room (or floor area) of the wedding venue. All halls render together on
// one canvas; `position` is the hall's top-left corner in shared world-space
// meters. Entity positions stay local to their hall.
export interface Hall {
  id: string
  name: string
  floor?: number | null
  preset: HallPreset
  size: Size
  position: Position
}

// Where a newly added hall lands: two halls per row ("1 2 / 3 4"), so the
// fit-to-view zoom stays readable as halls accumulate - a single long strip
// shrinks everything until the dimension labels (fixed screen px, just
// outside each hall's top/left edge) collide with the neighbouring hall.
// Odd count → beside the last hall; even count → a new row under everything,
// left-aligned with the leftmost hall. The gap leaves room for those labels.
// This is only the starting spot - halls are freely draggable afterwards.
const HALL_GAP = 3

export const nextHallPosition = (halls: Array<Hall>): Position => {
  if (halls.length === 0) return { x: 0, y: 0 }
  const last = halls[halls.length - 1]
  if (halls.length % 2 === 1) {
    return {
      x: last.position.x + last.size.width + HALL_GAP,
      y: last.position.y,
    }
  }
  const minX = Math.min(...halls.map((h) => h.position.x))
  const maxY = Math.max(...halls.map((h) => h.position.y + h.size.height))
  return { x: minX, y: maxY + HALL_GAP }
}

export type Dietary =
  | "vegetarian"
  | "vegan"
  | "gluten-free"
  | "halal"
  | "kosher"

export interface Guest {
  id: string
  name: string
  dietary: Array<Dietary>
  tableId: string | null
  // Specific seat at `tableId` (e.g. "seat-3"), or null to fill the next free
  // seat in order. Always null when `tableId` is null.
  seatId?: string | null
  note?: string
}

// Stable, index-derived seat id. Default (never-dragged) seats use these so a
// guest can be pinned to a seat before the table's `seats` array is materialized.
export const seatIdForIndex = (index: number) => `seat-${index}`

export const seatIndexFromId = (seatId: string): number | null => {
  const match = /^seat-(\d+)$/.exec(seatId)
  return match ? Number(match[1]) : null
}

type State = {
  tables: Array<Table>
  guests: Array<Guest>
  fixtures: Array<Fixture>
  halls: Array<Hall>
}

type Action = {
  addTable: (
    table: Omit<Table, "id" | "position">,
    guestIds?: Array<string>,
    position?: Position
  ) => string
  addTables: (
    table: Omit<Table, "id" | "position">,
    count: number,
    startPosition?: Position
  ) => Array<string>
  updateTable: (
    id: string,
    table: Omit<Table, "id" | "position">,
    guestIds?: Array<string>
  ) => void
  saveTable: (id: string) => void
  duplicateTable: (id: string) => string | null
  deleteTable: (id: string) => void
  addGuest: (guest: Omit<Guest, "id">) => void
  addGuests: (guests: Array<Omit<Guest, "id">>) => Promise<boolean>
  // Edits a guest's details (name/dietary/note); seating is left untouched.
  updateGuest: (
    id: string,
    details: Pick<Guest, "name" | "dietary" | "note">
  ) => void
  deleteGuest: (id: string) => void
  addHall: (hall: Omit<Hall, "id" | "position">, position?: Position) => string
  updateHall: (id: string, patch: Partial<Omit<Hall, "id">>) => void
  saveHall: (id: string) => void
  updateHallPosition: (id: string, x: number, y: number) => void
  deleteHall: (
    id: string,
    contents: { kind: "move"; targetHallId: string } | { kind: "delete" }
  ) => void
  assignGuestToSeat: (
    guestId: string,
    tableId: string,
    seatId: string,
    occupantId: string | null
  ) => void
  clearSeat: (guestId: string) => void
  moveSeat: (tableId: string, seatId: string, x: number, y: number) => void
  updateTablePosition: (
    id: string,
    x: number,
    y: number,
    hallId?: string
  ) => void
  addFixture: (
    fixture: Omit<Fixture, "id" | "position">,
    position?: Position
  ) => string
  updateFixture: (id: string, fixture: Omit<Fixture, "id" | "position">) => void
  saveFixture: (id: string) => void
  duplicateFixture: (id: string) => string | null
  deleteFixture: (id: string) => void
  updateFixturePosition: (
    id: string,
    x: number,
    y: number,
    hallId?: string
  ) => void
}

export const DEFAULT_HALL: Omit<Hall, "id" | "position"> = {
  name: "",
  preset: "rectangle",
  size: { width: 20, height: 12 },
}

// New halls whose insert is still in flight, so entity inserts targeting them
// can chain on the hall row landing first (hall_id FK). Fire-and-forget
// mutations otherwise race: a table insert can reach Postgres before its hall.
const pendingHallInserts = new Map<string, Promise<boolean>>()

const afterHallInsert = (hallId: string, fn: () => void) => {
  const pending = pendingHallInserts.get(hallId)
  if (!pending) {
    fn()
    return
  }
  void pending.then((ok) => {
    if (ok) fn()
    else
      console.error(
        `[planner] hall ${hallId} insert failed - skipping dependent write`
      )
  })
}

// Store-local clamp of an entity rect into a hall (hall-local coords). The
// canvas has its own clampToHall in Canvas/utils.ts; duplicated here because
// the store must not import from components.
const clampIntoHall = (pos: Position, size: Size, hall: Hall): Position => ({
  x: Math.min(Math.max(0, pos.x), Math.max(0, hall.size.width - size.width)),
  y: Math.min(Math.max(0, pos.y), Math.max(0, hall.size.height - size.height)),
})

const createPlannerStore = (
  set: (
    partial:
      | Partial<State & Action>
      | ((state: State & Action) => Partial<State & Action>)
  ) => void,
  get: () => State & Action
): State & Action => ({
  tables: [],
  guests: [],
  fixtures: [],
  halls: [],

  addTable: (table, guestIds = [], position) => {
    const tableId = crypto.randomUUID()
    const newTable: Table = {
      ...table,
      id: tableId,
      position: position ?? { x: 0, y: 0 },
    }
    set((state) => ({
      tables: [...state.tables, newTable],
      guests:
        guestIds.length === 0
          ? state.guests
          : state.guests.map((guest) =>
              guestIds.includes(guest.id) ? { ...guest, tableId } : guest
            ),
    }))
    afterHallInsert(newTable.hallId, () => {
      void insertTable(newTable).then((ok) => {
        if (ok && guestIds.length > 0)
          void reassignTableGuests(tableId, guestIds)
      })
    })
    return tableId
  },
  addTables: (table, count, startPosition) => {
    if (count < 1) return []

    const hall = get().halls.find((h) => h.id === table.hallId)
    if (!hall) return []

    const start = startPosition ?? { x: 0, y: 0 }
    const { width: hallWidth, height: hallHeight } = hall.size
    const gap = 0.5

    const effective = getEffectiveSize(table.size, table.rotation)
    const tileW = effective.width + gap
    const tileH = effective.height + gap

    const availableW = Math.max(tileW, hallWidth - start.x)
    const availableH = Math.max(tileH, hallHeight - start.y)
    const cols = Math.max(1, Math.floor(availableW / tileW))
    const rowsCap = Math.max(1, Math.floor(availableH / tileH))
    const capped = Math.min(count, cols * rowsCap)

    const newTables: Array<Table> = Array.from({ length: capped }, (_, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const suffix = capped > 1 && table.name ? ` ${i + 1}` : ""

      return {
        ...table,
        name: table.name ? `${table.name}${suffix}` : table.name,
        id: crypto.randomUUID(),
        position: {
          x: start.x + col * tileW,
          y: start.y + row * tileH,
        },
      }
    })

    set((state) => ({ tables: [...state.tables, ...newTables] }))
    afterHallInsert(table.hallId, () => void insertTables(newTables))

    return newTables.map((t) => t.id)
  },
  updateTable: (id, table, guestIds = []) => {
    set((state) => ({
      tables: state.tables.map((t) => {
        if (t.id !== id) return t
        // Seat position overrides are stored in the displayed (rotation-adjusted)
        // frame, so a rotation change reinterprets them in the swapped axes and
        // the pinned seats jump. Drop them and fall back to the auto layout for
        // the new orientation (same stance as capacity-shrink pruning).
        const rotationChanged = table.rotation !== t.rotation
        return {
          ...t,
          ...table,
          position: t.position,
          seats: rotationChanged ? [] : t.seats,
        }
      }),
      guests: state.guests.map((guest) => {
        if (guestIds.includes(guest.id)) {
          // Newly added here lose any prior seat; ones already at this table
          // keep theirs.
          return guest.tableId === id
            ? { ...guest, tableId: id }
            : { ...guest, tableId: id, seatId: null }
        }
        if (guest.tableId === id) {
          return { ...guest, tableId: null, seatId: null }
        }
        return guest
      }),
    }))
  },
  saveTable: (id) => {
    const state = get()
    const table = state.tables.find((t) => t.id === id)

    if (!table) return

    // Capacity may have shrunk: unseat guests pinned to a now-out-of-range seat
    // and drop the matching position overrides before persisting.
    const orphanedGuests = state.guests.filter((g) => {
      if (g.tableId !== id || !g.seatId) return false
      const seatIndex = seatIndexFromId(g.seatId)
      return seatIndex !== null && seatIndex >= table.capacity
    })
    const prunedSeats = (table.seats ?? []).filter((s) => {
      const seatIndex = seatIndexFromId(s.id)
      return seatIndex === null || seatIndex < table.capacity
    })

    if (
      orphanedGuests.length > 0 ||
      prunedSeats.length !== (table.seats ?? []).length
    ) {
      const orphanIds = new Set(orphanedGuests.map((g) => g.id))
      set((s) => ({
        tables: s.tables.map((t) =>
          t.id === id ? { ...t, seats: prunedSeats } : t
        ),
        guests: s.guests.map((g) =>
          orphanIds.has(g.id) ? { ...g, seatId: null } : g
        ),
      }))
      for (const g of orphanedGuests) void updateGuestSeat(g.id, id, null)
    }

    // Reconcile seat overrides to the DB on every save. They're cleared on a
    // rotation change (updateTable) and pruned on capacity shrink (above) -
    // neither is detectable from the persisted row, so persist unconditionally.
    void updateTableSeats(id, prunedSeats)

    const assignedGuests = get().guests.filter((g) => g.tableId === id)

    void updateTableRow(id, {
      name: table.name,
      shape: table.shape,
      capacity: table.capacity,
      width: table.size.width,
      height: table.size.height,
      rotation: table.rotation,
    }).then((ok) => {
      if (!ok) return
      void reassignTableGuests(
        id,
        assignedGuests.map((g) => g.id)
      ).then((reassigned) => {
        if (!reassigned) return
        // reassignTableGuests writes only table_id; persist each assigned guest's
        // current seatId too. Otherwise a guest moved in from another table keeps
        // its old seat_id in the DB and - since seat ids are index-based, not
        // table-specific - gets wrongly re-pinned to that seat on reload. Writing
        // null where the store has no pin is what clears that stale value.
        for (const g of assignedGuests) {
          void updateGuestSeat(g.id, id, g.seatId ?? null)
        }
      })
    })
  },
  duplicateTable: (id) => {
    const original = get().tables.find((t) => t.id === id)
    if (!original) return null
    const newId = crypto.randomUUID()
    const copy: Table = {
      ...original,
      id: newId,
      position: {
        x: original.position.x + 0.5,
        y: original.position.y + 0.5,
      },
    }
    set((state) => ({ tables: [...state.tables, copy] }))
    void insertTable(copy)
    return newId
  },
  deleteTable: (id) => {
    set((state) => ({
      tables: state.tables.filter((t) => t.id !== id),
      guests: state.guests.map((g) =>
        g.tableId === id ? { ...g, tableId: null, seatId: null } : g
      ),
    }))
    void softDeleteTable(id)
    const weddingId = useGlobalStore.getState().weddingId
    if (weddingId)
      useMeasuresStore.getState().removeObjectMeasurements(weddingId, id)
  },
  addGuest: (guest) => {
    const newGuest: Guest = { ...guest, id: crypto.randomUUID() }
    set((state) => ({ guests: [...state.guests, newGuest] }))
    void insertGuest(newGuest)
  },
  addGuests: (guests) => {
    if (guests.length === 0) return Promise.resolve(true)
    const newGuests: Array<Guest> = guests.map((g) => ({
      ...g,
      id: crypto.randomUUID(),
    }))
    set((state) => ({ guests: [...state.guests, ...newGuests] }))
    // Optimistic state is already applied; the returned promise lets the caller
    // surface a persistence failure (no rollback - consistent with the store).
    return insertGuests(newGuests)
  },
  updateGuest: (id, details) => {
    set((state) => ({
      guests: state.guests.map((g) => (g.id === id ? { ...g, ...details } : g)),
    }))
    void updateGuestDetails({ id, ...details })
  },
  deleteGuest: (id) => {
    set((state) => ({
      guests: state.guests.filter((g) => g.id !== id),
    }))
    void softDeleteGuest(id)
  },
  addHall: (hall, position) => {
    const id = crypto.randomUUID()
    const newHall: Hall = {
      ...hall,
      id,
      position: position ?? nextHallPosition(get().halls),
    }
    set((state) => ({ halls: [...state.halls, newHall] }))
    const insert = insertHall(newHall).finally(() => {
      pendingHallInserts.delete(id)
    })
    pendingHallInserts.set(id, insert)
    void insert
    return id
  },
  updateHall: (id, patch) => {
    set((state) => ({
      halls: state.halls.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    }))
  },
  saveHall: (id) => {
    const hall = get().halls.find((h) => h.id === id)
    if (!hall) return
    afterHallInsert(id, () => {
      void updateHallRow(id, {
        name: hall.name,
        floor: hall.floor ?? null,
        preset: hall.preset,
        width: hall.size.width,
        height: hall.size.height,
        // Position rides along so form edits (updateHall + saveHall on blur/
        // close) persist it; canvas drags still use updateHallPosition.
        pos_x: hall.position.x,
        pos_y: hall.position.y,
      })
    })
  },
  updateHallPosition: (id, x, y) => {
    set((state) => ({
      halls: state.halls.map((h) =>
        h.id === id ? { ...h, position: { x, y } } : h
      ),
    }))
    afterHallInsert(id, () => void updateHallPos(id, x, y))
  },
  deleteHall: (id, contents) => {
    const state = get()
    const hall = state.halls.find((h) => h.id === id)
    if (!hall) return

    if (contents.kind === "move") {
      const target = state.halls.find((h) => h.id === contents.targetHallId)
      if (!target || target.id === id) return
      const moved: Array<{
        kind: "tables" | "fixtures"
        id: string
        position: Position
        // World-space delta of the move, so measurements anchored to the
        // entity can follow (they live in world coords).
        delta: Position
      }> = []
      // Where a moved entity lands in the target hall. When its world
      // position already lies inside the target (overlapping/adjacent
      // halls), keep it - the entity doesn't visibly jump and measurements
      // only shift by whatever clamping was needed. When the halls are
      // disjoint (the default side-by-side layout) that world spot is
      // outside the target and world-preserving placement would pile
      // everything onto the nearest edge - so transplant the hall-local
      // arrangement instead, preserving the room's layout.
      const relocate = (local: Position, size: Size) => {
        const oldWorld = {
          x: hall.position.x + local.x,
          y: hall.position.y + local.y,
        }
        const worldLocal = {
          x: oldWorld.x - target.position.x,
          y: oldWorld.y - target.position.y,
        }
        const insideTarget =
          worldLocal.x >= 0 &&
          worldLocal.x <= target.size.width &&
          worldLocal.y >= 0 &&
          worldLocal.y <= target.size.height
        const position = clampIntoHall(
          insideTarget ? worldLocal : local,
          size,
          target
        )
        return {
          position,
          delta: {
            x: target.position.x + position.x - oldWorld.x,
            y: target.position.y + position.y - oldWorld.y,
          },
        }
      }
      set((s) => ({
        halls: s.halls.filter((h) => h.id !== id),
        tables: s.tables.map((t) => {
          if (t.hallId !== id) return t
          const { position, delta } = relocate(
            t.position,
            getEffectiveSize(t.size, t.rotation)
          )
          moved.push({ kind: "tables", id: t.id, position, delta })
          return { ...t, hallId: target.id, position }
        }),
        fixtures: s.fixtures.map((f) => {
          if (f.hallId !== id) return f
          const { position, delta } = relocate(
            f.position,
            getEffectiveSize(f.size, f.rotation)
          )
          moved.push({ kind: "fixtures", id: f.id, position, delta })
          return { ...f, hallId: target.id, position }
        }),
      }))
      const movedWeddingId = useGlobalStore.getState().weddingId
      for (const m of moved) {
        if (m.kind === "tables")
          void updateTablePos(m.id, m.position.x, m.position.y, target.id)
        else void updateFixturePos(m.id, m.position.x, m.position.y, target.id)
        if (movedWeddingId && (m.delta.x !== 0 || m.delta.y !== 0))
          useMeasuresStore
            .getState()
            .shiftMeasurementPoints(movedWeddingId, m.id, m.delta.x, m.delta.y)
      }
    } else {
      const tableIds = state.tables
        .filter((t) => t.hallId === id)
        .map((t) => t.id)
      const fixtureIds = state.fixtures
        .filter((f) => f.hallId === id)
        .map((f) => f.id)
      const tableIdSet = new Set(tableIds)
      set((s) => ({
        halls: s.halls.filter((h) => h.id !== id),
        tables: s.tables.filter((t) => t.hallId !== id),
        fixtures: s.fixtures.filter((f) => f.hallId !== id),
        guests: s.guests.map((g) =>
          g.tableId && tableIdSet.has(g.tableId)
            ? { ...g, tableId: null, seatId: null }
            : g
        ),
      }))
      for (const tableId of tableIds) void softDeleteTable(tableId)
      for (const fixtureId of fixtureIds) void softDeleteFixture(fixtureId)
      const weddingId = useGlobalStore.getState().weddingId
      if (weddingId) {
        const measures = useMeasuresStore.getState()
        for (const objectId of [...tableIds, ...fixtureIds])
          measures.removeObjectMeasurements(weddingId, objectId)
      }
    }
    afterHallInsert(id, () => void deleteHallRow(id))
  },
  assignGuestToSeat: (guestId, tableId, seatId, occupantId) => {
    const state = get()
    const table = state.tables.find((t) => t.id === tableId)
    const guest = state.guests.find((g) => g.id === guestId)
    if (!table || !guest) return

    // The occupant is resolved by the view (it may be an order-fill guest with a
    // null seatId, which the store can't infer on its own), so trust the id the
    // caller passes rather than matching on seatId here.
    const occupant =
      occupantId && occupantId !== guestId
        ? (state.guests.find((g) => g.id === occupantId) ?? null)
        : null
    const guestAlreadyHere = guest.tableId === tableId
    const currentCount = state.guests.filter(
      (g) => g.tableId === tableId
    ).length

    // Bringing in a guest from outside a full table: the displaced occupant
    // leaves the table to make room (replace). Otherwise a seat frees up
    // (guest was already here, or the table has room), so the occupant just
    // loses their pin and stays as an order-fill.
    const tableIsFull = currentCount >= table.capacity
    if (!guestAlreadyHere && tableIsFull && !occupant) return
    const occupantLeavesTable =
      occupant != null && !guestAlreadyHere && tableIsFull

    set((s) => ({
      guests: s.guests.map((g) => {
        if (g.id === guestId) return { ...g, tableId, seatId }
        if (occupant && g.id === occupant.id)
          return occupantLeavesTable
            ? { ...g, tableId: null, seatId: null }
            : { ...g, seatId: null }
        return g
      }),
    }))
    // The DB enforces table capacity on table_id and uniqueness on (table_id,
    // seat_id), so the displaced occupant MUST be persisted before the incoming
    // guest - otherwise seating the new guest while the occupant still holds the
    // seat (or the table is still full) trips one of those server-side guards.
    // Chain so the guest write only fires once the occupant write has landed.
    const persistGuest = () => updateGuestSeat(guestId, tableId, seatId)
    // Order-fill occupants already have table_id set and seat_id null, so only
    // write when something actually changed.
    const occupantWrite =
      occupant == null
        ? null
        : occupantLeavesTable
          ? updateGuestSeat(occupant.id, null, null)
          : occupant.seatId != null
            ? updateGuestSeat(occupant.id, tableId, null)
            : null
    if (occupantWrite)
      void occupantWrite.then((ok) => {
        if (ok) void persistGuest()
      })
    else void persistGuest()
  },
  clearSeat: (guestId) => {
    const guest = get().guests.find((g) => g.id === guestId)
    if (!guest) return
    // Free the seat: remove the guest from the table entirely. Merely nulling
    // seatId would leave them assigned to the table as an order-fill, so they'd
    // immediately refill the seat and the seat would never actually empty.
    set((s) => ({
      guests: s.guests.map((g) =>
        g.id === guestId ? { ...g, tableId: null, seatId: null } : g
      ),
    }))
    void updateGuestSeat(guestId, null, null)
  },
  moveSeat: (tableId, seatId, x, y) => {
    set((state) => ({
      tables: state.tables.map((t) => {
        if (t.id !== tableId) return t
        const seats = t.seats ?? []
        const next = seats.some((s) => s.id === seatId)
          ? seats.map((s) => (s.id === seatId ? { ...s, x, y } : s))
          : [...seats, { id: seatId, x, y }]
        return { ...t, seats: next }
      }),
    }))
    const seats = get().tables.find((t) => t.id === tableId)?.seats ?? []
    void updateTableSeats(tableId, seats)
  },
  updateTablePosition: (id, x, y, hallId) => {
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === id
          ? { ...t, position: { x, y }, hallId: hallId ?? t.hallId }
          : t
      ),
    }))
    void updateTablePos(id, x, y, hallId)
  },

  addFixture: (fixture, position) => {
    const fixtureId = crypto.randomUUID()
    const newFixture: Fixture = {
      ...fixture,
      id: fixtureId,
      position: position ?? { x: 0, y: 0 },
    }
    set((state) => ({ fixtures: [...state.fixtures, newFixture] }))
    afterHallInsert(newFixture.hallId, () => void insertFixture(newFixture))
    return fixtureId
  },
  updateFixture: (id, fixture) => {
    set((state) => ({
      fixtures: state.fixtures.map((f) =>
        f.id === id ? { ...f, ...fixture, position: f.position } : f
      ),
    }))
  },
  saveFixture: (id) => {
    const fixture = get().fixtures.find((f) => f.id === id)
    if (!fixture) return
    void updateFixtureRow(id, {
      name: fixture.name,
      shape: fixture.shape,
      width: fixture.size.width,
      height: fixture.size.height,
      rotation: fixture.rotation,
    })
  },
  duplicateFixture: (id) => {
    const original = get().fixtures.find((f) => f.id === id)
    if (!original) return null
    const newId = crypto.randomUUID()
    const copy: Fixture = {
      ...original,
      id: newId,
      position: {
        x: original.position.x + 0.5,
        y: original.position.y + 0.5,
      },
    }
    set((state) => ({ fixtures: [...state.fixtures, copy] }))
    void insertFixture(copy)
    return newId
  },
  deleteFixture: (id) => {
    set((state) => ({
      fixtures: state.fixtures.filter((f) => f.id !== id),
    }))
    void softDeleteFixture(id)
    const weddingId = useGlobalStore.getState().weddingId
    if (weddingId)
      useMeasuresStore.getState().removeObjectMeasurements(weddingId, id)
  },
  updateFixturePosition: (id, x, y, hallId) => {
    set((state) => ({
      fixtures: state.fixtures.map((f) =>
        f.id === id
          ? { ...f, position: { x, y }, hallId: hallId ?? f.hallId }
          : f
      ),
    }))
    void updateFixturePos(id, x, y, hallId)
  },
})

export const usePlannerStore = create<State & Action>()(
  persist(createPlannerStore, {
    name: PLANNER_STORAGE_KEY,
    skipHydration: true,
    storage: localPlannerStorage,
    // v1: multi-hall. Legacy local weddings persisted a single `hall` object;
    // normalize converts it to `halls[0]` at world (0,0) and stamps entities
    // with its id.
    version: 1,
    migrate: (persisted) =>
      (normalizeLocalPlannerSnapshot(persisted) ?? {
        tables: [],
        guests: [],
        fixtures: [],
        halls: [],
      }) as State & Action,
  })
)
