import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  Design,
  EditorUIState,
  Field,
  FieldGeometry,
  PartId,
  Side,
} from '#/lib/invitation/types'
import {
  DEFAULT_DESIGN,
  PART_DIMENSIONS,
  clampGeomToBounds,
} from '#/lib/invitation/defaults'
import { getPreset } from '#/lib/invitation/presets'
import {
  sanitizeGuestName,
  sanitizeGuestNames,
  GUEST_LIST_MAX_SIZE,
} from '#/lib/invitation/guestNames'
import { fontScaleFromResize } from '#/lib/invitation/geometry'

const HISTORY_LIMIT = 50
const GUESTS_STORAGE_KEY = 'designver:guests'

// --- History ---

type HistoryState = { past: Design[]; future: Design[] }

function withHistory(
  currentDesign: Design,
  history: HistoryState,
  next: Design,
): { design: Design; history: HistoryState } {
  return {
    design: next,
    history: {
      past: [currentDesign, ...history.past].slice(0, HISTORY_LIMIT),
      future: [],
    },
  }
}

// --- State shape ---

interface DesignSlice {
  design: Design
  history: HistoryState
  guests: string[] // managed separately from Design.guests
  includeGuestsInHash: boolean
}

interface UISlice extends EditorUIState {}

interface Actions {
  // Design — history-tracked
  setDesign: (design: Design) => void // replaces + clears history (hash hydration)
  loadPreset: (presetId: string) => void
  addField: (partId: PartId, side: Side, field: Field) => void
  removeField: (partId: PartId, fieldId: string) => void
  duplicateField: (partId: PartId, side: Side, fieldId: string) => void
  bringToFront: (partId: PartId, side: Side, fieldId: string) => void
  sendToBack: (partId: PartId, side: Side, fieldId: string) => void
  updateField: (partId: PartId, fieldId: string, patch: Partial<Field>) => void
  moveField: (partId: PartId, fieldId: string, dx: number, dy: number) => void
  resizeField: (
    partId: PartId,
    fieldId: string,
    newGeom: FieldGeometry,
    isCorner?: boolean,
  ) => void
  setColorScheme: (scheme: string) => void
  setDefaultFont: (fontId: string) => void
  setPartColorScheme: (
    partId: 'extra' | 'envelope',
    schemeId: string | null,
  ) => void
  togglePartEnabled: (partId: 'extra' | 'envelope') => void
  undo: () => void
  redo: () => void

  // Guests (not history-tracked, localStorage-persisted)
  setGuests: (names: string[]) => void
  addGuest: (name: string) => void
  removeGuest: (index: number) => void
  setIncludeGuestsInHash: (value: boolean) => void

  // UI (not history-tracked)
  setActivePart: (partId: PartId) => void
  setActiveSide: (side: Side) => void
  setSelected: (id: string | null) => void
  setEditing: (id: string | null) => void
  toggleGrid: () => void
  setGridSize: (size: number) => void
  setZoom: (zoom: number) => void
  toggleGuestSidebar: () => void
  setGuestSidebarOpen: (open: boolean) => void
}

type StoreState = DesignSlice & UISlice & Actions

function loadStoredGuests(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(GUESTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? sanitizeGuestNames(parsed) : []
  } catch {
    return []
  }
}

function saveGuestsToStorage(guests: string[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(GUESTS_STORAGE_KEY, JSON.stringify(guests))
  } catch {}
}

function updateFieldInPart(
  design: Design,
  partId: PartId,
  side: Side,
  fieldId: string,
  updater: (field: Field) => Field,
): Design {
  return {
    ...design,
    parts: {
      ...design.parts,
      [partId]: {
        ...design.parts[partId],
        [side]: design.parts[partId][side].map((f) =>
          f.id === fieldId ? updater(f) : f,
        ),
      },
    },
  }
}

