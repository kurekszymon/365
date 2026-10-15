import { InfoIcon, XIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { isLocalWedding } from "@/lib/localWedding"
import { useGlobalStore } from "@/stores/global.store"
import { useGuestBannerStore } from "@/stores/guestBanner.store"

// Disclosure (not fading/click-through like StatusBar) that a guest's planner
// data lives only in this browser's storage. Dismissible, and the dismissal
// sticks on this device - it's been read once, it needn't cost a row of the
// canvas forever. Deliberately its own component/file rather than folded into
// StatusBar, which stays scoped to the measure tool.
export const GuestModeBanner = () => {
  const { t } = useTranslation()
  const weddingId = useGlobalStore((state) => state.weddingId)
  const dismissed = useGuestBannerStore((state) => state.dismissed)
  const dismiss = useGuestBannerStore((state) => state.dismiss)

  if (!isLocalWedding(weddingId) || dismissed) return null

  return (
    <div className="flex items-center justify-center gap-3 border-b border-planner-table-border bg-planner-soft py-2 pr-2 pl-4 text-center text-xs text-planner-selected print:hidden">
      <InfoIcon className="size-3.5 shrink-0" />
      <span>{t("guest_mode.banner")}</span>
      <Link
        to="/login"
        className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
      >
        {t("auth.sign_in")}
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("guest_mode.banner_dismiss")}
        className="-my-1 shrink-0 pressable rounded-md p-1.5 hover:bg-planner-table-border/40"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  )
}
