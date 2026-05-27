import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { BookOpen } from "lucide-react"
import { useReviewCardIds } from "@/hooks/useReviewCards"
import { useLevelList } from "@/hooks/useLevelList"
import { useProgressStore } from "@/stores/progress.store"
import { useSettingsStore } from "@/stores/settings.store"
import { fetchLevel } from "@/lib/content"
import { FlashCardDeck } from "@/components/FlashCardDeck"
import type { Card } from "@/lib/types"

export function ReviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const candidates = useReviewCardIds()
  const { index } = useLevelList()
  const answer = useProgressStore((s) => s.answer)
  const sourceLanguage = useSettingsStore((s) => s.sourceLanguage)

  const [reviewCards, setReviewCards] = useState<Card[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!index || candidates.length === 0) {
      setLoading(false)
      return
    }

    const cardIds = new Set(candidates.map((c) => c.cardId))
    const levelFiles = new Set<string>()
    for (const level of index.levels) {
      for (const cId of cardIds) {
        if (cId.startsWith(level.id.replace(/^ru-/, "ru-").substring(0, 5))) {
          levelFiles.add(level.file)
        }
      }
    }

    if (levelFiles.size === 0) {
      levelFiles.clear()
      for (const level of index.levels) {
        levelFiles.add(level.file)
      }
    }

    Promise.all([...levelFiles].map((f) => fetchLevel(f)))
      .then((levels) => {
        const allCards = levels.flatMap((l) => l.cards)
        const matched = candidates
          .map((c) => allCards.find((card) => card.id === c.cardId))
          .filter((c): c is Card => c != null)
        setReviewCards(matched)
      })
      .catch(() => setReviewCards([]))
      .finally(() => setLoading(false))
  }, [index, candidates])

  const handleComplete = useCallback(() => {
    navigate("/")
  }, [navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!reviewCards || reviewCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <BookOpen size={48} className="text-slate-600" />
        <h2 className="text-xl font-bold text-slate-300">{t("review.empty")}</h2>
        <p className="text-slate-500">{t("review.emptyDesc")}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full py-4">
      <h1 className="text-2xl font-bold mb-4">{t("review.title")}</h1>
      <p className="text-sm text-slate-500 mb-4">
        {t("review.cardsToReview", { count: reviewCards.length })}
      </p>
      <div className="flex-1 min-h-0">
        <FlashCardDeck
          cards={reviewCards}
          sourceLanguage={sourceLanguage}
          onAnswer={(cardId, correct) => answer(cardId, correct)}
          onComplete={handleComplete}
        />
      </div>
    </div>
  )
}
