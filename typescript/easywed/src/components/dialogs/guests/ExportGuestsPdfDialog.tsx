import { useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import type { GuestField } from "@/lib/export/guestsCsv"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { useDialogStore } from "@/stores/dialog.store"
import { DEFAULT_PRINT_FIELDS } from "@/stores/print.store"
import { GUEST_FIELDS } from "@/lib/export/guestsCsv"
import { triggerPdfExport } from "@/lib/export/guestsPdf"

// Table column is implicit (guests are grouped under their table heading).
const PICKABLE_FIELDS = GUEST_FIELDS.filter((f) => f !== "table")

export const ExportGuestsPdfDialog = () => {
  const { t } = useTranslation()
  const [selected, setSelected] =
    useState<Array<GuestField>>(DEFAULT_PRINT_FIELDS)

  const dialog = useDialogStore(
    useShallow((state) => ({
      opened: state.opened,
      close: state.close,
    }))
  )

  const toggle = (field: GuestField) => {
    setSelected((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    )
  }

  const orderedSelected = PICKABLE_FIELDS.filter((f) => selected.includes(f))
  const canExport = orderedSelected.includes("name")

  return (
    <Dialog
      open={dialog.opened === "Guests.Export.Pdf"}
      onOpenChange={(open) => {
        if (!open) dialog.close()
      }}
      aria-describedby={undefined}
    >
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogTitle>{t("export.pdf.title")}</DialogTitle>
        <Field>
          <FieldLabel>{t("export.pdf.fields")}</FieldLabel>
          <FieldContent className="flex-row flex-wrap gap-1.5">
            {PICKABLE_FIELDS.map((field) => (
              <Button
                key={field}
                variant={selected.includes(field) ? "default" : "outline"}
                className="rounded-full"
                onClick={() => toggle(field)}
              >
                {t(`export.col.${field}`)}
              </Button>
            ))}
          </FieldContent>
        </Field>
        <Button
          disabled={!canExport}
          onClick={() => {
            dialog.close()
            triggerPdfExport(orderedSelected)
          }}
        >
          {t("export.pdf.download")}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
