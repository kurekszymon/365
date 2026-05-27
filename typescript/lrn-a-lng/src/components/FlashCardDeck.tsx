import { useState, useCallback } from "react";
import type { Card, SourceLanguage } from "@/lib/types";
import { FlashCard } from "./FlashCard";
import { useSwipe } from "@/hooks/useSwipe";
import { useTranslation } from "react-i18next";

interface FlashCardDeckProps {
  cards: Card[];
  sourceLanguage: SourceLanguage;
  targetLanguage: string;
  onAnswer: (cardId: string, correct: boolean) => void;
  onComplete: (results: Record<string, boolean>) => void;
}

export function FlashCardDeck({
  cards,
  sourceLanguage,
  targetLanguage,
  onAnswer,
  onComplete,
}: FlashCardDeckProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});

  const handleAnswer = useCallback(
    (correct: boolean) => {
      const card = cards[currentIndex];
      onAnswer(card.id, correct);
      const newResults = { ...results, [card.id]: correct };
      setResults(newResults);

      if (currentIndex < cards.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        onComplete(newResults);
      }
    },
    [cards, currentIndex, onAnswer, onComplete, results],
  );

  const swipeHandlers = useSwipe<HTMLDivElement>({
    onSwipeRight: () => handleAnswer(true),
    onSwipeLeft: () => handleAnswer(false),
  });

  const card = cards[currentIndex];
  if (!card) return null;

  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-slate-500 shrink-0">
          {t("level.cardOf", {
            current: currentIndex + 1,
            total: cards.length,
          })}
        </span>
      </div>

      <div
        ref={swipeHandlers.ref}
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchEnd={swipeHandlers.onTouchEnd}
        className="flex-1 touch-pan-y"
        key={card.id}
      >
        <FlashCard
          card={card}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          onAnswer={handleAnswer}
        />
      </div>
    </div>
  );
}
