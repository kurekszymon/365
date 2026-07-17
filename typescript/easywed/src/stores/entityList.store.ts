import { create } from "zustand"

// The entity-list surface: the desktop sidebar rail's content column and the
// mobile bottom-bar drawer are the same logical panel rendered per platform,
// so they share this one store (they never coexist). `ai_chat` is desktop-only
// - the mobile bar doesn't offer it and reaches the assistant through
// `panel.store`'s `ai_chat` view (the header sparkles button) instead; that
// duplication is deliberate, the two surfaces have different chrome.
export type EntityListTab =
  | "guests"
  | "tables"
  | "fixtures"
  | "reminders"
  | "ai_chat"

// The subset the mobile bottom bar offers.
export type MobileListTab = Exclude<EntityListTab, "ai_chat">

type State = {
  isOpen: boolean
  // Retained while closed (not nulled) so the collapse animation keeps showing
  // the last tab's content as it slides out, and reopening returns to it.
  activeTab: EntityListTab
}

type Action = {
  // Opens the panel straight on a tab - the single entry point used by the
  // rail icons, the mobile bar, header shortcuts and post-add flows.
  openTab: (tab: EntityListTab) => void
  close: () => void
  toggle: () => void
}

export const useEntityListStore = create<State & Action>((set) => ({
  isOpen: false,
  activeTab: "guests",
  openTab: (tab) => set({ activeTab: tab, isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}))
