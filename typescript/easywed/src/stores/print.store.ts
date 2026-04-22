import { create } from "zustand"
import type { GuestField } from "@/lib/export/guestsCsv"

type State = {
  fields: Array<GuestField>
}

type Action = {
  setFields: (fields: Array<GuestField>) => void
}

export const DEFAULT_PRINT_FIELDS: Array<GuestField> = ["name", "dietary"]

export const usePrintStore = create<State & Action>((set) => ({
  fields: DEFAULT_PRINT_FIELDS,

  setFields: (fields) => set({ fields }),
}))
