import { create } from "zustand"
import { DEFAULT_DESIGN } from "@/lib/invitation/templates"
import { GUEST_LIST_MAX_SIZE, sanitizeGuestName } from "@/lib/invitation/guestNames"

export type InvitationTemplate = "classic" | "modern" | "romantic"

export type InvitationColorScheme =
  | "cream-gold"
  | "sage"
  | "navy"
  | "pure-white"
  | "slate"
  | "midnight"
  | "blush"
  | "lavender"
  | "dusty-rose"

export interface InvitationTexts {
  headline: string
  coupleNames: string
  date: string
  time: string
  venue: string
  venueAddress: string
  rsvpEmail: string
  rsvpDeadline: string
  guestSalutation: string
  footer: string
}

export interface InvitationDesign {
  template: InvitationTemplate
  colorScheme: InvitationColorScheme
  fontId: string
  texts: InvitationTexts
  quantity: number
  guestNames: Array<string>
}

type State = {
  design: InvitationDesign
}

type Action = {
  updateDesign: (patch: Partial<Omit<InvitationDesign, "texts">>) => void
  updateTexts: (patch: Partial<InvitationTexts>) => void
  setDesign: (design: InvitationDesign) => void
  addGuestName: (name: string) => void
  removeGuestName: (index: number) => void
  reset: () => void
}

export const useInvitationStore = create<State & Action>((set) => ({
  design: DEFAULT_DESIGN,

  updateDesign: (patch) => set((s) => ({ design: { ...s.design, ...patch } })),

  updateTexts: (patch) =>
    set((s) => ({
      design: { ...s.design, texts: { ...s.design.texts, ...patch } },
    })),

  setDesign: (design) => set({ design }),

  addGuestName: (name) =>
    set((s) => {
      const sanitized = sanitizeGuestName(name)
      if (!sanitized || s.design.guestNames.length >= GUEST_LIST_MAX_SIZE) return s
      return {
        design: { ...s.design, guestNames: [...s.design.guestNames, sanitized] },
      }
    }),

  removeGuestName: (index) =>
    set((s) => ({
      design: {
        ...s.design,
        guestNames: s.design.guestNames.filter((_, i) => i !== index),
      },
    })),

  reset: () => set({ design: DEFAULT_DESIGN }),
}))
