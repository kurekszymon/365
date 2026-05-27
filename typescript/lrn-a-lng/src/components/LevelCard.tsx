import { useNavigate } from "react-router-dom"
import { Lock, CheckCircle2, BookOpen } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { LevelMeta, LevelStatus, SourceLanguage } from "@/lib/types"
import { cn } from "@/lib/utils"

interface LevelCardProps {
  level: LevelMeta
  status: LevelStatus
  sourceLanguage: SourceLanguage
}

export function LevelCard({ level, status, sourceLanguage }: LevelCardProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const lang = i18n.language as "en" | "pl"
  const isLocked = status === "locked"

  return (
    <button
      disabled={isLocked}
      onClick={() => navigate(`/level/${level.id}`)}
      className={cn(
        "relative w-full text-left rounded-xl p-5 border transition-all",
        isLocked
          ? "bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed"
          : status === "completed"
            ? "bg-emerald-950/30 border-emerald-800/50 hover:border-emerald-700/70"
            : "bg-slate-800 border-slate-700 hover:border-indigo-500/50 active:bg-slate-700",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">
              {level.order}
            </span>
            <h3 className="font-semibold text-slate-100 truncate">
              {level.title[lang] ?? level.title.en}
            </h3>
          </div>
          <p className="text-sm text-slate-400 mt-1 truncate">
            {level.description[sourceLanguage] ?? level.description.en}
          </p>
          <p className="text-xs text-slate-600 mt-2">
            {t("home.cards", { count: level.cardCount })}
          </p>
        </div>
        <div className="shrink-0">
          {isLocked ? (
            <Lock size={20} className="text-slate-600" />
          ) : status === "completed" ? (
            <CheckCircle2 size={20} className="text-emerald-500" />
          ) : (
            <BookOpen size={20} className="text-indigo-400" />
          )}
        </div>
      </div>
    </button>
  )
}
