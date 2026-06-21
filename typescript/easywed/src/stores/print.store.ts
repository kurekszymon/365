import { create } from "zustand"
import type { GuestField } from "@/lib/export/guestsCsv"

type State = {
  fields: Array<GuestField>
  // Whether the printed hall layout renders seat markers.
  includeSeats: boolean
  // When rendering seats, whether to also draw empty (unoccupied) seat positions.
  seatsShowEmpty: boolean
}

type Action = {
  setFields: (fields: Array<GuestField>) => void
  setSeatOptions: (opts: {
    includeSeats: boolean
    seatsShowEmpty?: boolean
  }) => void
}

export const DEFAULT_PRINT_FIELDS: Array<GuestField> = ["name", "dietary"]

export const usePrintStore = create<State & Action>((set) => ({
  fields: DEFAULT_PRINT_FIELDS,
  includeSeats: false,
  seatsShowEmpty: true,

  setFields: (fields) => set({ fields }),
  setSeatOptions: ({ includeSeats, seatsShowEmpty }) =>
    set((state) => ({
      includeSeats,
      seatsShowEmpty: seatsShowEmpty ?? state.seatsShowEmpty,
    })),
}))
