import { create } from "zustand"
import { persist } from "zustand/middleware"
import { updateWedding } from "@/lib/sync/mutations"
import {
  GLOBAL_STORAGE_KEY,
  localGlobalStorage,
  registerActiveWeddingIdGetter,
} from "@/lib/localWedding"

interface Pan {
  x: number
  y: number
}

interface Viewport {
  pan: Pan
  scale: number
}

export type WeddingRole = "owner" | "editor" | "viewer"

type State = {
  weddingId?: string
  name?: string
  date?: Date
  role?: WeddingRole
  viewport: Viewport
}

type Action = {
  setName: (name?: string) => void
  setDate: (date?: Date) => void

  setPan: (pan: Pan) => void
  setScale: (scale: number) => void
  setViewport: (viewport: Viewport) => void
}

export const useGlobalStore = create<State & Action>()(
  persist(
    (set) => ({
      weddingId: undefined,
      name: undefined,
      date: undefined,
      role: undefined,
      viewport: {
        scale: 1,
        pan: {
          x: 0,
          y: 0,
        },
      },

      setName: (name) => {
        set({ name })
        void updateWedding({ name: name ?? "" })
      },
      setDate: (date) => {
        set({ date })
        void updateWedding({
          date: date ? date.toISOString().slice(0, 10) : null,
        })
      },

      setPan: (pan) =>
        set((state) => ({ viewport: { ...state.viewport, pan } })),
      setScale: (scale) =>
        set((state) => ({ viewport: { ...state.viewport, scale } })),
      setViewport: (viewport) => set({ viewport }),
    }),
    {
      name: GLOBAL_STORAGE_KEY,
      skipHydration: true,
      storage: localGlobalStorage,
      // Only name/date are guest-editable content worth persisting locally —
      // weddingId/role are route-derived (set explicitly by wedding.local.tsx
      // / loadWedding.ts) and viewport is already persisted per-wedding by
      // view.store.ts.
      partialize: (state) => ({ name: state.name, date: state.date }),
    }
  )
)

// Registered after the store exists (not inline in its own persist config)
// so the local-storage gate can read the live weddingId without a same-file
// self-reference, which TypeScript can't type-check circularly.
registerActiveWeddingIdGetter(() => useGlobalStore.getState().weddingId)
