import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { InfoIcon } from "lucide-react"
import { DimensionsRectangle } from "./fields/DimensionsRectangle"

import type { GridSpacing } from "@/stores/view.store"
import { NICE_INTERVALS } from "@/components/planner/Canvas/HallSurface"
import { usePlannerStore } from "@/stores/planner.store"
import { useViewStore } from "@/stores/view.store"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Field, FieldTitle } from "@/components/ui/field"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function validSpacings(width: number, height: number): Array<GridSpacing> {
  return [...NICE_INTERVALS.filter((n) => n < Math.max(width, height)), "auto"]
}

function clampGridSpacing(
  spacing: GridSpacing,
  width: number,
  height: number
): GridSpacing {
  const valid = validSpacings(width, height)
  return valid.includes(spacing) ? spacing : 1
}

export const HallPanelContent = () => {
  const { t } = useTranslation()

  const { preset, dimensions, updateHall } = usePlannerStore(
    useShallow((state) => ({
      preset: state.hall.preset ?? "rectangle",
      dimensions: state.hall.dimensions,
      updateHall: state.updateHall,
    }))
  )

  const gridSpacing = useViewStore((state) => state.gridSpacing)
  const gridStyle = useViewStore((state) => state.gridStyle)
  const setGridSpacing = useViewStore((state) => state.setGridSpacing)
  const setGridStyle = useViewStore((state) => state.setGridStyle)

  const setWidth = (width: number) => {
    const spacing = clampGridSpacing(gridSpacing, width, dimensions.height)
    updateHall(preset, { width, height: dimensions.height })
    if (spacing !== gridSpacing) setGridSpacing(spacing)
  }

  const setHeight = (height: number) => {
    const spacing = clampGridSpacing(gridSpacing, dimensions.width, height)
    updateHall(preset, { width: dimensions.width, height })
    if (spacing !== gridSpacing) setGridSpacing(spacing)
  }

  return (
    <div className="flex flex-col gap-4">
      {preset === "rectangle" && (
        <DimensionsRectangle
          width={dimensions.width}
          height={dimensions.height}
          setWidth={setWidth}
          setHeight={setHeight}
        />
      )}

      <Field>
        <div className="flex items-center gap-1.5">
          <FieldTitle>{t("canvas.grid.spacing")}</FieldTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="size-3.5 cursor-default text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="right">
              {t("canvas.grid.spacing_tooltip")}
            </TooltipContent>
          </Tooltip>
        </div>
        <ButtonGroup className="w-full">
          {validSpacings(dimensions.width, dimensions.height).map((option) => (
            <Button
              key={option}
              type="button"
              size="xs"
              className="flex-1"
              variant={gridSpacing === option ? "default" : "outline"}
              onClick={() => setGridSpacing(option)}
            >
              {option === "auto"
                ? t("common.auto")
                : t("common.meters", { count: option })}
            </Button>
          ))}
        </ButtonGroup>
      </Field>
      <Field>
        <div className="flex items-center gap-1.5">
          <FieldTitle>{t("canvas.grid.style")}</FieldTitle>
        </div>
        <ButtonGroup className="w-full">
          <Button
            type="button"
            size="xs"
            className="flex-1"
            variant={gridStyle === "grid" ? "default" : "outline"}
            onClick={() => setGridStyle("grid")}
          >
            {t("canvas.grid.grid")}
          </Button>
          <Button
            type="button"
            size="xs"
            className="flex-1"
            variant={gridStyle === "dots" ? "default" : "outline"}
            onClick={() => setGridStyle("dots")}
          >
            {t("canvas.grid.dots")}
          </Button>
          <Button
            type="button"
            size="xs"
            className="flex-1"
            variant={gridStyle === "off" ? "default" : "outline"}
            onClick={() => setGridStyle("off")}
          >
            {t("canvas.grid.off")}
          </Button>
        </ButtonGroup>
      </Field>
    </div>
  )
}
