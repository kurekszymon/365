import { create } from "zustand"
import type { Position } from "./planner.store"

export type PanelView =
  | { kind: "hall" }
  | { kind: "table.add"; position?: Position }
  | { kind: "table.edit"; tableId: string }
  | { kind: "tables.placeholder" }
  | { kind: "guests" }

type State = {
  view: PanelView | null
  selectedTableId: string | null
}

type Action = {
  openHall: () => void
  openTableAdd: (position?: Position) => void
  openTableEdit: (tableId: string) => void
  openTablesPlaceholder: () => void
  openGuests: () => void
  close: () => void
}

export const usePanelStore = create<State & Action>((set) => ({
  view: null,
  selectedTableId: null,

  openHall: () => set({ view: { kind: "hall" } }),
  openTableAdd: (position) =>
    set({ view: { kind: "table.add", position }, selectedTableId: null }),
  openTableEdit: (tableId) =>
    set({ view: { kind: "table.edit", tableId }, selectedTableId: tableId }),
  openTablesPlaceholder: () => set({ view: { kind: "tables.placeholder" } }),
  openGuests: () => set({ view: { kind: "guests" } }),
  close: () => set({ view: null, selectedTableId: null }),
}))
