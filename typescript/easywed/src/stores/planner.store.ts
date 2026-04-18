import { create } from "zustand"
import {
  insertGuest,
  insertTable,
  reassignTableGuests,
  softDeleteTable,
  updateGuestTable,
  updateTablePos,
  updateTableRow,
  upsertHall,
} from "@/lib/sync/mutations"

export type TableShape = "round" | "rectangular"

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
  position: Position
}

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
  updateTable: (
    id: string,
    table: Omit<Table, "id" | "position">,
    guestIds?: Array<string>
  ) => void
  duplicateTable: (id: string) => string | null
  deleteTable: (id: string) => void
  addGuest: (guest: Omit<Guest, "id">) => void
  updateHall: (
    preset: HallPreset,
    dimensions: { width: number; height: number }
  ) => void
  assignGuestToTable: (guestId: string, tableId: string | null) => void
  updateTablePosition: (id: string, x: number, y: number) => void
}

export const usePlannerStore = create<State & Action>((set, get) => ({
  tables: [],
  guests: [],
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
    void updateTableRow(id, {
      name: table.name,
      shape: table.shape,
      capacity: table.capacity,
      width: table.size.width,
      height: table.size.height,
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
  },
  addGuest: (guest) => {
    const newGuest: Guest = { ...guest, id: crypto.randomUUID() }
    set((state) => ({ guests: [...state.guests, newGuest] }))
    void insertGuest(newGuest)
  },
  updateHall: (preset, dimensions) => {
    set((state) => ({
      hall: { ...state.hall, preset, dimensions },
    }))
    void upsertHall(preset, dimensions.width, dimensions.height)
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
}))
