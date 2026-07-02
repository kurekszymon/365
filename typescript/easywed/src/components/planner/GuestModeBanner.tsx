import { InfoIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { isLocalWedding } from "@/lib/localWedding"
import { useGlobalStore } from "@/stores/global.store"

// Persistent (not fading/click-through like StatusBar) disclosure that a
// guest's planner data lives only in this browser's storage. Deliberately
// its own component/file rather than folded into StatusBar, which stays
// scoped to the measure tool.
export const GuestModeBanner = () => {
  const { t } = useTranslation()
  const weddingId = useGlobalStore((state) => state.weddingId)

  if (!isLocalWedding(weddingId)) return null

  return (
    <div className="flex items-center justify-center gap-3 border-b border-planner-table-border bg-planner-soft px-4 py-2 text-center text-xs text-planner-selected print:hidden">
      <InfoIcon className="size-3.5 shrink-0" />
      <span>{t("guest_mode.banner")}</span>
      <Link
        to="/login"
        className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
      >
        {t("auth.sign_in")}
      </Link>
    </div>
  )
}
