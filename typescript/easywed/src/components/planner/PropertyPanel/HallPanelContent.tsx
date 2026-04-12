import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useShallow } from "zustand/react/shallow"
import { InfoIcon } from "lucide-react"
import { DimensionsRectangle } from "@/components/dialogs/planner/ConfigureHall/DimensionsRectangle"
import type { GridSpacing } from "@/components/planner/Canvas/HallSurface"
import { NICE_INTERVALS } from "@/components/planner/Canvas/HallSurface"
import { usePlannerStore } from "@/stores/planner.store"
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

  const hall = usePlannerStore(
    useShallow((state) => ({
      preset: state.hall.preset ?? "rectangle",
      dimensions: state.hall.dimensions,
      gridSpacing: state.hall.gridSpacing,
      updateHallProperties: state.updateHallProperties,
    }))
  )

  const [local, setLocal] = useState({
    width: hall.dimensions.width,
    height: hall.dimensions.height,
    gridSpacing: hall.gridSpacing,
  })

  // Sync local state when store changes from outside
  useEffect(() => {
    setLocal({
      width: hall.dimensions.width,
      height: hall.dimensions.height,
      gridSpacing: hall.gridSpacing,
    })
  }, [hall.dimensions.width, hall.dimensions.height, hall.gridSpacing])

  const apply = (width: number, height: number, gridSpacing: GridSpacing) => {
    hall.updateHallProperties(hall.preset, { width, height }, gridSpacing)
  }

  const setWidth = (width: number) => {
    const newSpacing = clampGridSpacing(local.gridSpacing, width, local.height)
    setLocal((l) => ({ ...l, width, gridSpacing: newSpacing }))
    apply(width, local.height, newSpacing)
  }

  const setHeight = (height: number) => {
    const newSpacing = clampGridSpacing(local.gridSpacing, local.width, height)
    setLocal((l) => ({ ...l, height, gridSpacing: newSpacing }))
    apply(local.width, height, newSpacing)
  }

  const setGridSpacing = (gridSpacing: GridSpacing) => {
    setLocal((l) => ({ ...l, gridSpacing }))
    apply(local.width, local.height, gridSpacing)
  }

  return (
    <div className="flex flex-col gap-4">
      {hall.preset === "rectangle" && (
        <DimensionsRectangle
          width={local.width}
          height={local.height}
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
          {validSpacings(local.width, local.height).map((option) => (
            <Button
              key={option}
              type="button"
              size="xs"
              className="flex-1"
              variant={local.gridSpacing === option ? "default" : "outline"}
              onClick={() => setGridSpacing(option)}
            >
              {option === "auto"
                ? t("common.auto")
                : t("common.meters", { count: option })}
            </Button>
          ))}
        </ButtonGroup>
      </Field>
    </div>
  )
}
