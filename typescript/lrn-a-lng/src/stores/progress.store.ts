import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CardStats, LevelProgress, ProgressState } from "@/lib/types"
import { recordAnswer } from "@/lib/review"

interface ProgressActions {
  answer: (cardId: string, correct: boolean) => void
  startLevel: (levelId: string, totalCards: number) => void
  completeLevel: (levelId: string) => void
  resetProgress: () => void
  hydrate: (state: ProgressState) => void
}

const initialState: ProgressState = {
  version: 1,
  cards: {},
  levels: {},
  lastActivity: new Date().toISOString(),
}

export const useProgressStore = create<ProgressState & ProgressActions>()(
  persist(
    (set) => ({
      ...initialState,
      answer: (cardId, correct) =>
        set((state) => ({
          cards: {
            ...state.cards,
            [cardId]: recordAnswer(state.cards[cardId], correct),
          },
          lastActivity: new Date().toISOString(),
        })),
      startLevel: (levelId, totalCards) =>
        set((state) => {
          const existing = state.levels[levelId]
          if (existing?.status === "completed") return state
          return {
            levels: {
              ...state.levels,
              [levelId]: {
                status: "in-progress" as const,
                cardsSeen: existing?.cardsSeen ?? 0,
                totalCards,
                completedAt: null,
              },
            },
          }
        }),
      completeLevel: (levelId) =>
        set((state) => {
          const existing = state.levels[levelId]
          return {
            levels: {
              ...state.levels,
              [levelId]: {
                status: "completed" as const,
                cardsSeen: existing?.totalCards ?? 0,
                totalCards: existing?.totalCards ?? 0,
                completedAt: new Date().toISOString(),
              },
            },
            lastActivity: new Date().toISOString(),
          }
        }),
      resetProgress: () => set({ ...initialState, lastActivity: new Date().toISOString() }),
      hydrate: (imported) => set({ ...imported }),
    }),
    {
      name: "lrn-progress",
      version: 1,
    },
  ),
)

export function getProgressSnapshot(): ProgressState {
  const { answer, startLevel, completeLevel, resetProgress, hydrate, ...state } =
    useProgressStore.getState()
  return state
}

export function getLevelStatus(
  levelId: string,
): LevelProgress | undefined {
  return useProgressStore.getState().levels[levelId]
}

export function getCardStats(cardId: string): CardStats | undefined {
  return useProgressStore.getState().cards[cardId]
}
