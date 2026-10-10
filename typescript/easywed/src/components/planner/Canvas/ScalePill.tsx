import { useTranslation } from "react-i18next"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type ScalePillProps = {
  reset: () => void
  zoomIn: () => void
  zoomOut: () => void
  /** Live zoom from view.store.ts - the pill renders it, it does not own it. */
  scale: number
}

export const ScalePill = ({
  scale,
  reset,
  zoomIn,
  zoomOut,
}: ScalePillProps) => {
  const { t } = useTranslation()

  return (
    <div className="flex shrink-0 items-center rounded-full border bg-card text-[10px] text-muted-foreground tabular-nums shadow-[0_8px_20px_-12px_rgba(40,60,45,0.4)]">
      <button
        type="button"
        aria-label={t("canvas.zoom.out")}
        className="cursor-pointer px-2 py-1 text-sm leading-none hover:text-foreground max-md:px-2.5 max-md:py-2"
        onClick={zoomOut}
      >
        −
      </button>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="w-[3rem] cursor-pointer py-1 text-center hover:text-foreground max-md:py-2"
            onClick={reset}
          >
            {Math.round(scale * 100)}%
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {t("canvas.scale.tooltip")}
        </TooltipContent>
      </Tooltip>
      <button
        type="button"
        aria-label={t("canvas.zoom.in")}
        className="cursor-pointer px-2 py-1 text-sm leading-none hover:text-foreground max-md:px-2.5 max-md:py-2"
        onClick={zoomIn}
      >
        +
      </button>
    </div>
  )
}
