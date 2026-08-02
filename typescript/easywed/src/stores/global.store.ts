import { create } from "zustand"
import { persist } from "zustand/middleware"
import { updateWedding } from "@/lib/sync/mutations"
import i18n from "@/i18n"
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

/**
 * Everyone with access to the current wedding. `displayName` is null until
 * that person sets one in their settings - see the profiles migration for why
 * this is all we're allowed to know about them.
 */
export type WeddingMember = {
  userId: string
  role: WeddingRole
  displayName: string | null
}

type State = {
  weddingId?: string
  name?: string
  date?: Date
  role?: WeddingRole
  members: Array<WeddingMember>
  viewport: Viewport
}

type Action = {
  setName: (name?: string) => void
  setDate: (date?: Date) => void
  setMembers: (members: Array<WeddingMember>) => void
  setMemberDisplayName: (userId: string, displayName: string | null) => void

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
      members: [],
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

      setMembers: (members) => set({ members }),
      // Renaming yourself in settings has to reach the avatar stack, which
      // reads the member list loaded with the wedding rather than re-fetching.
      setMemberDisplayName: (userId, displayName) =>
        set((state) => ({
          members: state.members.map((member) =>
            member.userId === userId ? { ...member, displayName } : member
          ),
        })),

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
      // Only name/date are guest-editable content worth persisting locally -
      // weddingId/role are route-derived (set explicitly by wedding.local.tsx
      // / loadWedding.ts) and viewport is already persisted per-wedding by
      // view.store.ts.
      partialize: (state) => ({ name: state.name, date: state.date }),
      // rehydrate() is only ever called for the local wedding (skipHydration is
      // true and wedding.local.tsx is the sole caller), so this merge runs
      // exclusively in guest mode. Give a first-time guest with no persisted
      // name a friendly, still-editable default instead of a blank header.
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<State>) }
        if (!merged.name?.trim()) {
          merged.name = i18n.t("wedding.default_local_name")
        }
        return merged
      },
    }
  )
)

// Registered after the store exists (not inline in its own persist config)
// so the local-storage gate can read the live weddingId without a same-file
// self-reference, which TypeScript can't type-check circularly.
registerActiveWeddingIdGetter(() => useGlobalStore.getState().weddingId)
