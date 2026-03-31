import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import { HallPreview } from "./Preview"
import { DimensionsRectangle } from "./DimensionsRectangle"
import type { HallPreset } from "@/stores/planner.store"
import { usePlannerStore } from "@/stores/planner.store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useDialogStore } from "@/stores/dialog.store"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"

const PRESETS: Array<HallPreset> = ["rectangle", "l-shape", "u-shape", "custom"]

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
      updatePreset: state.updateHallPreset,
      updateWidth: state.updateHallWidth,
      updateHeight: state.updateHallHeight,
    }))
  )

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

        <Field>
          <FieldLabel>{t("hall.shape")}</FieldLabel>
          <FieldContent className="flex-row gap-1.5">
            {PRESETS.map((value) => (
              <Button
                key={value}
                className="rounded-full"
                variant={hall.preset === value ? "default" : "outline"}
                onClick={() => hall.updatePreset(value)}
              >
                {t(`hall.preset.${value}`)}
              </Button>
            ))}
          </FieldContent>
        </Field>

        {hall.preset === "rectangle" && (
          <DimensionsRectangle
            width={hall.dimensions.width}
            height={hall.dimensions.height}
            setWidth={hall.updateWidth}
            setHeight={hall.updateHeight}
          />
        )}

        <HallPreview
          preset={hall.preset}
          width={hall.dimensions.width}
          height={hall.dimensions.height}
        />
      </DialogContent>
    </Dialog>
  )
}
