import type { CardStats, ProgressState } from "./types"
import { daysBetween } from "./utils"

interface ReviewCandidate {
  cardId: string
  priority: number
}

const MASTERED_STREAK = 3
const MAX_REVIEW_CARDS = 20

function defaultStats(): CardStats {
  return {
    seen: 0,
    correct: 0,
    streak: 0,
    lastSeen: new Date().toISOString(),
    lastCorrect: null,
  }
}

export function getReviewCandidates(
  progress: ProgressState,
  now = new Date(),
): ReviewCandidate[] {
  const candidates: ReviewCandidate[] = []

  for (const [cardId, stats] of Object.entries(progress.cards)) {
    if (stats.seen === 0) continue

    const daysSinceLastSeen = daysBetween(new Date(stats.lastSeen), now)
    const accuracy = stats.correct / stats.seen
    const expectedInterval = Math.pow(2, stats.streak)

    let priority = stats.streak * 2 + accuracy * 3

    if (daysSinceLastSeen > expectedInterval) {
      priority -= daysSinceLastSeen - expectedInterval
    }

    if (stats.streak < MASTERED_STREAK || daysSinceLastSeen > expectedInterval) {
      candidates.push({ cardId, priority })
    }
  }

  candidates.sort((a, b) => a.priority - b.priority)
  return candidates.slice(0, MAX_REVIEW_CARDS)
}

export function recordAnswer(
  stats: CardStats | undefined,
  correct: boolean,
): CardStats {
  const s = stats ? { ...stats } : defaultStats()
  s.seen += 1
  s.lastSeen = new Date().toISOString()
  if (correct) {
    s.correct += 1
    s.streak += 1
    s.lastCorrect = new Date().toISOString()
  } else {
    s.streak = 0
  }
  return s
}
