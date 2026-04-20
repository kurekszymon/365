import { create } from "zustand"
import type { Position } from "./planner.store"

export type PanelView =
  | { kind: "hall" }
  | { kind: "table.add"; position?: Position }
  | { kind: "tables.batch_add"; position?: Position }
  | { kind: "table.edit"; tableId: string }
  | { kind: "tables.placeholder" }
  | { kind: "guests" }

type State = {
  view: PanelView | null
}

type Action = {
  openHall: () => void
  openTableAdd: (position?: Position) => void
  openTablesBatchAdd: (position?: Position) => void
  openTableEdit: (tableId: string) => void
  openTablesPlaceholder: () => void
  openGuests: () => void
  close: () => void
  deselect: () => void
}

export const usePanelStore = create<State & Action>((set) => ({
  view: null,

  openHall: () => set({ view: { kind: "hall" } }),
  openTableAdd: (position) => set({ view: { kind: "table.add", position } }),
  openTablesBatchAdd: (position) =>
    set({ view: { kind: "tables.batch_add", position } }),
  openTableEdit: (tableId) => set({ view: { kind: "table.edit", tableId } }),
  openTablesPlaceholder: () => set({ view: { kind: "tables.placeholder" } }),
  openGuests: () => set({ view: { kind: "guests" } }),
  close: () => set({ view: null }),
  deselect: () =>
    set((state) => {
      if (!state.view) return state
      switch (state.view.kind) {
        case "hall":
          return { view: null }
        case "table.add":
        case "tables.batch_add":
        case "table.edit":
          return { view: { kind: "tables.placeholder" } }
        case "tables.placeholder":
        case "guests":
          return state
      }
    }),
}))

export const selectSelectedTableId = (state: State): string | null =>
  state.view?.kind === "table.edit" ? state.view.tableId : null
