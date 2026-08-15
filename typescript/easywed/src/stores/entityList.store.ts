import { create } from "zustand"

// The entity-list surface: the desktop sidebar rail's content column and the
// mobile bottom-bar drawer are the same logical panel rendered per platform,
// so they share this one store (they never coexist). `ai_chat` is desktop-only
// here - the mobile bar shows an assistant button too, but it opens
// `panel.store`'s `ai_chat` view (the bottom drawer) rather than the list
// panel; that duplication is deliberate, the two surfaces have different
// chrome.
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
  // Nonce, not a boolean: bumping it re-fires the guest list's seat-button
  // highlight even when the panel is already open on the guests tab, where a
  // plain `openTab` would be a no-op with nothing on screen to show for the
  // click. 0 means no hint pending. GuestListContent clears it on a timer.
  seatHint: number
  // Which entity add-dialog the list panel is showing, if any. Lifted out of
  // EntityListContent's local state so callers other than the panel's own Add
  // button can raise it - onboarding's "arrange the tables" step means "add a
  // table now", not "here is a list, go find the button". Scoped by kind so
  // switching tabs mid-flow leaves the other tab's dialog shut.
  addDialog: "tables" | "fixtures" | null
}

type Action = {
  // Opens the panel straight on a tab - the single entry point used by the
  // rail icons, the mobile bar, header shortcuts and post-add flows.
  openTab: (tab: EntityListTab) => void
  // Deliberately independent of openTab rather than a combined "openAdd":
  // opening the panel and raising the dialog are two decisions, and callers
  // want them in different combinations - the panel's own Add button is
  // already in the panel, onboarding wants both.
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
