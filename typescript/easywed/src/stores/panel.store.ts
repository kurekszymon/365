import { create } from "zustand"
import type { Position } from "./planner.store"

export type PanelView =
  | { kind: "hall" }
  | { kind: "table.add"; position?: Position }
  | { kind: "tables.batch_add"; position?: Position }
  | { kind: "table.edit"; tableId: string }
  | { kind: "tables.placeholder" }
  | { kind: "guests" }
  | { kind: "fixture.add"; position?: Position }
  | { kind: "fixture.edit"; fixtureId: string }
  | { kind: "fixtures.placeholder" }

type State = {
  view: PanelView | null
  // The canvas element (table/fixture) showing its selection ring + action
  // buttons. Decoupled from `view` so touch can tap-to-select without opening
  // the edit sheet (long-press opens edit). Desktop edit sets both.
  selectedId: string | null
}

type Action = {
  openHall: () => void
  openTableAdd: (position?: Position) => void
  openTablesBatchAdd: (position?: Position) => void
  openTableEdit: (tableId: string) => void
  openTablesPlaceholder: () => void
  openGuests: () => void
  openFixtureAdd: (position?: Position) => void
  openFixtureEdit: (fixtureId: string) => void
  openFixturesPlaceholder: () => void
  select: (id: string | null) => void
  close: () => void
  deselect: () => void
}

export const usePanelStore = create<State & Action>((set) => ({
  view: null,
  selectedId: null,

  openHall: () => set({ view: { kind: "hall" }, selectedId: null }),
  openTableAdd: (position) =>
    set({ view: { kind: "table.add", position }, selectedId: null }),
  openTablesBatchAdd: (position) =>
    set({ view: { kind: "tables.batch_add", position }, selectedId: null }),
  openTableEdit: (tableId) =>
    set({ view: { kind: "table.edit", tableId }, selectedId: tableId }),
  openTablesPlaceholder: () =>
    set({ view: { kind: "tables.placeholder" }, selectedId: null }),
  openGuests: () => set({ view: { kind: "guests" }, selectedId: null }),
  openFixtureAdd: (position) =>
    set({ view: { kind: "fixture.add", position }, selectedId: null }),
  openFixtureEdit: (fixtureId) =>
    set({ view: { kind: "fixture.edit", fixtureId }, selectedId: fixtureId }),
  openFixturesPlaceholder: () =>
    set({ view: { kind: "fixtures.placeholder" }, selectedId: null }),
  select: (id) => set({ selectedId: id }),
  close: () => set({ view: null, selectedId: null }),
  deselect: () =>
    set((state) => {
      const next = { selectedId: null }
      if (!state.view) return next
      switch (state.view.kind) {
        case "hall":
          return { ...next, view: null }
        case "table.add":
        case "tables.batch_add":
        case "table.edit":
          return { ...next, view: { kind: "tables.placeholder" } }
        case "tables.placeholder":
        case "guests":
          return next
        case "fixture.add":
        case "fixture.edit":
          return { ...next, view: { kind: "fixtures.placeholder" } }
        case "fixtures.placeholder":
          return next
      }
    }),
}))

export const selectSelectedTableId = (state: State): string | null =>
  state.view?.kind === "table.edit" ? state.view.tableId : null
