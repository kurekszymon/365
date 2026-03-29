import { create } from "zustand"

export type TableShape = "round" | "rectangular"

export interface Table {
  id: string
  name: string
  shape: TableShape
  capacity: number
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
  note?: string
}

type State = {
  tables: Array<Table>
  guests: Array<Guest>
}

type Action = {
  updateTables: (table: Table) => void
  updateGuests: (guest: Guest) => void
}

export const usePlannerStore = create<State & Action>((set) => ({
  tables: [],
  guests: [],

  updateTables: (table) =>
    set((state) => ({ tables: [...state.tables, table] })),
  updateGuests: (guest) =>
    set((state) => ({ guests: [...state.guests, guest] })),
}))
