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

export type UserType = "couple" | "venue"

// undefined = profile hasn't loaded yet (auth still settling); null = signed
// in but not onboarded (route guards redirect to /onboarding); a value = done.
export type UserTypeState = UserType | null | undefined

// What the planner is currently editing. The Canvas + PropertyPanel are
// reused for both: when subjectKind is 'wedding' the mutations write to
// public.tables/fixtures/halls; when 'venue_hall' they write to the
// venue_hall_* tables. See src/lib/sync/mutations.ts for the switch.
export type SubjectKind = "wedding" | "venue_hall"

type State = {
  weddingId?: string
  name?: string
  date?: Date
  role?: WeddingRole
  userType: UserTypeState
  subjectKind: SubjectKind
  subjectId?: string
  viewport: Viewport
}

type Action = {
  setName: (name?: string) => void
  setDate: (date?: Date) => void

  setUserType: (userType: UserTypeState) => void

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
  subjectKind: "wedding",
  subjectId: undefined,
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

  setUserType: (userType) => set({ userType }),

  setPan: (pan) => set((state) => ({ viewport: { ...state.viewport, pan } })),
  setScale: (scale) =>
    set((state) => ({ viewport: { ...state.viewport, scale } })),
  setViewport: (viewport) => set({ viewport }),
}))
