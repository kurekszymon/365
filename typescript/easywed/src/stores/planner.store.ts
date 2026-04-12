import { create } from "zustand"
import type { GridSpacing } from "@/components/planner/Canvas/HallSurface"

const ZOOM_MIN = 0.2
const ZOOM_MAX = 4

export type TableShape = "round" | "rectangular"

export interface Position {
  x: number
  y: number
}

export interface Size {
  // naive approach - just width and height, regardless of table shape. For round tables, width will be used as diameter.
  width: number
  height: number
}

export interface Table {
  id: string
  name: string
  shape: TableShape
  capacity: number
  size: Size
  position: Position
}

export type HallPreset = "rectangle" | "l-shape" | "u-shape" | "custom"

export type Dietary =
  | "vegetarian"
  | "vegan"
  | "gluten-free"
  | "halal"
  | "kosher"

export interface Guest {
  id: string
  name: string
  dietary: Array<Dietary>
  tableId: string | null
  note?: string
}

type State = {
  tables: Array<Table>
  guests: Array<Guest>
  hall: {
    dimensions: {
      width: number
      height: number
    }
    zoom: number
    pan: { x: number; y: number }
    gridSpacing: GridSpacing
    preset?: HallPreset | undefined
  }
}

type Action = {
  addTable: (
    table: Omit<Table, "id" | "position">,
    guestIds?: Array<string>,
    position?: Position
  ) => void
  updateTable: (
    id: string,
    table: Omit<Table, "id" | "position">,
    guestIds?: Array<string>
  ) => void
  addGuest: (guest: Omit<Guest, "id">) => void
  updateHall: (
    preset: HallPreset,
    dimensions: { width: number; height: number },
    gridSpacing?: GridSpacing
  ) => void
  updateHallProperties: (
    preset: HallPreset,
    dimensions: { width: number; height: number },
    gridSpacing?: GridSpacing
  ) => void
  assignGuestToTable: (guestId: string, tableId: string | null) => void
  resetHallZoomAndPan: () => void
  stepHallZoom: (direction: 1 | -1) => void
  setHallPan: (pan: { x: number; y: number }) => void
  updateTablePosition: (id: string, x: number, y: number) => void
}

export const usePlannerStore = create<State & Action>((set) => ({
  tables: [],
  guests: [],
  hall: {
    dimensions: {
      width: 20,
      height: 12,
    },
    preset: undefined,
    zoom: 1,
    pan: { x: 0, y: 0 },
    gridSpacing: 1,
  },

  addTable: (table, guestIds = [], position) =>
    set((state) => {
      const tableId = crypto.randomUUID()

      return {
        tables: [
          ...state.tables,
          {
            ...table,
            id: tableId,
            position: position ?? { x: 0, y: 0 },
          },
        ],
        guests:
          guestIds.length === 0
            ? state.guests
            : state.guests.map((guest) =>
                guestIds.includes(guest.id)
                  ? {
                      ...guest,
                      tableId,
                    }
                  : guest
              ),
      }
    }),
  updateTable: (id, table, guestIds = []) =>
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === id ? { ...t, ...table, position: t.position } : t
      ),
      guests: state.guests.map((guest) => {
        if (guestIds.includes(guest.id)) {
          return {
            ...guest,
            tableId: id,
          }
        }

        if (guest.tableId === id) {
          return {
            ...guest,
            tableId: null,
          }
        }

        return guest
      }),
    })),
  addGuest: (guest) =>
    set((state) => ({
      guests: [...state.guests, { ...guest, id: crypto.randomUUID() }],
    })),
  updateHall: (preset, dimensions, gridSpacing = 1) =>
    set((state) => ({
      hall: {
        ...state.hall,
        preset,
        dimensions,
        gridSpacing,
        zoom: 1,
        pan: { x: 0, y: 0 },
      },
    })),
  updateHallProperties: (preset, dimensions, gridSpacing = 1) =>
    set((state) => ({
      hall: {
        ...state.hall,
        preset,
        dimensions,
        gridSpacing,
      },
    })),
  assignGuestToTable: (guestId, tableId) =>
    set((state) => ({
      guests: state.guests.map((g) =>
        g.id === guestId ? { ...g, tableId } : g
      ),
    })),
  resetHallZoomAndPan: () =>
    set((state) => ({
      hall: { ...state.hall, zoom: 1, pan: { x: 0, y: 0 } },
    })),
  stepHallZoom: (direction) =>
    // ref: https://gamedev.net/forums/topic/666225-equation-for-zooming/
    // Math.exp is the inverse of Math.log, so it's converting to log-space, applying the zoom delta, then converting back.
    // modify the direction (+ or -) to control zoom in vs zoom out
    set((state) => ({
      hall: {
        ...state.hall,
        zoom: Math.max(
          ZOOM_MIN,
          Math.min(
            ZOOM_MAX,
            Math.exp(Math.log(state.hall.zoom) + direction * 0.08)
          )
        ),
      },
    })),
  setHallPan: (pan) =>
    set((state) => ({
      hall: { ...state.hall, pan },
    })),
  updateTablePosition: (id, x, y) =>
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === id ? { ...t, position: { x, y } } : t
      ),
    })),
}))
