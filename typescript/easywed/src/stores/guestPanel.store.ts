import { create } from "zustand"

type State = {
  // Whether the mobile guest peek bar is showing its full list rather than
  // just its collapsed summary. Mobile-only since the unified desktop rail
  // took over (see `sidebar.store`). Deliberately separate from
  // `panel.store`'s `view` — guest-panel visibility is orthogonal to which
  // table/fixture/AI panel view is currently open.
  expanded: boolean
}

type Action = {
  setExpanded: (expanded: boolean) => void
  toggle: () => void
}

export const useGuestPanelStore = create<State & Action>((set) => ({
  expanded: false,
  setExpanded: (expanded) => set({ expanded }),
  toggle: () => set((state) => ({ expanded: !state.expanded })),
}))
