import { useTranslation } from "react-i18next"

const PREVIEW_ROWS = 6

interface IProps {
  headers: Array<string>
  rows: Array<Array<string>>
}

// Raw preview of the uploaded sheet (first rows) shown while mapping columns,
// so the user can see which column holds what before committing.
export const GuestImportSheetPreview = ({ headers, rows }: IProps) => {
  const { t } = useTranslation()
  const previewRows = rows.slice(0, PREVIEW_ROWS)

  return (
    <div className="overflow-x-auto rounded-md border text-xs">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-2 py-1 text-left font-medium whitespace-nowrap"
              >
                {h || t("guests.import.col_unnamed", { i: i + 1 })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {previewRows.map((row, i) => (
            <tr key={i} className="border-b last:border-b-0">
              {headers.map((_, j) => (
                <td
                  key={j}
                  className="max-w-[12rem] truncate px-2 py-1 align-top"
                  title={row[j] ?? ""}
                >
                  {row[j] || <span className="text-muted-foreground">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > PREVIEW_ROWS && (
        <p className="px-2 py-1 text-center text-muted-foreground italic">
          {t("guests.import.preview_more", {
            count: rows.length - PREVIEW_ROWS,
          })}
        </p>
      )}
    </div>
  )
}
