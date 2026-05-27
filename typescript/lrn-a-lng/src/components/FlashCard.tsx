import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, X, ChevronDown, ChevronUp, Volume2 } from "lucide-react";
import type { Card, SourceLanguage } from "@/lib/types";
import { HighlightedText } from "./HighlightedText";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";

interface FlashCardProps {
  card: Card;
  sourceLanguage: SourceLanguage;
  targetLanguage: string;
  onAnswer: (correct: boolean) => void;
}

export function FlashCard({
  card,
  sourceLanguage,
  targetLanguage,
  onAnswer,
}: FlashCardProps) {
  const { t } = useTranslation();
  const [flipped, setFlipped] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const { speak, speaking } = useSpeech();

  const sourceText = card.source[sourceLanguage] ?? card.source.en;

  const listenBtn = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        speak(card.target, targetLanguage);
      }}
      aria-label={t("level.listen")}
      className={cn(
        "absolute top-3 right-3 p-2 rounded-full transition-colors",
        speaking
          ? "text-indigo-400 bg-indigo-500/20"
          : "text-slate-500 hover:text-slate-300 hover:bg-slate-700/50",
      )}
    >
      <Volume2 size={16} />
    </button>
  );

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
          {listenBtn}
          <p className="text-2xl text-center text-slate-100 leading-relaxed font-medium">
            {sourceText}
          </p>
          <p className="text-sm text-slate-500 mt-4">
            {t("level.tapToReveal")}
          </p>
        </div>

        {/* Back */}
        <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] rounded-2xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-between p-8">
          {listenBtn}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full">
            <p className="text-sm text-slate-500">{sourceText}</p>
            <div className="text-2xl text-center text-slate-100 leading-relaxed font-medium">
              <HighlightedText text={card.target} highlights={card.newWords} />
            </div>

            {card.notes?.[sourceLanguage] && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotes(!showNotes);
                }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 mt-2"
              >
                {t("level.notes")}
                {showNotes ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
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
                e.stopPropagation();
                onAnswer(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 active:bg-red-500/40 transition-colors font-medium"
            >
              <X size={20} />
              {t("level.didntKnow")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAnswer(true);
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
  );
}
