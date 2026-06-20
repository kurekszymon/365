import { create } from "zustand"
import {
  insertFixture,
  insertGuest,
  insertGuests,
  insertTable,
  insertTables,
  reassignTableGuests,
  softDeleteFixture,
  softDeleteTable,
  updateFixturePos,
  updateFixtureRow,
  updateGuestSeat,
  updateTablePos,
  updateTableRow,
  updateTableSeats,
  upsertHall,
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
  position: Position
  geometry?: Geometry
}

export const DEFAULT_FIXTURE: Omit<Fixture, "id" | "position"> = {
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
// deterministic by index — `seat-${i}` — so guest.seatId references stay stable.
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
  position: Position
  geometry?: Geometry
  seats?: Array<Seat>
}

export const DEFAULT_TABLE: Omit<Table, "id" | "position"> = {
  name: "",
  shape: "rectangular",
  capacity: 8,
  size: { width: 2, height: 1 },
  rotation: 0,
}

export const getEffectiveSize = (size: Size, rotation: TableRotation): Size =>
  rotation === 90 ? { width: size.height, height: size.width } : size

export type HallPreset = "rectangle" | "l-shape" | "u-shape" | "custom"

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
  hall: {
    dimensions: {
      width: number
      height: number
    }
    preset?: HallPreset | undefined
  }
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
  updateHall: (
    preset: HallPreset,
    dimensions: { width: number; height: number }
  ) => void
  saveHall: () => void
  assignGuestToTable: (guestId: string, tableId: string | null) => void
  assignGuestToSeat: (
    guestId: string,
    tableId: string,
    seatId: string,
    occupantId: string | null
  ) => void
  clearSeat: (guestId: string) => void
  moveSeat: (tableId: string, seatId: string, x: number, y: number) => void
  updateTablePosition: (id: string, x: number, y: number) => void
  addFixture: (
    fixture: Omit<Fixture, "id" | "position">,
    position?: Position
  ) => string
  updateFixture: (id: string, fixture: Omit<Fixture, "id" | "position">) => void
  saveFixture: (id: string) => void
  duplicateFixture: (id: string) => string | null
  deleteFixture: (id: string) => void
  updateFixturePosition: (id: string, x: number, y: number) => void
}

export const usePlannerStore = create<State & Action>((set, get) => ({
  tables: [],
  guests: [],
  fixtures: [],
  hall: {
    dimensions: {
      width: 20,
      height: 12,
    },
    preset: undefined,
  },

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
    void insertTable(newTable).then((ok) => {
      if (ok && guestIds.length > 0) void reassignTableGuests(tableId, guestIds)
    })
    return tableId
  },
  addTables: (table, count, startPosition) => {
    if (count < 1) return []

    const start = startPosition ?? { x: 0, y: 0 }
    const { width: hallWidth, height: hallHeight } = get().hall.dimensions
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
    void insertTables(newTables)

    return newTables.map((t) => t.id)
  },
  updateTable: (id, table, guestIds = []) => {
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === id ? { ...t, ...table, position: t.position } : t
      ),
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
      void updateTableSeats(id, prunedSeats)
    }

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
        // its old seat_id in the DB and — since seat ids are index-based, not
        // table-specific — gets wrongly re-pinned to that seat on reload. Writing
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
    // surface a persistence failure (no rollback — consistent with the store).
    return insertGuests(newGuests)
  },
  updateHall: (preset, dimensions) => {
    set((state) => ({ hall: { ...state.hall, preset, dimensions } }))
  },
  saveHall: () => {
    const { hall } = get()
    if (!hall.preset) return

    void upsertHall(hall.preset, hall.dimensions.width, hall.dimensions.height)
  },
  assignGuestToTable: (guestId, tableId) => {
    const state = get()
    if (tableId !== null) {
      const table = state.tables.find((t) => t.id === tableId)
      if (!table) return
      const assignedCount = state.guests.filter(
        (g) => g.tableId === tableId && g.id !== guestId
      ).length
      if (assignedCount >= table.capacity) return
    }
    set((s) => ({
      guests: s.guests.map((g) =>
        g.id === guestId ? { ...g, tableId, seatId: null } : g
      ),
    }))
    // Clear seat_id alongside table_id. Seat ids are index-based (seat-0, …) and
    // not table-specific, so a stale seat_id would wrongly re-pin the guest to the
    // same-index seat at the new table after a reload.
    void updateGuestSeat(guestId, tableId, null)
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
    // guest — otherwise seating the new guest while the occupant still holds the
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
    // Only unpin: the guest stays at the same table as an order-fill (they'll
    // refill the next free seat). Removing them from the table is a separate
    // action (assignGuestToTable(id, null) / the PropertyPanel picker).
    set((s) => ({
      guests: s.guests.map((g) =>
        g.id === guestId ? { ...g, seatId: null } : g
      ),
    }))
    void updateGuestSeat(guestId, guest.tableId ?? null, null)
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
  updateTablePosition: (id, x, y) => {
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === id ? { ...t, position: { x, y } } : t
      ),
    }))
    void updateTablePos(id, x, y)
  },

  addFixture: (fixture, position) => {
    const fixtureId = crypto.randomUUID()
    const newFixture: Fixture = {
      ...fixture,
      id: fixtureId,
      position: position ?? { x: 0, y: 0 },
    }
    set((state) => ({ fixtures: [...state.fixtures, newFixture] }))
    void insertFixture(newFixture)
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
  updateFixturePosition: (id, x, y) => {
    set((state) => ({
      fixtures: state.fixtures.map((f) =>
        f.id === id ? { ...f, position: { x, y } } : f
      ),
    }))
    void updateFixturePos(id, x, y)
  },
}))
