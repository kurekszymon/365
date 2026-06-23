import { create } from "zustand"
import type { GuestField } from "@/lib/export/guestsCsv"

type State = {
  fields: Array<GuestField>
  // Whether the printed hall layout renders seat markers.
  includeSeats: boolean
  // When rendering seats, whether to also draw empty (unoccupied) seat positions.
  seatsShowEmpty: boolean
  // Whether the printed hall renders grid lines.
  includeGrid: boolean
  // Whether to draw the hall outline + paper background; off renders the tables
  // bare (transparent, no border).
  showHallOutline: boolean
  // When set, the hall is zoomed to the bounding box of tables + seats (fit to
  // page) instead of rendering the full hall with its empty margins.
  fitToContent: boolean
}

type Action = {
  setFields: (fields: Array<GuestField>) => void
  setSeatOptions: (opts: {
    includeSeats: boolean
    seatsShowEmpty?: boolean
  }) => void
  setLayoutOptions: (opts: {
    includeGrid?: boolean
    showHallOutline?: boolean
    fitToContent?: boolean
  }) => void
}

export const DEFAULT_PRINT_FIELDS: Array<GuestField> = ["name", "dietary"]

export const usePrintStore = create<State & Action>((set) => ({
  fields: DEFAULT_PRINT_FIELDS,
  includeSeats: false,
  seatsShowEmpty: true,
  includeGrid: true,
  showHallOutline: true,
  fitToContent: false,

  setFields: (fields) => set({ fields }),
  setSeatOptions: ({ includeSeats, seatsShowEmpty }) =>
    set((state) => ({
      includeSeats,
      seatsShowEmpty: seatsShowEmpty ?? state.seatsShowEmpty,
    })),
  setLayoutOptions: ({ includeGrid, showHallOutline, fitToContent }) =>
    set((state) => ({
      includeGrid: includeGrid ?? state.includeGrid,
      showHallOutline: showHallOutline ?? state.showHallOutline,
      fitToContent: fitToContent ?? state.fitToContent,
    })),
}))
