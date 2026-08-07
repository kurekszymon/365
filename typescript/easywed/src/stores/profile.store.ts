import { create } from "zustand"

/**
 * Whether the user still owes an acceptance of the Regulamin.
 *
 * "unknown" is the pre-hydration state and deliberately does *not* gate: route
 * guards let it through and AuthGate invalidates the router once the real
 * answer lands, exactly like isReady/session in useAuthStore. Gating on
 * "unknown" would bounce every signed-in user through the acceptance screen on
 * every cold load.
 */
export type TermsStatus = "unknown" | "accepted" | "outstanding"

type State = {
  // null = the user hasn't chosen a name. The UI falls back to their role
  // rather than inventing one, so null is a legitimate resting state - not a
  // "not loaded yet" marker. That's what isLoaded is for.
  displayName: string | null
  isLoaded: boolean
  termsStatus: TermsStatus
}

type Action = {
  setDisplayName: (displayName: string | null) => void
  setLoaded: (isLoaded: boolean) => void
  setTermsStatus: (termsStatus: TermsStatus) => void
  reset: () => void
}

export const useProfileStore = create<State & Action>((set) => ({
  displayName: null,
  isLoaded: false,
  termsStatus: "unknown",

  setDisplayName: (displayName) => set({ displayName }),
  setLoaded: (isLoaded) => set({ isLoaded }),
  setTermsStatus: (termsStatus) => set({ termsStatus }),
  reset: () =>
    set({ displayName: null, isLoaded: false, termsStatus: "unknown" }),
}))
