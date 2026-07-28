import { create } from "zustand"
import type { GuestField } from "@/lib/export/guestsCsv"
import type { GuestSort } from "@/lib/export/guests"
import { DEFAULT_GUEST_SORT } from "@/lib/export/guests"

type State = {
  fields: Array<GuestField>
  // How guests are ordered under each table heading - alphabetically or by the
  // chair they sit in.
  sort: GuestSort
  // Whether the printed guest list annotates non-adult guests with their age
  // bracket. Adults are the default and never annotated, so this only ever
  // adds "(0-3 years)"-style suffixes for children.
  includeAgeGroups: boolean
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
  setSort: (sort: GuestSort) => void
  setIncludeAgeGroups: (includeAgeGroups: boolean) => void
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
  sort: DEFAULT_GUEST_SORT,
  includeAgeGroups: true,
  includeSeats: false,
  seatsShowEmpty: true,
  includeGrid: true,
  showHallOutline: true,
  fitToContent: false,

  setFields: (fields) => set({ fields }),
  setSort: (sort) => set({ sort }),
  setIncludeAgeGroups: (includeAgeGroups) => set({ includeAgeGroups }),
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
