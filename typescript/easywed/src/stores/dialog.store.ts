// i still don't know if that's correct idea, but might as well just try since it's most likely another personal prejct

import { create } from "zustand"
import type { Position } from "./planner.store"

type Guests = "Guest.Add"
type Halls = "Hall.Configure"
type Weddings = "Wedding.Rename" | "Wedding.Create"
type Tables = "Table.Add" | "Table.Edit"
type Dialog = Weddings | Halls | Guests | Tables

type DialogMeta = {
  spawnPosition?: Position
  tableId?: string
}

type State = {
  opened: Dialog | null
  meta: DialogMeta
}

type Action = {
  open: (dialog: Dialog, meta?: DialogMeta) => void
  close: () => void
}

export const useDialogStore = create<State & Action>((set) => ({
  opened: null,
  meta: {},

  open: (dialog, meta = {}) => set({ opened: dialog, meta }),
  close: () => set({ opened: null, meta: {} }),
}))
