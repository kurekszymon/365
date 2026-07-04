import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

type DimensionLabelProps = {
  orientation: "horizontal" | "vertical"
  value: number
  span: number
  className?: string
  left?: number
  top?: number
}

type BaseDimensionLabelProps = Omit<DimensionLabelProps, "orientation">

// Positioned with a translate instead of left/top: these labels track the
// hall during pan/zoom, and transform updates skip per-frame layout (see the
// same trick on HallSurface's HallBackground).
const positionStyle = (left?: number, top?: number) =>
  left !== undefined || top !== undefined
    ? { transform: `translate3d(${left ?? 0}px, ${top ?? 0}px, 0)` }
    : undefined

const HorizontalDimensionLabel = ({
  value,
  span,
  className,
  left,
  top,
}: BaseDimensionLabelProps) => {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-0 left-0 z-20 flex items-center",
        className
      )}
      style={{ ...positionStyle(left, top), width: span }}
    >
      <span className="h-px w-3" />
      <span className="h-px flex-1" />
      <span className="px-2 text-xs font-medium text-planner-hall tabular-nums">
        {t("common.meters", { count: value })}
      </span>
      <span className="h-px flex-1" />
      <span className="h-px w-3" />
    </div>
  )
}

const VerticalDimensionLabel = ({
  value,
  span,
  className,
  left,
  top,
}: BaseDimensionLabelProps) => {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-0 left-0 z-20 flex flex-col items-center",
        className
      )}
      style={{ ...positionStyle(left, top), height: span }}
    >
      <span className="h-3 w-px" />
      <span className="w-px flex-1" />
      <span className="-rotate-90 px-2 text-xs font-medium whitespace-nowrap text-planner-hall tabular-nums">
        {t("common.meters", { count: value })}
      </span>
      <span className="w-px flex-1" />
      <span className="h-3 w-px" />
    </div>
  )
}

export const DimensionLabel = (props: DimensionLabelProps) => {
  if (props.orientation === "horizontal") {
    return <HorizontalDimensionLabel {...props} />
  }

  return <VerticalDimensionLabel {...props} />
}
