import { create } from "zustand"
import { persist } from "zustand/middleware"

export const ONBOARDING_STORAGE_KEY = "easywed.onboarding"

type State = {
  // Wedding ids whose first-run checklist is finished with. Two ways in: the
  // user hits the X, or the checklist retires itself on mount because the plan
  // was already complete when it loaded (see OnboardingChecklist) - an
  // existing wedding must not greet its owner with a "plan ready" card.
  //
  // Keyed by wedding rather than globally so a second wedding, or a guest plan
  // adopted into the account, still gets its own run through the steps.
  dismissed: Record<string, boolean | undefined>
}

type Action = {
  dismiss: (weddingId: string) => void
}

// Plain localStorage, not the local-gated storage the planner stores use: this
// holds no plan content, only a per-device "done with this" flag, so there is
// nothing for a guest snapshot to leak into.
export const useOnboardingStore = create<State & Action>()(
  persist(
    (set) => ({
      dismissed: {},
      dismiss: (weddingId) =>
        set((state) => ({
          dismissed: { ...state.dismissed, [weddingId]: true },
        })),
    }),
    { name: ONBOARDING_STORAGE_KEY }
  )
)
