// i still don't know if that's correct idea, but might as well just try since it's most likely another personal prejct

import { create } from "zustand"

type Guests =
  | "Guest.Add"
  | "Guest.Edit"
  | "Guest.Import"
  | "Guests.Export.Csv"
  | "Guests.Export.Pdf"
type Planner =
  | "Planner.Export.Dxf"
  | "Planner.Import.Dxf"
  | "Planner.Hall.Delete"
type Weddings = "Wedding.Rename" | "Wedding.Members" | "Wedding.Import.Dxf"
type Dialog = Weddings | Guests | Planner

// Optional context a dialog needs to open - e.g. which guest `Guest.Edit`
// should load. Cleared alongside `opened` on close.
type DialogPayload = {
  guestId?: string
  hallId?: string
}

type State = {
  opened: Dialog | null
  payload: DialogPayload
}

type Action = {
  open: (dialog: Dialog, payload?: DialogPayload) => void
  close: () => void
}

export const useDialogStore = create<State & Action>((set) => ({
  opened: null,
  payload: {},

  open: (dialog, payload = {}) => set({ opened: dialog, payload }),
  close: () => set({ opened: null, payload: {} }),
}))
