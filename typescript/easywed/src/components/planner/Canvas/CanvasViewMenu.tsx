import { useTranslation } from "react-i18next"
import {
  ArmchairIcon,
  DotIcon,
  Grid2x2XIcon,
  Grid3x3Icon,
  MagnetIcon,
  RulerIcon,
} from "lucide-react"
import type { GridStyle, SnapStep } from "@/stores/view.store"
import { useViewStore } from "@/stores/view.store"
import {
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu"

const GRID_ICON: Record<GridStyle, React.ReactNode> = {
  dots: <DotIcon className="size-4" />,
  grid: <Grid3x3Icon className="size-4" />,
  off: <Grid2x2XIcon className="size-4" />,
}

const GRID_STYLES: Array<GridStyle> = ["off", "dots", "grid"]
const SNAP_STEPS: Array<SnapStep> = ["off", 0.1, 0.25, 0.5, 1]

// Radix radio items only carry string values, so serialize the snap step (which
// is a number | "off") on the way in and parse it back out here.
const parseSnapStep = (value: string): SnapStep =>
  value === "off" ? "off" : (Number(value) as SnapStep)

export const CanvasViewMenu = () => {
  const { t } = useTranslation()

  const gridStyle = useViewStore((state) => state.gridStyle)
  const setGridStyle = useViewStore((state) => state.setGridStyle)
  const snapStep = useViewStore((state) => state.snapStep)
  const setSnapStep = useViewStore((state) => state.setSnapStep)
  const showSeats = useViewStore((state) => state.showSeats)
  const toggleSeats = useViewStore((state) => state.toggleSeats)
  const isMeasuring = useViewStore((state) => state.isMeasuring)
  const toggleMeasuring = useViewStore((state) => state.toggleMeasuring)

  const snapLabel =
    snapStep === "off"
      ? t("canvas.snap.off")
      : t("common.meters", { count: snapStep })

  return (
    <>
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          {GRID_ICON[gridStyle]}
          {t("canvas.grid.style")}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuRadioGroup
            value={gridStyle}
            onValueChange={(value) => setGridStyle(value as GridStyle)}
          >
            {GRID_STYLES.map((style) => (
              <ContextMenuRadioItem key={style} value={style}>
                {GRID_ICON[style]}
                {t(`canvas.grid.${style}`)}
              </ContextMenuRadioItem>
            ))}
          </ContextMenuRadioGroup>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <MagnetIcon className="size-4" />
          {t("canvas.snap.label")}
          <span className="ml-auto pl-3 text-xs text-muted-foreground">
            {snapLabel}
          </span>
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuRadioGroup
            value={String(snapStep)}
            onValueChange={(value) => setSnapStep(parseSnapStep(value))}
          >
            {SNAP_STEPS.map((step) => (
              <ContextMenuRadioItem key={String(step)} value={String(step)}>
                {step === "off"
                  ? t("canvas.snap.off")
                  : t("common.meters", { count: step })}
              </ContextMenuRadioItem>
            ))}
          </ContextMenuRadioGroup>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuCheckboxItem
        checked={showSeats}
        onCheckedChange={() => toggleSeats()}
      >
        <ArmchairIcon className="size-4" />
        {t("seats.toggle")}
      </ContextMenuCheckboxItem>

      <ContextMenuCheckboxItem
        checked={isMeasuring}
        onCheckedChange={() => toggleMeasuring()}
      >
        <RulerIcon className="size-4" />
        {t("measure.tool")}
      </ContextMenuCheckboxItem>
    </>
  )
}
