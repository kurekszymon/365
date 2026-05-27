import { useMemo } from "react"
import { useProgressStore } from "@/stores/progress.store"
import { getReviewCandidates } from "@/lib/review"

export function useReviewCardIds() {
  const cards = useProgressStore((s) => s.cards)
  const levels = useProgressStore((s) => s.levels)

  return useMemo(() => {
    const progress = { version: 1 as const, cards, levels, lastActivity: "" }
    return getReviewCandidates(progress)
  }, [cards, levels])
}
