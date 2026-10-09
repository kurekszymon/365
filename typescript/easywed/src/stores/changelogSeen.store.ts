import { create } from "zustand"
import { persist } from "zustand/middleware"

export const CHANGELOG_SEEN_STORAGE_KEY = "easywed.changelogSeen"

type State = {
  // Release id each user last opened the changelog at, keyed by user id so
  // two accounts sharing a browser don't clear each other's dot.
  seen: Record<string, string | undefined>
}

type Action = {
  markSeen: (userId: string, releaseId: string) => void
}

// Plain localStorage, like onboarding.store: a per-device "read it" flag with
// no plan content in it. Per device rather than in `profiles` on purpose - the
// cost of a dot reappearing on a second device is one click.
export const useChangelogSeenStore = create<State & Action>()(
  persist(
    (set) => ({
      seen: {},
      markSeen: (userId, releaseId) =>
        set((state) => ({ seen: { ...state.seen, [userId]: releaseId } })),
    }),
    { name: CHANGELOG_SEEN_STORAGE_KEY }
  )
)
