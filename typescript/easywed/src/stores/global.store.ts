import { create } from "zustand"
import { updateWedding } from "@/lib/sync/mutations"

interface Pan {
  x: number
  y: number
}

interface Viewport {
  pan: Pan
  scale: number
}

export type WeddingRole = "owner" | "editor" | "viewer"

// null = profile loaded but user hasn't completed onboarding
// undefined = profile not yet loaded
export type UserType = "couple" | "venue" | "planner"

type State = {
  weddingId?: string
  name?: string
  date?: Date
  role?: WeddingRole
  userType: UserType | null | undefined
  hasSubscription: boolean | undefined
  viewport: Viewport
}

type Action = {
  setName: (name?: string) => void
  setDate: (date?: Date) => void
  setUserType: (userType: UserType | null | undefined) => void
  setHasSubscription: (hasSubscription: boolean | undefined) => void
  setRole: (role: WeddingRole | undefined) => void

  setPan: (pan: Pan) => void
  setScale: (scale: number) => void
  setViewport: (viewport: Viewport) => void
}

export const useGlobalStore = create<State & Action>((set) => ({
  weddingId: undefined,
  name: undefined,
  date: undefined,
  role: undefined,
  userType: undefined,
  hasSubscription: undefined,
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
  setUserType: (userType: UserType | null | undefined) => set({ userType }),
  setHasSubscription: (hasSubscription) => set({ hasSubscription }),
  setRole: (role) => set({ role }),

  setPan: (pan) => set((state) => ({ viewport: { ...state.viewport, pan } })),
  setScale: (scale) =>
    set((state) => ({ viewport: { ...state.viewport, scale } })),
  setViewport: (viewport) => set({ viewport }),
}))
