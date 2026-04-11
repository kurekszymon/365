import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import { useState } from "react"
import { HallPreview } from "./Preview"
import { DimensionsRectangle } from "./DimensionsRectangle"
import type { GridSpacing } from "@/components/planner/Canvas/HallSurface"
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

const GRID_SPACING_OPTIONS: Array<GridSpacing> = [1, 2, 5, 10, 25, 50, "auto"]

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
              })
            }
            setHeight={(height) =>
              setLocalHall({
                ...localHall,
                dimensions: { ...localHall.dimensions, height },
              })
            }
          />
        )}

        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldTitle>{t("canvas.grid.spacing")}</FieldTitle>
            <ButtonGroup>
              {GRID_SPACING_OPTIONS.map((option) => (
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