function generateId(): string {
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export const useDesignStore = create<StoreState>()(
  subscribeWithSelector((set, get) => ({
    // --- Initial state ---
    design: DEFAULT_DESIGN,
    history: { past: [], future: [] },
    guests: loadStoredGuests(),
    includeGuestsInHash: false,

    // UI defaults
    activePart: 'invitation',
    activeSide: 'front',
    selectedId: null,
    editingId: null,
    gridEnabled: false,
    gridSize: 16,
    zoom: 1,
    guestSidebarOpen: false,

    // --- Design actions ---

    setDesign: (design) => set({ design, history: { past: [], future: [] } }),

    loadPreset: (presetId) => {
      const preset = getPreset(presetId)
      if (!preset) return
      set((s) => ({
        ...withHistory(s.design, s.history, preset.design),
        selectedId: null,
        editingId: null,
      }))
    },

    addField: (partId, side, fieldWithoutId) => {
      const field = { ...fieldWithoutId, id: generateId() }
      set((s) => ({
        ...withHistory(s.design, s.history, {
          ...s.design,
          parts: {
            ...s.design.parts,
            [partId]: {
              ...s.design.parts[partId],
              [side]: [...s.design.parts[partId][side], field],
            },
          },
        }),
        selectedId: field.id,
      }))
    },

    removeField: (partId, fieldId) =>
      set((s) => {
        const next: Design = {
          ...s.design,
          parts: {
            ...s.design.parts,
            [partId]: {
              front: s.design.parts[partId].front.filter(
                (f) => f.id !== fieldId,
              ),
              back: s.design.parts[partId].back.filter((f) => f.id !== fieldId),
            },
          },
        }
        return {
          ...withHistory(s.design, s.history, next),
          selectedId: s.selectedId === fieldId ? null : s.selectedId,
          editingId: s.editingId === fieldId ? null : s.editingId,
        }
      }),

    duplicateField: (partId, side, fieldId) =>
      set((s) => {
        const fields = s.design.parts[partId][side]
        const original = fields.find((f) => f.id === fieldId)
        if (!original) return s
        const clone = {
          ...original,
          id: generateId(),
          geom: {
            ...original.geom,
            x: original.geom.x + 16,
            y: original.geom.y + 16,
          },
        }
        const idx = fields.indexOf(original)
        const newFields = [
          ...fields.slice(0, idx + 1),
          clone,
          ...fields.slice(idx + 1),
        ]
        const next: Design = {
          ...s.design,
          parts: {
            ...s.design.parts,
            [partId]: { ...s.design.parts[partId], [side]: newFields },
          },
        }
        return {
          ...withHistory(s.design, s.history, next),
          selectedId: clone.id,
        }
      }),

    bringToFront: (partId, side, fieldId) =>
      set((s) => {
        if (side !== 'back') return s
        const field = s.design.parts[partId].back.find((f) => f.id === fieldId)
        if (!field) return s
        const next: Design = {
          ...s.design,
          parts: {
            ...s.design.parts,
            [partId]: {
              front: [...s.design.parts[partId].front, field],
              back: s.design.parts[partId].back.filter((f) => f.id !== fieldId),
            },
          },
        }
        return {
          ...withHistory(s.design, s.history, next),
          activeSide: 'front' as const,
          selectedId: fieldId,
        }
      }),

    sendToBack: (partId, side, fieldId) =>
      set((s) => {
        if (side !== 'front') return s
        const field = s.design.parts[partId].front.find((f) => f.id === fieldId)
        if (!field) return s
        const next: Design = {
          ...s.design,
          parts: {
            ...s.design.parts,
            [partId]: {
              front: s.design.parts[partId].front.filter(
                (f) => f.id !== fieldId,
              ),
              back: [...s.design.parts[partId].back, field],
            },
          },
        }
        return {
          ...withHistory(s.design, s.history, next),
          activeSide: 'back' as const,
          selectedId: fieldId,
        }
      }),

    updateField: (partId, fieldId, patch) => {
      const state = get()
      // Strip identity fields from the patch: mutating `type` or `id` would
      // produce a Field whose shape doesn't match its discriminated-union type,
      // silently breaking FieldRenderer and hash serialization.
      const {
        type: _type,
        id: _id,
        ...safePatch
      } = patch as Record<string, unknown>
      // Find which side contains this field
      const sides: Side[] = ['front', 'back']
      for (const side of sides) {
        if (state.design.parts[partId][side].some((f) => f.id === fieldId)) {
          set((s) => ({
            ...withHistory(
              s.design,
              s.history,
              updateFieldInPart(s.design, partId, side, fieldId, (f) => ({
                ...f,
                ...safePatch,
              })),
            ),
          }))
          return
        }
      }
    },

    moveField: (partId, fieldId, dx, dy) => {
      const state = get()
      const dims = PART_DIMENSIONS[partId]
      const sides: Side[] = ['front', 'back']
      for (const side of sides) {
        const field = state.design.parts[partId][side].find(
          (f) => f.id === fieldId,
        )
        if (field) {
          const newGeom = clampGeomToBounds(
            { ...field.geom, x: field.geom.x + dx, y: field.geom.y + dy },
            dims,
          )
          set((s) => ({
            ...withHistory(
              s.design,
              s.history,
              updateFieldInPart(s.design, partId, side, fieldId, (f) => ({
                ...f,
                geom: newGeom,
              })),
            ),
          }))
          return
        }
      }
    },

    resizeField: (partId, fieldId, newGeom, isCorner = false) => {
      const state = get()
      const dims = PART_DIMENSIONS[partId]
      const sides: Side[] = ['front', 'back']
      for (const side of sides) {
        const field = state.design.parts[partId][side].find(
          (f) => f.id === fieldId,
        )
        if (field) {
          const clamped = clampGeomToBounds(newGeom, dims)
          set((s) => ({
            ...withHistory(
              s.design,
              s.history,
              updateFieldInPart(s.design, partId, side, fieldId, (f) => {
                const updated = { ...f, geom: clamped }
                if (isCorner && f.type === 'text' && f.format?.fontSize) {
                  const scale = fontScaleFromResize(f.geom, clamped)
                  const newSize = Math.min(
                    120,
                    Math.max(6, Math.round(f.format.fontSize * scale)),
                  )
                  ;(updated as typeof f).format = {
                    ...f.format,
                    fontSize: newSize,
                  }
                }
                return updated
              }),
            ),
          }))
          return
        }
      }
    },

    setColorScheme: (scheme) =>
      set((s) => ({
        ...withHistory(s.design, s.history, {
          ...s.design,
          colorScheme: scheme,
        }),
      })),

    setDefaultFont: (fontId) =>
      set((s) => ({
        ...withHistory(s.design, s.history, {
          ...s.design,
          defaultFontId: fontId,
        }),
      })),

    setPartColorScheme: (partId, schemeId) =>
      set((s) => {
        const next = { ...s.design.partColorSchemes }
        if (schemeId === null) delete next[partId]
        else next[partId] = schemeId
        return { design: { ...s.design, partColorSchemes: next } }
      }),

    togglePartEnabled: (partId) =>
      set((s) => {
        const current = s.design.enabledParts
        const next = { ...current, [partId]: !current[partId] }
        const uiPatch =
          !next[partId] && s.activePart === partId
            ? { activePart: 'invitation' as const }
            : {}
        return {
          ...withHistory(s.design, s.history, {
            ...s.design,
            enabledParts: next,
          }),
          ...uiPatch,
        }
      }),

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

    // --- Guest actions ---

    setGuests: (names) => {
      const sanitized = sanitizeGuestNames(names)
      saveGuestsToStorage(sanitized)
      set({ guests: sanitized })
    },

    addGuest: (name) => {
      const sanitized = sanitizeGuestName(name)
      if (!sanitized) return
      set((s) => {
        if (s.guests.length >= GUEST_LIST_MAX_SIZE) return s
        const next = [...s.guests, sanitized]
        saveGuestsToStorage(next)
        return { guests: next }
      })
    },

    removeGuest: (index) =>
      set((s) => {
        const next = s.guests.filter((_, i) => i !== index)
        saveGuestsToStorage(next)
        return { guests: next }
      }),

    setIncludeGuestsInHash: (value) => set({ includeGuestsInHash: value }),

    // --- UI actions ---

    setActivePart: (partId) =>
      set({ activePart: partId, selectedId: null, editingId: null }),
    setActiveSide: (side) =>
      set({ activeSide: side, selectedId: null, editingId: null }),
    setSelected: (id) => set({ selectedId: id, editingId: null }),
    setEditing: (id) => set({ editingId: id }),
    toggleGrid: () => set((s) => ({ gridEnabled: !s.gridEnabled })),
    setGridSize: (size) => set({ gridSize: size }),
    setZoom: (zoom) => set({ zoom }),
    toggleGuestSidebar: () =>
      set((s) => ({ guestSidebarOpen: !s.guestSidebarOpen })),
    setGuestSidebarOpen: (open) => set({ guestSidebarOpen: open }),
  })),
)

// Convenience selectors
export const selectCurrentFields = (s: StoreState) =>
  s.design.parts[s.activePart][s.activeSide]

export const selectSelectedField = (s: StoreState) => {
  if (!s.selectedId) return null
  for (const side of ['front', 'back'] as Side[]) {
    const field = s.design.parts[s.activePart][side].find(
      (f) => f.id === s.selectedId,
    )
    if (field) return field
  }
  return null
}

export const selectDesignForHash = (s: StoreState): Design => ({
  ...s.design,
  ...(s.includeGuestsInHash && s.guests.length > 0 ? { guests: s.guests } : {}),
})
