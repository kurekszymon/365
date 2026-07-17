import { create } from "zustand"
import type { Position } from "./planner.store"

export type PanelView =
  | { kind: "hall" }
  | { kind: "tables.batch_add"; position?: Position }
  | { kind: "table.edit"; tableId: string }
  | { kind: "fixture.edit"; fixtureId: string }
  | { kind: "add_hub" }
  | { kind: "ai_chat" }

type State = {
  view: PanelView | null
  // The canvas element (table/fixture) showing its selection ring + action
  // buttons. Decoupled from `view` so touch can tap-to-select without opening
  // the edit sheet (long-press opens edit). Desktop edit sets both.
  selectedId: string | null
}

type Action = {
  openHall: () => void
  openTablesBatchAdd: (position?: Position) => void
  openTableEdit: (tableId: string) => void
  openFixtureEdit: (fixtureId: string) => void
  openAddHub: () => void
  openAiChat: () => void
  select: (id: string | null) => void
  close: () => void
  deselect: () => void
}

export const usePanelStore = create<State & Action>((set) => ({
  view: null,
  selectedId: null,

  openHall: () => set({ view: { kind: "hall" }, selectedId: null }),
  openTablesBatchAdd: (position) =>
    set({ view: { kind: "tables.batch_add", position }, selectedId: null }),
  openTableEdit: (tableId) =>
    set({ view: { kind: "table.edit", tableId }, selectedId: tableId }),
  openFixtureEdit: (fixtureId) =>
    set({ view: { kind: "fixture.edit", fixtureId }, selectedId: fixtureId }),
  openAddHub: () => set({ view: { kind: "add_hub" }, selectedId: null }),
  openAiChat: () => set({ view: { kind: "ai_chat" }, selectedId: null }),
  select: (id) => set({ selectedId: id }),
  close: () => set({ view: null, selectedId: null }),
  deselect: () =>
    set((state) => {
      const next = { selectedId: null }
      if (!state.view) return next
      switch (state.view.kind) {
        // Clicking the canvas background closes any open form; the add hub and
        // the AI chat stay open - deselecting is orthogonal to them.
        case "hall":
        case "tables.batch_add":
        case "table.edit":
        case "fixture.edit":
          return { ...next, view: null }
        case "add_hub":
        case "ai_chat":
          return next
      }
    }),
}))

export const selectSelectedTableId = (state: State): string | null =>
  state.view?.kind === "table.edit" ? state.view.tableId : null
