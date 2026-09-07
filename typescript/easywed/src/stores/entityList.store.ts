import { create } from "zustand"

// The entity-list surface: the desktop rail's content column and the mobile
// bottom-bar drawer are the same logical panel per platform, so they share this
// store (they never coexist). `ai_chat` is desktop-only here - the mobile bar's
// assistant button opens `panel.store`'s `ai_chat` view instead, deliberately,
// since the two surfaces have different chrome.
//
// `menu` exists only for a wedding linked to a venue. That filtering lives in
// `tabsFor` (SidebarRail) and `visibleTabs` (MobileTabBar), not here - this type
// is the vocabulary, not the policy.
export type EntityListTab =
  | "guests"
  | "tables"
  | "fixtures"
  | "reminders"
  | "menu"
  | "ai_chat"

// The subset the mobile bottom bar offers.
export type MobileListTab = Exclude<EntityListTab, "ai_chat">

type State = {
  isOpen: boolean
  // Retained while closed (not nulled) so the collapse animation keeps showing
  // the last tab's content as it slides out, and reopening returns to it.
  activeTab: EntityListTab
  // Nonce, not a boolean: bumping it re-fires the guest list's seat-button
  // highlight even when the panel is already open on the guests tab, where a
  // plain `openTab` would be a no-op with nothing on screen to show for the
  // click. 0 means no hint pending. GuestListContent clears it on a timer.
  seatHint: number
  // Which entity add-dialog the list panel is showing, if any. Lifted out of
  // EntityListContent's local state so callers other than the panel's own Add
  // button can raise it - onboarding's "arrange the tables" step means "add a
  // table now". Scoped by kind, so switching tabs leaves the other's dialog shut.
  addDialog: "tables" | "fixtures" | null
}

type Action = {
  // Opens the panel straight on a tab - the single entry point used by the
  // rail icons, the mobile bar, header shortcuts and post-add flows.
  openTab: (tab: EntityListTab) => void
  // Independent of openTab rather than a combined "openAdd": opening the panel
  // and raising the dialog are two decisions callers want in different
  // combinations - the panel's own Add button is already there, onboarding
  // wants both.
  setAddDialog: (kind: "tables" | "fixtures" | null) => void
  // openTab("guests") plus the highlight: seating is per-guest, so landing on
  // the list is only half an answer to "seat everyone" - this points at the
  // control that actually does it.
  hintSeating: () => void
  clearSeatHint: () => void
  close: () => void
  toggle: () => void
}

export const useEntityListStore = create<State & Action>((set) => ({
  isOpen: false,
  activeTab: "guests",
  seatHint: 0,
  addDialog: null,
  openTab: (tab) => set({ activeTab: tab, isOpen: true }),
  setAddDialog: (kind) => set({ addDialog: kind }),
  hintSeating: () =>
    set((state) => ({
      activeTab: "guests",
      isOpen: true,
      seatHint: state.seatHint + 1,
    })),
  clearSeatHint: () => set({ seatHint: 0 }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}))
