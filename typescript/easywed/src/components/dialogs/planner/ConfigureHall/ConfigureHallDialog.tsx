import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import { useState } from "react"
import { HallPreview } from "./Preview"
import { DimensionsRectangle } from "./DimensionsRectangle"
import { usePlannerStore } from "@/stores/planner.store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useDialogStore } from "@/stores/dialog.store"
import { Button } from "@/components/ui/button"

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
      update: state.updateHall,
    }))
  )

  const [localHall, setLocalHall] = useState({
    preset: hall.preset || "rectangle",
    dimensions: {
      width: hall.dimensions.width,
      height: hall.dimensions.height,
    },
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

        <HallPreview
          preset={localHall.preset}
          width={localHall.dimensions.width}
          height={localHall.dimensions.height}
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              dialog.close()
              setLocalHall({
                preset: hall.preset || "rectangle",
                dimensions: hall.dimensions,
              })
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => {
              hall.update(localHall.preset, localHall.dimensions)
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
