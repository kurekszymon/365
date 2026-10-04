import { create } from "zustand"
import type { PostHog } from "posthog-js"
import { denyConsent, grantConsent, readConsent } from "@/lib/analytics/consent"

type State = {
  /**
   * `unknown` until PostHog has initialized - on the server, in the
   * prerendered HTML, on the first client render, and for good when no
   * project token is configured. The banner renders nothing in that state,
   * which is also what keeps it out of the prerendered marketing pages and
   * hydration-safe.
   */
  status: ReturnType<PostHog["get_explicit_consent_status"]> | "unknown"
  /** Re-opened from "Cookie settings" after an answer was already given. */
  settingsOpen: boolean
}

type Action = {
  /** Re-reads the stored answer. Wired to PostHog's `loaded` callback. */
  sync: () => void
  accept: () => void
  reject: () => void
  openSettings: () => void
  closeSettings: () => void
}

export const useConsentStore = create<State & Action>((set) => ({
  status: "unknown",
  settingsOpen: false,

  sync: () => set({ status: readConsent() ?? "unknown" }),
  accept: () => {
    if (grantConsent()) set({ status: "granted", settingsOpen: false })
  },
  reject: () => {
    if (denyConsent()) set({ status: "denied", settingsOpen: false })
  },
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
}))
