import { useTranslation } from "react-i18next"
import { useGlobalStore } from "@/stores/global.store"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type ScalePillProps = {
  reset: () => void
  zoomIn: () => void
  zoomOut: () => void
  scale?: number
}

export const ScalePill = ({ scale, reset, zoomIn, zoomOut }: ScalePillProps) => {
  const { t } = useTranslation()
  const viewport = useGlobalStore((state) => state.viewport)
  const currentScale = scale ?? viewport.scale

  return (
    <div className="flex items-center rounded-md border bg-background/80 text-[10px] text-muted-foreground tabular-nums backdrop-blur-sm">
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
            {Math.round(currentScale * 100)}%
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
