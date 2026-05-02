import { create } from "zustand"
import { DEFAULT_DESIGN, makeSeparatorId, isSeparatorId } from "@/lib/invitation/templates"
import {
  GUEST_LIST_MAX_SIZE,
  sanitizeGuestName,
} from "@/lib/invitation/guestNames"

export type InvitationTemplate = "classic" | "modern" | "romantic"
export type InvitationSide = "front" | "back"
export type SeparatorStyle = "line" | "heart" | "flower" | "star" | "diamond"
export type SeparatorConfig = {
  widthPct?: number    // 20–100, defaults to 100
  thicknessPx?: number // 0.5 | 1 | 2, defaults to 1
}
export type FieldFormat = {
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

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
  fieldFonts: Partial<Record<keyof InvitationTexts, string>>
  fieldFormats: Partial<Record<keyof InvitationTexts, FieldFormat>>
  separatorStyles: Record<string, SeparatorStyle>
  separatorConfigs: Record<string, SeparatorConfig>
  texts: InvitationTexts
  fieldSides: Record<string, InvitationSide>
  fieldOrder: Array<string>
  fieldPositions: Partial<Record<string, { x: number; y: number }>>
  quantity: number
  guestNames: Array<string>
}

const HISTORY_LIMIT = 50

type HistoryState = {
  past: InvitationDesign[]
  future: InvitationDesign[]
}

type State = {
  design: InvitationDesign
  history: HistoryState
}

type Action = {
  updateDesign: (patch: Partial<Omit<InvitationDesign, "texts">>) => void
  updateTexts: (patch: Partial<InvitationTexts>) => void
  setDesign: (design: InvitationDesign) => void
  addGuestName: (name: string) => void
  removeGuestName: (index: number) => void
  moveFieldToSide: (field: string, side: InvitationSide) => void
  reorderFields: (newOrder: Array<string>) => void
  setFieldSideAndOrder: (
    field: string,
    side: InvitationSide,
    newOrder: Array<string>
  ) => void
  setFieldPosition: (key: string, pos: { x: number; y: number }) => void
  addSeparator: (side: InvitationSide) => void
  addSeparatorNear: (nearId: string, position: "before" | "after") => void
  addSeparatorAtPos: (side: InvitationSide, pos: { x: number; y: number }) => void
  removeSeparator: (sepId: string) => void
  setSeparatorStyle: (sepId: string, style: SeparatorStyle) => void
  setSeparatorConfig: (sepId: string, config: Partial<SeparatorConfig>) => void
  setFieldFont: (key: keyof InvitationTexts, fontId: string | null) => void
  setFieldFormat: (key: keyof InvitationTexts, format: Partial<FieldFormat>) => void
  undo: () => void
  redo: () => void
  reset: () => void
}

function withHistory(
  current: State,
  produce: () => Partial<State>
): Partial<State> {
  const newPast = [current.design, ...current.history.past].slice(
    0,
    HISTORY_LIMIT
  )
  return { ...produce(), history: { past: newPast, future: [] } }
}

