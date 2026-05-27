import { useTranslation } from "react-i18next"
import { useLevelList } from "@/hooks/useLevelList"
import { useProgressStore } from "@/stores/progress.store"
import { useSettingsStore } from "@/stores/settings.store"
import { LevelCard } from "@/components/LevelCard"
import type { LevelStatus } from "@/lib/types"

export function HomePage() {
  const { t } = useTranslation()
  const { index, loading } = useLevelList()
  const levels = useProgressStore((s) => s.levels)
  const sourceLanguage = useSettingsStore((s) => s.sourceLanguage)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!index) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Failed to load levels.
      </div>
    )
  }

  const sorted = [...index.levels].sort((a, b) => a.order - b.order)

  function getStatus(levelId: string, order: number): LevelStatus {
    const progress = levels[levelId]
    if (progress) return progress.status
    if (order === 1) return "in-progress"
    const prev = sorted.find((l) => l.order === order - 1)
    if (prev && levels[prev.id]?.status === "completed") return "in-progress"
    return "locked"
  }

  return (
    <div className="py-4">
      <h1 className="text-2xl font-bold mb-6">{t("home.title")}</h1>
      <div className="flex flex-col gap-3">
        {sorted.map((level) => (
          <LevelCard
            key={level.id}
            level={level}
            status={getStatus(level.id, level.order)}
            sourceLanguage={sourceLanguage}
          />
        ))}
      </div>
    </div>
  )
}
