// i still don't know if that's correct idea, but might as well just try since it's most likely another personal prejct

import { create } from "zustand"

type Guests = "Guest.Add" | "Guests.Export.Csv" | "Guests.Export.Pdf"
type Weddings = "Wedding.Rename" | "Wedding.Create" | "Wedding.Members"
type Dialog = Weddings | Guests

type State = {
  opened: Dialog | null
}

type Action = {
  open: (dialog: Dialog) => void
  close: () => void
}

export const useDialogStore = create<State & Action>((set) => ({
  opened: null,

  open: (dialog) => set({ opened: dialog }),
  close: () => set({ opened: null }),
}))
