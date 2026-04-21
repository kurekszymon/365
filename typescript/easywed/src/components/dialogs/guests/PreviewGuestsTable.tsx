import { useTranslation } from "react-i18next"
import type { FormatMode, GuestField } from "@/lib/export/guestsCsv"
import { buildRows, effectiveFields } from "@/lib/export/guestsCsv"

interface IProps {
  fields: Array<GuestField>
  formatMode: FormatMode
  previewRowLimit?: number
}
export const PreviewGuestsTable = ({
  fields,
  formatMode,
  previewRowLimit = 6,
}: IProps) => {
  const { t } = useTranslation()

  const active = effectiveFields(fields, formatMode)

  if (active.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
        {t("export.csv.preview_empty")}
      </p>
    )
  }

  const { header, rows } = buildRows(fields, formatMode, t)
  const previewRows = rows.slice(0, previewRowLimit)
  const colSpan = Math.max(header.length, 1)

  return (
    <div className="overflow-x-auto rounded-md border text-xs">
      <table className="w-full border-collapse">
        {formatMode === "flat" && (
          <thead>
            <tr className="border-b bg-muted/50">
              {header.map((h) => (
                <th
                  key={h}
                  className="px-2 py-1 text-left font-medium whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {previewRows.length === 0 ? (
            <tr>
              <td
                colSpan={colSpan}
                className="px-2 py-3 text-center text-muted-foreground italic"
              >
                {t("export.csv.preview_no_guests")}
              </td>
            </tr>
          ) : (
            previewRows.map((row, i) =>
              row.kind === "heading" ? (
                <tr key={i} className="border-b bg-muted/30">
                  <td
                    colSpan={colSpan}
                    className="px-2 py-1 font-semibold text-foreground"
                  >
                    {row.cells[0]}
                  </td>
                </tr>
              ) : (
                <tr key={i} className="border-b last:border-b-0">
                  {row.cells.map((cell, j) => (
                    <td
                      key={j}
                      className="max-w-[12rem] truncate px-2 py-1 align-top"
                      title={cell}
                    >
                      {cell || <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                </tr>
              )
            )
          )}
          {rows.length > previewRowLimit && (
            <tr>
              <td
                colSpan={colSpan}
                className="px-2 py-1 text-center text-muted-foreground italic"
              >
                {t("export.csv.preview_more", {
                  count: rows.length - previewRowLimit,
                })}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
