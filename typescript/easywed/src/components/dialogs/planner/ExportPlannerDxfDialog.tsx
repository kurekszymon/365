import { useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { useDialogStore } from "@/stores/dialog.store"
import { triggerDxfExport } from "@/lib/export/plannerDxf"

export const ExportPlannerDxfDialog = () => {
  const { t } = useTranslation()
  const [includeLabels, setIncludeLabels] = useState(true)
  const [includeDimensions, setIncludeDimensions] = useState(true)
  const [includeCapacity, setIncludeCapacity] = useState(true)

  const dialog = useDialogStore(
    useShallow((state) => ({
      opened: state.opened,
      close: state.close,
    }))
  )

  return (
    <Dialog
      open={dialog.opened === "Planner.Export.Dxf"}
      onOpenChange={(open) => {
        if (!open) dialog.close()
      }}
      aria-describedby={undefined}
    >
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogTitle>{t("export.dxf.title")}</DialogTitle>
        <Field>
          <FieldLabel>{t("export.dxf.contents")}</FieldLabel>
          <FieldContent className="flex-row flex-wrap gap-1.5">
            <Button
              variant={includeLabels ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setIncludeLabels((v) => !v)}
            >
              {t("export.dxf.include_labels")}
            </Button>
            <Button
              variant={includeCapacity ? "default" : "outline"}
              className="rounded-full"
              disabled={!includeLabels}
              title={
                !includeLabels
                  ? t("export.dxf.capacity_disabled_hint")
                  : undefined
              }
              onClick={() => setIncludeCapacity((v) => !v)}
            >
              {t("export.dxf.include_capacity")}
            </Button>
            <Button
              variant={includeDimensions ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setIncludeDimensions((v) => !v)}
            >
              {t("export.dxf.include_dimensions")}
            </Button>
          </FieldContent>
        </Field>
        <Button
          onClick={() => {
            triggerDxfExport({
              includeLabels,
              includeDimensions,
              includeCapacity: includeLabels && includeCapacity,
            })
            dialog.close()
          }}
        >
          {t("export.dxf.download")}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
