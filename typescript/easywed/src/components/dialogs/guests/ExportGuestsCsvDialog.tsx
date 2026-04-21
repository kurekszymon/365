import { useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import { PreviewGuestsTable } from "./PreviewGuestsTable"
import type { FormatMode, GuestField } from "@/lib/export/guestsCsv"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { useDialogStore } from "@/stores/dialog.store"
import {
  FORMAT_MODES,
  GUEST_FIELDS,
  effectiveFields,
  exportGuestsCsv,
} from "@/lib/export/guestsCsv"

const DEFAULT_FIELDS: Array<GuestField> = ["name", "table"]
const DEFAULT_FORMAT: FormatMode = "flat"

export const ExportGuestsCsvDialog = () => {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Array<GuestField>>(DEFAULT_FIELDS)
  const [formatMode, setFormatMode] = useState<FormatMode>(DEFAULT_FORMAT)

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

  const tableDisabled = formatMode === "grouped"
  const orderedSelected = GUEST_FIELDS.filter((f) => selected.includes(f))
  const hasExportableColumn = effectiveFields(selected, formatMode).length > 0

  return (
    <Dialog
      open={dialog.opened === "Guests.Export.Csv"}
      onOpenChange={(open) => {
        if (!open) dialog.close()
      }}
      aria-describedby={undefined}
    >
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogTitle>{t("export.csv.title")}</DialogTitle>
        <Field>
          <FieldLabel>{t("export.csv.format")}</FieldLabel>
          <FieldContent className="flex-row flex-wrap gap-1.5">
            {FORMAT_MODES.map((mode) => (
              <Button
                key={mode}
                variant={formatMode === mode ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setFormatMode(mode)}
              >
                {t(`export.csv.format.${mode}`)}
              </Button>
            ))}
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>{t("export.csv.fields")}</FieldLabel>
          <FieldContent className="flex-row flex-wrap gap-1.5">
            {GUEST_FIELDS.map((field) => {
              const disabled = field === "table" && tableDisabled
              return (
                <Button
                  key={field}
                  variant={selected.includes(field) ? "default" : "outline"}
                  className="rounded-full"
                  disabled={disabled}
                  title={
                    disabled ? t("export.csv.table_disabled_hint") : undefined
                  }
                  onClick={() => toggle(field)}
                >
                  {t(`export.col.${field}`)}
                </Button>
              )
            })}
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>{t("export.csv.preview")}</FieldLabel>
          <FieldContent>
            <PreviewGuestsTable
              fields={orderedSelected}
              formatMode={formatMode}
            />
          </FieldContent>
        </Field>
        <Button
          disabled={!hasExportableColumn}
          onClick={() => {
            exportGuestsCsv(orderedSelected, formatMode, t)
            dialog.close()
          }}
        >
          {t("export.csv.download")}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
