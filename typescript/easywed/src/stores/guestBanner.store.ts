import { create } from "zustand"
import { persist } from "zustand/middleware"

export const GUEST_BANNER_STORAGE_KEY = "easywed.guestBannerDismissed"

type State = {
  dismissed: boolean
}

type Action = {
  dismiss: () => void
}

// Plain localStorage, like changelogSeen.store: a per-device flag with no plan
// content in it. The guest plan itself lives on this device too, so a
// dismissal that's per device matches what the banner is warning about.
export const useGuestBannerStore = create<State & Action>()(
  persist(
    (set) => ({
      dismissed: false,
      dismiss: () => set({ dismissed: true }),
    }),
    { name: GUEST_BANNER_STORAGE_KEY }
  )
)