export const useInvitationStore = create<State & Action>((set) => ({
  design: DEFAULT_DESIGN,
  history: { past: [], future: [] },

  updateDesign: (patch) =>
    set((s) =>
      withHistory(s, () => ({
        design: { ...s.design, ...patch },
      }))
    ),

  updateTexts: (patch) =>
    set((s) =>
      withHistory(s, () => ({
        design: { ...s.design, texts: { ...s.design.texts, ...patch } },
      }))
    ),

  setDesign: (design) => set({ design, history: { past: [], future: [] } }),

  addGuestName: (name) =>
    set((s) => {
      const sanitized = sanitizeGuestName(name)
      if (!sanitized || s.design.guestNames.length >= GUEST_LIST_MAX_SIZE)
        return s
      return {
        design: {
          ...s.design,
          guestNames: [...s.design.guestNames, sanitized],
        },
      }
    }),

  removeGuestName: (index) =>
    set((s) => ({
      design: {
        ...s.design,
        guestNames: s.design.guestNames.filter((_, i) => i !== index),
      },
    })),

  moveFieldToSide: (field, side) =>
    set((s) =>
      withHistory(s, () => ({
        design: {
          ...s.design,
          fieldSides: { ...s.design.fieldSides, [field]: side },
        },
      }))
    ),

  reorderFields: (newOrder) =>
    set((s) =>
      withHistory(s, () => ({
        design: { ...s.design, fieldOrder: newOrder },
      }))
    ),

  setFieldSideAndOrder: (field, side, newOrder) =>
    set((s) =>
      withHistory(s, () => ({
        design: {
          ...s.design,
          fieldSides: { ...s.design.fieldSides, [field]: side },
          fieldOrder: newOrder,
        },
      }))
    ),

  setFieldPosition: (key, pos) =>
    set((s) =>
      withHistory(s, () => ({
        design: {
          ...s.design,
          fieldPositions: { ...s.design.fieldPositions, [key]: pos },
        },
      }))
    ),

  addSeparator: (side) =>
    set((s) => {
      const id = makeSeparatorId()
      return withHistory(s, () => ({
        design: {
          ...s.design,
          fieldOrder: [...s.design.fieldOrder, id],
          fieldSides: { ...s.design.fieldSides, [id]: side },
        },
      }))
    }),

  addSeparatorNear: (nearId, position) =>
    set((s) => {
      const side = s.design.fieldSides[nearId]
      if (!side) return s
      const id = makeSeparatorId()
      const idx = s.design.fieldOrder.indexOf(nearId)
      if (idx === -1) return s
      const insertAt = position === "before" ? idx : idx + 1
      const newOrder = [
        ...s.design.fieldOrder.slice(0, insertAt),
        id,
        ...s.design.fieldOrder.slice(insertAt),
      ]
      return withHistory(s, () => ({
        design: {
          ...s.design,
          fieldOrder: newOrder,
          fieldSides: { ...s.design.fieldSides, [id]: side },
        },
      }))
    }),

  addSeparatorAtPos: (side, pos) =>
    set((s) => {
      const id = makeSeparatorId()
      return withHistory(s, () => ({
        design: {
          ...s.design,
          fieldOrder: [...s.design.fieldOrder, id],
          fieldSides: { ...s.design.fieldSides, [id]: side },
          fieldPositions: { ...s.design.fieldPositions, [id]: pos },
        },
      }))
    }),

  removeSeparator: (sepId) =>
    set((s) => {
      if (!isSeparatorId(sepId)) return s
      return withHistory(s, () => {
        const { [sepId]: _s, ...restSides } = s.design.fieldSides
        const { [sepId]: _p, ...restPositions } = s.design.fieldPositions
        const { [sepId]: _st, ...restStyles } = s.design.separatorStyles
        const { [sepId]: _sc, ...restConfigs } = s.design.separatorConfigs
        return {
          design: {
            ...s.design,
            fieldOrder: s.design.fieldOrder.filter((id) => id !== sepId),
            fieldSides: restSides,
            fieldPositions: restPositions,
            separatorStyles: restStyles,
            separatorConfigs: restConfigs,
          },
        }
      })
    }),

  setSeparatorStyle: (sepId, style) =>
    set((s) => {
      if (!isSeparatorId(sepId)) return s
      return withHistory(s, () => ({
        design: {
          ...s.design,
          separatorStyles: { ...s.design.separatorStyles, [sepId]: style },
        },
      }))
    }),

  setSeparatorConfig: (sepId, config) =>
    set((s) => {
      if (!isSeparatorId(sepId)) return s
      return withHistory(s, () => ({
        design: {
          ...s.design,
          separatorConfigs: {
            ...s.design.separatorConfigs,
            [sepId]: { ...(s.design.separatorConfigs[sepId] ?? {}), ...config },
          },
        },
      }))
    }),

  setFieldFont: (key, fontId) =>
    set((s) =>
      withHistory(s, () => {
        if (fontId === null) {
          const { [key]: _removed, ...restFonts } = s.design.fieldFonts
          return { design: { ...s.design, fieldFonts: restFonts } }
        }
        return {
          design: {
            ...s.design,
            fieldFonts: { ...s.design.fieldFonts, [key]: fontId },
          },
        }
      })
    ),

  setFieldFormat: (key, format) =>
    set((s) =>
      withHistory(s, () => {
        const existing = s.design.fieldFormats[key] ?? {}
        const merged = { ...existing, ...format }
        // Remove keys that are now undefined (clean up)
        const cleaned = Object.fromEntries(
          Object.entries(merged).filter(([, v]) => v !== undefined)
        ) as FieldFormat
        const { [key]: _removed, ...restFormats } = s.design.fieldFormats
        const newFormats =
          Object.keys(cleaned).length === 0
            ? restFormats
            : { ...s.design.fieldFormats, [key]: cleaned }
        return { design: { ...s.design, fieldFormats: newFormats } }
      })
    ),

  undo: () =>
    set((s) => {
      if (s.history.past.length === 0) return s
      const [prev, ...rest] = s.history.past
      return {
        design: prev,
        history: { past: rest, future: [s.design, ...s.history.future] },
      }
    }),

  redo: () =>
    set((s) => {
      if (s.history.future.length === 0) return s
      const [next, ...rest] = s.history.future
      return {
        design: next,
        history: { past: [s.design, ...s.history.past], future: rest },
      }
    }),

  reset: () => set({ design: DEFAULT_DESIGN, history: { past: [], future: [] } }),
}))
