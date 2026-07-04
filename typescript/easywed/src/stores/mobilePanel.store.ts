import { create } from "zustand"

// Which entity list the mobile bottom bar is showing in its drawer, or `null`
// when only the collapsed bar is visible.
export type MobileListTab = "guests" | "tables" | "fixtures"

type State = {
  // Mobile-only (see `planner/Sidebar/MobileTabBar`). The desktop counterpart
  // is `sidebar.store`; kept separate because the two surfaces have different
  // tab sets and open/close semantics.
  activeTab: MobileListTab | null
}

type Action = {
  open: (tab: MobileListTab) => void
  close: () => void
}

export const useMobilePanelStore = create<State & Action>((set) => ({
  activeTab: null,
  open: (tab) => set({ activeTab: tab }),
  close: () => set({ activeTab: null }),
}))
