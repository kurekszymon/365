import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import { useState } from "react"
import { InfoIcon } from "lucide-react"
import { HallPreview } from "./Preview"
import { DimensionsRectangle } from "./DimensionsRectangle"
import type { GridSpacing } from "@/components/planner/Canvas/HallSurface"
import { NICE_INTERVALS } from "@/components/planner/Canvas/HallSurface"
import { usePlannerStore } from "@/stores/planner.store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useDialogStore } from "@/stores/dialog.store"
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

export const HallConfigureDialog = () => {
  const { t } = useTranslation()

  const dialog = useDialogStore(
    useShallow((state) => ({
      opened: state.opened,
      close: state.close,
      open: state.open,
    }))
  )

  const hall = usePlannerStore(
    useShallow((state) => ({
      preset: state.hall.preset,
      dimensions: state.hall.dimensions,
      gridSpacing: state.hall.gridSpacing,
      update: state.updateHall,
    }))
  )

  const [localHall, setLocalHall] = useState({
    preset: hall.preset || "rectangle",
    dimensions: {
      width: hall.dimensions.width,
      height: hall.dimensions.height,
    },
    gridSpacing: hall.gridSpacing,
  })

  return (
    <Dialog
      open={dialog.opened === "Hall.Configure"}
      onOpenChange={(open) => {
        if (!open) dialog.close()
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{t("hall.configure")}</DialogTitle>
        </DialogHeader>

        {localHall.preset === "rectangle" && (
          <DimensionsRectangle
            width={localHall.dimensions.width}
            height={localHall.dimensions.height}
            setWidth={(width) =>
              setLocalHall({
                ...localHall,
                dimensions: { ...localHall.dimensions, width },
                gridSpacing: clampGridSpacing(
                  localHall.gridSpacing,
                  width,
                  localHall.dimensions.height
                ),
              })
            }
            setHeight={(height) =>
              setLocalHall({
                ...localHall,
                dimensions: { ...localHall.dimensions, height },
                gridSpacing: clampGridSpacing(
                  localHall.gridSpacing,
                  localHall.dimensions.width,
                  height
                ),
              })
            }
          />
        )}

        <Field>
          <div className="flex items-center justify-between gap-2">
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
            <ButtonGroup>
              {validSpacings(
                localHall.dimensions.width,
                localHall.dimensions.height
              ).map((option) => (
                <Button
                  key={option}
                  type="button"
                  size="xs"
                  variant={
                    localHall.gridSpacing === option ? "default" : "outline"
                  }
                  onClick={() =>
                    setLocalHall({ ...localHall, gridSpacing: option })
                  }
                >
                  {option === "auto"
                    ? t("common.auto")
                    : t("common.meters", { count: option })}
                </Button>
              ))}
            </ButtonGroup>
          </div>
        </Field>

        <HallPreview
          preset={localHall.preset}
          width={localHall.dimensions.width}
          height={localHall.dimensions.height}
          gridSpacing={localHall.gridSpacing}
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              dialog.close()
              setLocalHall({
                preset: hall.preset || "rectangle",
                dimensions: hall.dimensions,
                gridSpacing: hall.gridSpacing,
              })
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => {
              hall.update(
                localHall.preset,
                localHall.dimensions,
                localHall.gridSpacing
              )
              dialog.close()
            }}
          >
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
