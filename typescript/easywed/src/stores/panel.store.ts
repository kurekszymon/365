import { create } from "zustand"
import type { Position } from "./planner.store"

export type PanelView =
  | { kind: "halls.list" }
  | { kind: "hall.edit"; hallId: string }
  | { kind: "tables.batch_add"; position?: Position; hallId?: string }
  | { kind: "table.edit"; tableId: string }
  | { kind: "fixture.edit"; fixtureId: string }
  // Canvas-only mode: no dialog/drawer renders so the ShapeEditOverlay can
  // own the canvas while the user drags the entity's outline vertices.
  // `entityKind` picks whose outline is edited (a fixture's polygon or a
  // hall's floor plan); tables join when they get the editor.
  | { kind: "shape.edit"; entityKind: "fixture" | "hall"; id: string }
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
  openHalls: () => void
  openHallEdit: (hallId: string) => void
  openTablesBatchAdd: (position?: Position, hallId?: string) => void
  openTableEdit: (tableId: string) => void
  openFixtureEdit: (fixtureId: string) => void
  openShapeEdit: (id: string, entityKind?: "fixture" | "hall") => void
  openAddHub: () => void
  openAiChat: () => void
  select: (id: string | null) => void
  close: () => void
  deselect: () => void
}

export const usePanelStore = create<State & Action>((set) => ({
  view: null,
  selectedId: null,

  openHalls: () => set({ view: { kind: "halls.list" }, selectedId: null }),
  openHallEdit: (hallId) =>
    set({ view: { kind: "hall.edit", hallId }, selectedId: null }),
  openTablesBatchAdd: (position, hallId) =>
    set({
      view: { kind: "tables.batch_add", position, hallId },
      selectedId: null,
    }),
  openTableEdit: (tableId) =>
    set({ view: { kind: "table.edit", tableId }, selectedId: tableId }),
  openFixtureEdit: (fixtureId) =>
    set({ view: { kind: "fixture.edit", fixtureId }, selectedId: fixtureId }),
  // selectedId stays null: the selection ring + action buttons would overlap
  // the vertex handles.
  openShapeEdit: (id, entityKind = "fixture") =>
    set({
      view: { kind: "shape.edit", entityKind, id },
      selectedId: null,
    }),
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
        case "halls.list":
        case "hall.edit":
        case "tables.batch_add":
        case "table.edit":
        case "fixture.edit":
          return { ...next, view: null }
        // A canvas-background click while editing a shape is likely a missed
        // vertex handle - the mode only exits via its Done button / Escape.
        case "shape.edit":
        case "add_hub":
        case "ai_chat":
          return next
      }
    }),
}))

export const selectSelectedTableId = (state: State): string | null =>
  state.view?.kind === "table.edit" ? state.view.tableId : null
