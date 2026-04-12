// i still don't know if that's correct idea, but might as well just try since it's most likely another personal prejct

import { create } from "zustand"

type Guests = "Guest.Add"
type Weddings = "Wedding.Rename" | "Wedding.Create"
type Dialog = Weddings | Guests

type DialogMeta = Record<string, never>

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
