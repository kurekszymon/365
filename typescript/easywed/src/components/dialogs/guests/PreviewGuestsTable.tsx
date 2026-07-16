import { useTranslation } from "react-i18next"
import type { FormatMode, GuestField } from "@/lib/export/guestsCsv"
import type { GuestSort } from "@/lib/export/guests"
import type { PreviewRow } from "@/components/ui/preview-table"
import { DEFAULT_GUEST_SORT } from "@/lib/export/guests"
import { buildRows, effectiveFields } from "@/lib/export/guestsCsv"
import { PreviewTable } from "@/components/ui/preview-table"

interface IProps {
  fields: Array<GuestField>
  formatMode: FormatMode
  sort?: GuestSort
  previewRowLimit?: number
}

export const PreviewGuestsTable = ({
  fields,
  formatMode,
  sort = DEFAULT_GUEST_SORT,
  previewRowLimit = 6,
}: IProps) => {
  const { t } = useTranslation()

  const active = effectiveFields(fields, formatMode)
  const { header, rows } = buildRows(fields, formatMode, t, sort)

  if (active.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
        {t("export.csv.preview_empty")}
      </p>
    )
  }

  const previewRows: Array<PreviewRow> = rows.map((row) => ({
    kind: row.kind,
    cells:
      row.kind === "heading"
        ? row.cells
        : row.cells.map(
            (cell) => cell || <span className="text-muted-foreground">—</span>
          ),
    titles: row.kind === "data" ? row.cells : undefined,
  }))

  return (
    <PreviewTable
      headers={formatMode === "flat" ? header : []}
      rows={previewRows}
      initial={previewRowLimit}
      emptyState={t("export.csv.preview_no_guests")}
    />
  )
}
