import { create } from "zustand"

interface Pan {
  x: number
  y: number
}

interface Viewport {
  pan: Pan
  scale: number
}

type State = {
  name: string
  date: Date
  viewport: Viewport
}

type Action = {
  setName: (name: string) => void
  setDate: (date: Date) => void

  setPan: (pan: Pan) => void
  setScale: (scale: number) => void
  setViewport: (viewport: Viewport) => void
}

export const useGlobalStore = create<State & Action>((set) => ({
  name: "My perfect wedding",
  date: new Date(),
  viewport: {
    scale: 1,
    pan: {
      x: 0,
      y: 0,
    },
  },

  setName: (name) => set({ name }),
  setDate: (date) => set({ date }),

  setPan: (pan) => set((state) => ({ viewport: { ...state.viewport, pan } })),
  setScale: (scale) =>
    set((state) => ({ viewport: { ...state.viewport, scale } })),
  setViewport: (viewport) => set({ viewport }),
}))
