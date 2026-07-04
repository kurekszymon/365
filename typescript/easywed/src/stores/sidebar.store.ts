import { create } from "zustand"

export type SidebarTab = "guests" | "tables" | "fixtures" | "ai_chat"

type State = {
  // Desktop-only unified rail (see `planner/Sidebar/SidebarRail`). Deliberately
  // separate from `mobilePanel.store` (which drives the mobile `MobileTabBar`)
  // and from `panel.store`'s `view` — which entity list the rail shows is
  // orthogonal to which edit form is currently open.
  expanded: boolean
  activeTab: SidebarTab
}

type Action = {
  // Expands the rail straight to a tab — the single entry point used by the
  // rail icons, header shortcuts and post-add flows.
  openTab: (tab: SidebarTab) => void
  setExpanded: (expanded: boolean) => void
  toggle: () => void
}

export const useSidebarStore = create<State & Action>((set) => ({
  expanded: false,
  activeTab: "guests",
  openTab: (tab) => set({ activeTab: tab, expanded: true }),
  setExpanded: (expanded) => set({ expanded }),
  toggle: () => set((state) => ({ expanded: !state.expanded })),
}))
