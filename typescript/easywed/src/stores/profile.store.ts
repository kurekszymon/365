import { create } from "zustand"

type State = {
  // null = the user hasn't chosen a name. The UI falls back to their role
  // rather than inventing one, so null is a legitimate resting state - not a
  // "not loaded yet" marker. That's what isLoaded is for.
  displayName: string | null
  isLoaded: boolean
}

type Action = {
  setDisplayName: (displayName: string | null) => void
  setLoaded: (isLoaded: boolean) => void
  reset: () => void
}

export const useProfileStore = create<State & Action>((set) => ({
  displayName: null,
  isLoaded: false,

  setDisplayName: (displayName) => set({ displayName }),
  setLoaded: (isLoaded) => set({ isLoaded }),
  reset: () => set({ displayName: null, isLoaded: false }),
}))
