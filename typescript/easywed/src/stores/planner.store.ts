import { create } from "zustand"

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
    set((state) => ({
      tables: [
        ...state.tables,
        {
          ...table,
          id: tableId,
          position: position ?? { x: 0, y: 0 },
        },
      ],
      guests:
        guestIds.length === 0
          ? state.guests
          : state.guests.map((guest) =>
              guestIds.includes(guest.id) ? { ...guest, tableId } : guest
            ),
    }))
    return tableId
  },
  updateTable: (id, table, guestIds = []) =>
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === id ? { ...t, ...table, position: t.position } : t
      ),
      guests: state.guests.map((guest) => {
        if (guestIds.includes(guest.id)) {
          return {
            ...guest,
            tableId: id,
          }
        }

        if (guest.tableId === id) {
          return {
            ...guest,
            tableId: null,
          }
        }

        return guest
      }),
    })),
  duplicateTable: (id) => {
    const original = get().tables.find((t) => t.id === id)
    if (!original) return null
    const newId = crypto.randomUUID()
    set((state) => ({
      tables: [
        ...state.tables,
        {
          ...original,
          id: newId,
          position: {
            x: original.position.x + 0.5,
            y: original.position.y + 0.5,
          },
        },
      ],
    }))
    return newId
  },
  deleteTable: (id) =>
    set((state) => ({
      tables: state.tables.filter((t) => t.id !== id),
      guests: state.guests.map((g) =>
        g.tableId === id ? { ...g, tableId: null } : g
      ),
    })),
  addGuest: (guest) =>
    set((state) => ({
      guests: [...state.guests, { ...guest, id: crypto.randomUUID() }],
    })),
  updateHall: (preset, dimensions) =>
    set((state) => ({
      hall: {
        ...state.hall,
        preset,
        dimensions,
      },
    })),
  assignGuestToTable: (guestId, tableId) =>
    set((state) => {
      if (tableId !== null) {
        const table = state.tables.find((t) => t.id === tableId)
        if (!table) return state
        const assignedCount = state.guests.filter(
          (g) => g.tableId === tableId && g.id !== guestId
        ).length
        if (assignedCount >= table.capacity) return state
      }
      return {
        guests: state.guests.map((g) =>
          g.id === guestId ? { ...g, tableId } : g
        ),
      }
    }),
  updateTablePosition: (id, x, y) =>
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === id ? { ...t, position: { x, y } } : t
      ),
    })),
}))
