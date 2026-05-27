import { useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useLevelList } from "@/hooks/useLevelList"
import { useLevel } from "@/hooks/useLevel"
import { useProgressStore } from "@/stores/progress.store"
import { useSettingsStore } from "@/stores/settings.store"
import { FlashCardDeck } from "@/components/FlashCardDeck"

export function LevelPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { index } = useLevelList()
  const meta = index?.levels.find((l) => l.id === id)
  const { level, loading } = useLevel(meta?.file)
  const answer = useProgressStore((s) => s.answer)
  const startLevel = useProgressStore((s) => s.startLevel)
  const completeLevel = useProgressStore((s) => s.completeLevel)
  const sourceLanguage = useSettingsStore((s) => s.sourceLanguage)

  useEffect(() => {
    if (meta && level) {
      startLevel(meta.id, level.cards.length)
    }
  }, [meta, level, startLevel])

  if (loading || !level) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full py-2">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-3 self-start"
      >
        <ArrowLeft size={16} />
        Back
      </button>
      <div className="flex-1 min-h-0">
        <FlashCardDeck
          cards={level.cards}
          sourceLanguage={sourceLanguage}
          onAnswer={(cardId, correct) => answer(cardId, correct)}
          onComplete={(results) => {
            if (id) completeLevel(id)
            navigate(`/level/${id}/summary`, { state: { results } })
          }}
        />
      </div>
    </div>
  )
}
