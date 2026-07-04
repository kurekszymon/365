import { useTranslation } from "react-i18next"
import { MinusIcon, PlusIcon } from "lucide-react"

type MobileZoomControlProps = {
  zoomIn: () => void
  zoomOut: () => void
}

/** Floating vertical +/- stack for zoom on the mobile full-screen plan. */
export const MobileZoomControl = ({
  zoomIn,
  zoomOut,
}: MobileZoomControlProps) => {
  const { t } = useTranslation()

  return (
    <div
      data-no-pan
      className="absolute bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-4 z-20 flex flex-col rounded-full border bg-card shadow-[0_8px_20px_-12px_rgba(40,60,45,0.4)]"
    >
      <button
        type="button"
        aria-label={t("canvas.zoom.in")}
        className="flex size-9 items-center justify-center text-foreground"
        onClick={zoomIn}
      >
        <PlusIcon className="size-4" />
      </button>
      <button
        type="button"
        aria-label={t("canvas.zoom.out")}
        className="flex size-9 items-center justify-center text-foreground"
        onClick={zoomOut}
      >
        <MinusIcon className="size-4" />
      </button>
    </div>
  )
}
