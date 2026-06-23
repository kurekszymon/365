import { useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { useTranslation } from "react-i18next"
import type { GuestField } from "@/lib/export/guestsCsv"
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useDialogStore } from "@/stores/dialog.store"
import { DEFAULT_PRINT_FIELDS } from "@/stores/print.store"
import { useViewStore } from "@/stores/view.store"
import { GUEST_FIELDS } from "@/lib/export/guestsCsv"
import { triggerPdfExport } from "@/lib/export/guestsPdf"

// Table column is implicit (guests are grouped under their table heading).
const PICKABLE_FIELDS = GUEST_FIELDS.filter((f) => f !== "table")

export const ExportGuestsPdfDialog = () => {
  const { t } = useTranslation()
  const [selected, setSelected] =
    useState<Array<GuestField>>(DEFAULT_PRINT_FIELDS)
  // Mirror the planner's current seat visibility as the default.
  const [includeSeats, setIncludeSeats] = useState(
    () => useViewStore.getState().showSeats
  )
  const [seatsShowEmpty, setSeatsShowEmpty] = useState(true)
  // Mirror the planner's grid; outline on and fit-to-page off by default.
  const [includeGrid, setIncludeGrid] = useState(
    () => useViewStore.getState().gridStyle !== "off"
  )
  const [showHallOutline, setShowHallOutline] = useState(true)
  const [fitToContent, setFitToContent] = useState(false)

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
    <ResponsiveDialog
      open={dialog.opened === "Guests.Export.Pdf"}
      onOpenChange={(open) => {
        if (!open) dialog.close()
      }}
    >
      <ResponsiveDialogContent
        className="sm:max-w-md"
        aria-describedby={undefined}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("export.pdf.title")}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
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
          <Field orientation="horizontal">
            <FieldLabel htmlFor="include-seats">
              {t("export.pdf.include_seats")}
            </FieldLabel>
            <Switch
              id="include-seats"
              checked={includeSeats}
              onCheckedChange={setIncludeSeats}
            />
          </Field>
          {includeSeats && (
            <Field>
              <FieldContent className="flex-row flex-wrap gap-1.5">
                <Button
                  variant={seatsShowEmpty ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setSeatsShowEmpty(true)}
                >
                  {t("export.pdf.seats_all")}
                </Button>
                <Button
                  variant={!seatsShowEmpty ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setSeatsShowEmpty(false)}
                >
                  {t("export.pdf.seats_occupied")}
                </Button>
              </FieldContent>
            </Field>
          )}
          <Field orientation="horizontal">
            <FieldLabel htmlFor="include-grid">
              {t("export.pdf.include_grid")}
            </FieldLabel>
            <Switch
              id="include-grid"
              checked={includeGrid}
              onCheckedChange={setIncludeGrid}
            />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel htmlFor="show-hall-outline">
              {t("export.pdf.show_hall_outline")}
            </FieldLabel>
            <Switch
              id="show-hall-outline"
              checked={showHallOutline}
              onCheckedChange={setShowHallOutline}
            />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel htmlFor="fit-to-page">
              {t("export.pdf.fit_to_page")}
            </FieldLabel>
            <Switch
              id="fit-to-page"
              checked={fitToContent}
              onCheckedChange={setFitToContent}
            />
          </Field>
          <Button
            disabled={!canExport}
            onClick={() => {
              dialog.close()
              triggerPdfExport(orderedSelected, {
                includeSeats,
                seatsShowEmpty,
                includeGrid,
                showHallOutline,
                fitToContent,
              })
            }}
          >
            {t("export.pdf.download")}
          </Button>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
