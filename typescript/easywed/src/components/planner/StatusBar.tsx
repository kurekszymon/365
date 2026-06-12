import { RulerIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useViewStore } from "@/stores/view.store"

export const StatusBar = () => {
  const { t } = useTranslation()
  const isMeasuring = useViewStore((state) => state.isMeasuring)

  if (!isMeasuring) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center print:hidden">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-teal-200 bg-teal-50/90 px-4 py-2 text-xs text-teal-700 shadow-md backdrop-blur-sm">
        <RulerIcon className="size-3.5 shrink-0" />
        <span>{t("measure.statusbar")}</span>
        <span className="flex items-center gap-1.5">
          <kbd className="rounded border border-teal-300 bg-white px-1.5 py-0.5 font-mono text-[10px]">
            Esc
          </kbd>
          <span className="text-teal-600">{t("statusbar.esc_to_exit")}</span>
        </span>
      </div>
    </div>
  )
}
