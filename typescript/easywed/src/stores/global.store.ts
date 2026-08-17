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

/**
 * `owner`/`editor`/`viewer` are rows in `wedding_members`. `venue` is not: it
 * is *derived* by `wedding_role()` from the wedding's `tenant_id` plus
 * `venue_access = 'granted'`, and `wedding_members_role_check` deliberately
 * refuses to store it, so no member row can ever carry it (see
 * 20260817000003). It therefore never appears in `members` below - only in
 * `role`, and only for staff of the linked venue.
 */
export type WeddingRole = "owner" | "editor" | "viewer" | "venue"

/**
 * How much of this wedding the linked venue may see.
 *
 * `none` covers both "never linked" and "the couple said no"; `pending` is
 * linked-and-unanswered and discloses nothing at all; `granted` is the explicit
 * consent that derives the `venue` role. Mirrors the CHECK on
 * `weddings.venue_access`.
 */
export type VenueAccess = "none" | "pending" | "granted"

/**
 * The venue this wedding is linked to, as the couple sees it.
 *
 * Present whenever `weddings.tenant_id` is set, regardless of `venueAccess` -
 * a couple who has not granted anything still needs the venue's name to decide
 * whether to.
 */
export type LinkedVenue = {
  tenantId: string
  slug: string
  name: string
}

/**
 * Whether the current user may change anything in the loaded wedding.
 *
 * Mirrors the RLS predicate every write policy uses
 * (`wedding_role(...) in ('owner', 'editor')`), so the UI offers exactly what
 * the database will accept. Viewers get a read-only planner: without this they
 * were shown the full editing surface, and their changes applied optimistically
 * to the store, hit an RLS refusal, and silently reverted on the next reload.
 *
 * Fails closed on an unknown role. `undefined` is both the pre-load state and
 * the "this user has no membership row" state - defaulting either to editable
 * would flash write affordances at a viewer before loadWedding resolves.
 * Guest mode is unaffected: wedding.local.tsx sets role "owner" up front.
 *
 * An allowlist, which is why the derived `venue` role needed no change here
 * when it was added - it is excluded by construction, exactly as it is by every
 * write policy in the database. Keep it an allowlist for that reason: a
 * `role !== "viewer"` formulation would have silently admitted the venue.
 */
export const selectCanEdit = (state: { role?: WeddingRole }): boolean =>
  state.role === "owner" || state.role === "editor"

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
  /** Null when this wedding is linked to no venue, and in guest mode. */
  venue: LinkedVenue | null
  venueAccess: VenueAccess
  viewport: Viewport
}

type Action = {
  setName: (name?: string) => void
  setDate: (date?: Date) => void
  setMembers: (members: Array<WeddingMember>) => void
  setMemberDisplayName: (userId: string, displayName: string | null) => void
  setVenueLink: (venue: LinkedVenue | null, venueAccess: VenueAccess) => void

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
      venue: null,
      venueAccess: "none",
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
      // Written by loadWedding and by the two venue RPCs, which re-read the
      // wedding rather than guessing: `venue_access` is server-owned (the
      // client cannot write the column at all - see
      // enforce_wedding_tenant_columns), so an optimistic update here would be
      // asserting something only the database is entitled to say.
      setVenueLink: (venue, venueAccess) => set({ venue, venueAccess }),
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
