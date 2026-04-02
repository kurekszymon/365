import { create } from "zustand"

export type TableShape = "round" | "rectangular"

export interface Table {
  id: string
  name: string
  shape: TableShape
  capacity: number
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
    preset: HallPreset
  }
}

type Action = {
  updateTables: (table: Omit<Table, "id">) => void
  addGuest: (guest: Omit<Guest, "id">) => void
  updateHallPreset: (preset: HallPreset) => void
  updateHallWidth: (width: number) => void
  updateHallHeight: (height: number) => void
}

export const usePlannerStore = create<State & Action>((set) => ({
  tables: [],
  guests: [],
  hall: {
    dimensions: {
      width: 20,
      height: 12,
    },
    preset: "rectangle",
  },

  updateTables: (table) =>
    set((state) => ({
      tables: [...state.tables, { ...table, id: crypto.randomUUID() }],
    })),
  addGuest: (guest) =>
    set((state) => ({
      guests: [...state.guests, { ...guest, id: crypto.randomUUID() }],
    })),
  updateHallPreset: (preset) =>
    set((state) => ({ hall: { ...state.hall, preset } })),
  updateHallWidth: (width) =>
    set((state) => ({
      hall: { ...state.hall, dimensions: { ...state.hall.dimensions, width } },
    })),
  updateHallHeight: (height) =>
    set((state) => ({
      hall: { ...state.hall, dimensions: { ...state.hall.dimensions, height } },
    })),
}))
