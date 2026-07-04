import { useTranslation } from "react-i18next"
import {
  ArmchairIcon,
  DotIcon,
  Grid2x2XIcon,
  Grid3x3Icon,
  RulerIcon,
} from "lucide-react"
import type { GridStyle, SnapStep } from "@/stores/view.store"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useViewStore } from "@/stores/view.store"

const GRID_ICON: Record<GridStyle, React.ReactNode> = {
  dots: <DotIcon className="size-3.5" />,
  grid: <Grid3x3Icon className="size-3.5" />,
  off: <Grid2x2XIcon className="size-3.5" />,
}

const NEXT_GRID_STYLE: Record<GridStyle, GridStyle> = {
  dots: "off",
  grid: "dots",
  off: "grid",
}

const SNAP_STEPS: Array<SnapStep> = ["off", 0.1, 0.25, 0.5, 1]

/**
 * Desktop-only top-right canvas toolbar: snap stepper, grid style cycler,
 * measure toggle (+ its mode switch while active) and the seats overlay
 * toggle. Reads/writes `view.store` directly — it's all view state — so
 * `Canvas` doesn't have to thread a dozen props through.
 */
export const CanvasToolbar = () => {
  const { t } = useTranslation()

  const snapStep = useViewStore((state) => state.snapStep)
  const setSnapStep = useViewStore((state) => state.setSnapStep)
  const gridStyle = useViewStore((state) => state.gridStyle)
  const setGridStyle = useViewStore((state) => state.setGridStyle)
  const isMeasuring = useViewStore((state) => state.isMeasuring)
  const toggleMeasuring = useViewStore((state) => state.toggleMeasuring)
  const measureMode = useViewStore((state) => state.measureMode)
  const setMeasureMode = useViewStore((state) => state.setMeasureMode)
  const showSeats = useViewStore((state) => state.showSeats)
  const toggleSeats = useViewStore((state) => state.toggleSeats)

  const snapIndex = SNAP_STEPS.indexOf(snapStep)

  return (
    <div
      data-no-pan
      className="absolute top-3 right-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-nowrap items-center justify-end gap-2"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex shrink-0 items-center rounded-md border bg-background/80 text-[10px] text-muted-foreground backdrop-blur-sm">
            <button
              type="button"
              className="cursor-pointer px-1.5 py-1 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 max-md:px-2.5 max-md:py-2"
              disabled={snapIndex === 0}
              onClick={() => setSnapStep(SNAP_STEPS[snapIndex - 1])}
            >
              −
            </button>
            <span className="w-[2.5rem] text-center">
              {snapStep === "off"
                ? t("canvas.snap.off")
                : t("common.meters", { count: snapStep })}
            </span>
            <button
              type="button"
              className="cursor-pointer px-1.5 py-1 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 max-md:px-2.5 max-md:py-2"
              disabled={snapIndex === SNAP_STEPS.length - 1}
              onClick={() => setSnapStep(SNAP_STEPS[snapIndex + 1])}
            >
              +
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {t("canvas.snap.tooltip")}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setGridStyle(NEXT_GRID_STYLE[gridStyle])}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm max-md:py-2"
          >
            {GRID_ICON[gridStyle]}
            <span className="max-md:hidden">
              {t(`canvas.grid.${gridStyle}`)}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("canvas.grid.style")}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border bg-background/80 px-2 py-1 text-[10px] backdrop-blur-sm max-md:py-2 ${
              isMeasuring
                ? "border-planner-selected bg-planner-soft text-planner-selected"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={toggleMeasuring}
            aria-pressed={isMeasuring}
          >
            <RulerIcon className="size-3.5" />
            <span className="max-md:hidden">{t("measure.tool")}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("measure.tooltip")}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border bg-background/80 px-2 py-1 text-[10px] backdrop-blur-sm max-md:py-2 ${
              showSeats
                ? // Same themed active treatment as the measure toggle — the old
                  // hardcoded emerald classes didn't follow the palette or dark
                  // mode.
                  "border-planner-selected bg-planner-soft text-planner-selected"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={toggleSeats}
            aria-pressed={showSeats}
          >
            <ArmchairIcon className="size-3.5" />
            <span className="max-md:hidden">{t("seats.toggle")}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("seats.tooltip")}</TooltipContent>
      </Tooltip>

      {isMeasuring && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-planner-selected bg-planner-soft px-2 py-1 text-[10px] text-planner-selected backdrop-blur-sm max-md:py-2"
              onClick={() =>
                setMeasureMode(measureMode === "center" ? "border" : "center")
              }
            >
              {t(`measure.mode.${measureMode}`)}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t("measure.mode.tooltip")}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
