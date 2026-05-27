import { useParams, useNavigate, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Home } from "lucide-react"
import { useLevelList } from "@/hooks/useLevelList"

export function LevelSummaryPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { index } = useLevelList()

  const results: Record<string, boolean> = location.state?.results ?? {}
  const total = Object.keys(results).length
  const correct = Object.values(results).filter(Boolean).length
  const incorrect = total - correct

  const currentLevel = index?.levels.find((l) => l.id === id)
  const nextLevel = index?.levels.find(
    (l) => l.order === (currentLevel?.order ?? 0) + 1,
  )

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 py-8">
      <h1 className="text-3xl font-bold">{t("summary.title")}</h1>

      <div className="flex gap-8">
        <div className="flex flex-col items-center gap-1">
          <CheckCircle2 size={32} className="text-emerald-500" />
          <span className="text-2xl font-bold text-emerald-400">{correct}</span>
          <span className="text-sm text-slate-500">{t("summary.correct")}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <XCircle size={32} className="text-red-500" />
          <span className="text-2xl font-bold text-red-400">{incorrect}</span>
          <span className="text-sm text-slate-500">{t("summary.incorrect")}</span>
        </div>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3 mt-4">
        {nextLevel && (
          <button
            onClick={() => navigate(`/level/${nextLevel.id}`)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 active:bg-indigo-700 transition-colors"
          >
            {t("summary.nextLevel")}
            <ArrowRight size={18} />
          </button>
        )}
        {incorrect > 0 && (
          <button
            onClick={() => navigate("/review")}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 active:bg-slate-600 transition-colors"
          >
            <RotateCcw size={18} />
            {t("summary.reviewMistakes")}
          </button>
        )}
        <button
          onClick={() => navigate("/")}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 active:bg-slate-600 transition-colors"
        >
          <Home size={18} />
          {t("summary.backHome")}
        </button>
      </div>
    </div>
  )
}
