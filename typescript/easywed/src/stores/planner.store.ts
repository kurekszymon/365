import { create } from "zustand"
import {
  insertFixture,
  insertGuest,
  insertTable,
  insertTables,
  reassignTableGuests,
  softDeleteFixture,
  softDeleteTable,
  updateFixturePos,
  updateFixtureRow,
  updateGuestTable,
  updateTablePos,
  updateTableRow,
  upsertHall,
} from "@/lib/sync/mutations"
import { useGlobalStore } from "@/stores/global.store"
import { useMeasuresStore } from "@/stores/measures.store"

export type TableShape = "round" | "rectangular"

export type FixtureShape = "rectangle" | "circle" | "rounded"

export interface Fixture {
  id: string
  name: string
  shape: FixtureShape
  size: Size
  rotation: TableRotation
  position: Position
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

export interface Table {
  id: string
  name: string
  shape: TableShape
  capacity: number
  size: Size
  rotation: TableRotation
  position: Position
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
  note?: string
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
  updateHall: (
    preset: HallPreset,
    dimensions: { width: number; height: number }
  ) => void
  saveHall: () => void
  assignGuestToTable: (guestId: string, tableId: string | null) => void
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
          return { ...guest, tableId: id }
        }
        if (guest.tableId === id) {
          return { ...guest, tableId: null }
        }
        return guest
      }),
    }))
  },
  saveTable: (id) => {
    const state = get()
    const table = state.tables.find((t) => t.id === id)

    if (!table) return

    const guestIds = state.guests
      .filter((g) => g.tableId === id)
      .map((g) => g.id)

    void updateTableRow(id, {
      name: table.name,
      shape: table.shape,
      capacity: table.capacity,
      width: table.size.width,
      height: table.size.height,
      rotation: table.rotation,
    }).then((ok) => {
      if (ok) void reassignTableGuests(id, guestIds)
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
        g.tableId === id ? { ...g, tableId: null } : g
      ),
    }))
    void softDeleteTable(id)
    const weddingId = useGlobalStore.getState().weddingId
    if (weddingId) useMeasuresStore.getState().removeObjectMeasurements(weddingId, id)
  },
  addGuest: (guest) => {
    const newGuest: Guest = { ...guest, id: crypto.randomUUID() }
    set((state) => ({ guests: [...state.guests, newGuest] }))
    void insertGuest(newGuest)
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
      guests: s.guests.map((g) => (g.id === guestId ? { ...g, tableId } : g)),
    }))
    void updateGuestTable(guestId, tableId)
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
    if (weddingId) useMeasuresStore.getState().removeObjectMeasurements(weddingId, id)
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
