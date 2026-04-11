import { useTranslation } from "react-i18next"
import { useGlobalStore } from "@/stores/global.store"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type ScalePillProps = {
  reset: () => void
  scale?: number
}

export const ScalePill = ({ scale, reset }: ScalePillProps) => {
  const { t } = useTranslation()
  const viewport = useGlobalStore((state) => state.viewport)
  const currentScale = scale ?? viewport.scale

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="cursor-pointer rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground tabular-nums backdrop-blur-sm"
          onClick={reset}
        >
          {Math.round(currentScale * 100)}%
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">{t("canvas.scale.tooltip")}</TooltipContent>
    </Tooltip>
  )
}
