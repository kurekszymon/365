import { create } from "zustand"
import type { Session } from "@supabase/supabase-js"

type State = {
  session: Session | null
  // false until the first getSession() resolves; guards UI from flashing
  // the login screen to an already-authenticated user on reload.
  isReady: boolean
}

type Action = {
  setSession: (session: Session | null) => void
  setReady: (ready: boolean) => void
}

export const useAuthStore = create<State & Action>((set) => ({
  session: null,
  isReady: false,
  setSession: (session) => set({ session }),
  setReady: (isReady) => set({ isReady }),
}))
