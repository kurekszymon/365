import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Check, X, ChevronDown, ChevronUp } from "lucide-react"
import type { Card, SourceLanguage } from "@/lib/types"
import { HighlightedText } from "./HighlightedText"
import { cn } from "@/lib/utils"

interface FlashCardProps {
  card: Card
  sourceLanguage: SourceLanguage
  onAnswer: (correct: boolean) => void
}

export function FlashCard({ card, sourceLanguage, onAnswer }: FlashCardProps) {
  const { t } = useTranslation()
  const [flipped, setFlipped] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

  const sourceText = card.source[sourceLanguage] ?? card.source.en

  return (
    <div
      className="relative w-full h-full perspective-[1000px]"
      onClick={() => !flipped && setFlipped(true)}
    >
      <div
        className={cn(
          "relative w-full h-full transition-transform duration-500 transform-3d",
          flipped && "[transform:rotateY(180deg)]",
        )}
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden rounded-2xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center p-8 gap-4">
          <p className="text-2xl text-center text-slate-100 leading-relaxed font-medium">
            {sourceText}
          </p>
          <p className="text-sm text-slate-500 mt-4">{t("level.tapToReveal")}</p>
        </div>

        {/* Back */}
        <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] rounded-2xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-between p-8">
          <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full">
            <p className="text-sm text-slate-500">{sourceText}</p>
            <div className="text-2xl text-center text-slate-100 leading-relaxed font-medium">
              <HighlightedText text={card.target} highlights={card.newWords} />
            </div>

            {card.notes?.[sourceLanguage] && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowNotes(!showNotes)
                }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 mt-2"
              >
                {t("level.notes")}
                {showNotes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
            {showNotes && card.notes?.[sourceLanguage] && (
              <p className="text-sm text-slate-400 text-center bg-slate-900/50 rounded-lg p-3">
                {card.notes[sourceLanguage]}
              </p>
            )}
          </div>

          <div className="flex gap-4 w-full mt-6">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAnswer(false)
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 active:bg-red-500/40 transition-colors font-medium"
            >
              <X size={20} />
              {t("level.didntKnow")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAnswer(true)
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 active:bg-emerald-500/40 transition-colors font-medium"
            >
              <Check size={20} />
              {t("level.knew")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
