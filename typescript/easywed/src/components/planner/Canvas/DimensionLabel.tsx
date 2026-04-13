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
        "pointer-events-none absolute z-20 flex items-center",
        className
      )}
      style={{ left, top, width: span }}
    >
      <span className="h-px w-3" />
      <span className="h-px flex-1" />
      <span className="px-2 text-xs font-medium text-emerald-700 tabular-nums">
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
        "pointer-events-none absolute z-20 flex flex-col items-center",
        className
      )}
      style={{ left, top, height: span }}
    >
      <span className="h-3 w-px" />
      <span className="w-px flex-1" />
      <span className="-rotate-90 px-2 text-xs font-medium whitespace-nowrap text-emerald-700 tabular-nums">
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
