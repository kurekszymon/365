import { create } from "zustand"
import type { Fixture, Table } from "./planner.store"

// What the user last copied off the canvas. We stash a full snapshot of the
// table/fixture so a paste can recreate it after the original is moved, edited,
// or deleted. Guest assignments are intentionally not carried over on paste.
export type ClipboardItem =
  | { kind: "table"; table: Table }
  | { kind: "fixture"; fixture: Fixture }

type State = {
  item: ClipboardItem | null
}

type Action = {
  copy: (item: ClipboardItem) => void
  clear: () => void
}

export const useClipboardStore = create<State & Action>((set) => ({
  item: null,
  copy: (item) => set({ item }),
  clear: () => set({ item: null }),
}))
