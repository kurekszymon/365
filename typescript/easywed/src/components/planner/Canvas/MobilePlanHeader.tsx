import { useTranslation } from "react-i18next"
import { ArrowLeftIcon, SparklesIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { usePanelStore } from "@/stores/panel.store"

/**
 * Floating card over the full-bleed mobile plan (replaces the desktop
 * toolbar row on small screens). Back navigates to the wedding list; the
 * sparkle button opens the AI assistant as a full sheet — the mobile
 * counterpart of the desktop sidebar's "Asystent" tab.
 */
export const MobilePlanHeader = () => {
  const { t } = useTranslation()
  const openAiChat = usePanelStore((state) => state.openAiChat)

  return (
    <div
      data-no-pan
      className="absolute top-3 right-3 left-3 z-20 flex items-center justify-between rounded-2xl border bg-card px-2 py-2 shadow-[0_10px_24px_-14px_rgba(40,60,45,0.4)]"
    >
      <div className="flex items-center gap-2">
        <Link
          to="/"
          aria-label={t("planner.back")}
          className="flex size-9 items-center justify-center rounded-xl text-foreground"
        >
          <ArrowLeftIcon className="size-[19px]" />
        </Link>
        <span className="font-heading text-[15px] font-semibold">
          {t("hall.plan_title")}
        </span>
      </div>
      <button
        type="button"
        onClick={() => openAiChat()}
        aria-label={t("assistant.title")}
        className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
      >
        <SparklesIcon className="size-4" />
      </button>
    </div>
  )
}
