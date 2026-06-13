import { useTranslation } from "react-i18next"
import type { PreviewRow } from "@/components/ui/preview-table"
import { PreviewTable } from "@/components/ui/preview-table"

interface IProps {
  headers: Array<string>
  rows: Array<Array<string>>
}

export const GuestImportSheetPreview = ({ headers, rows }: IProps) => {
  const { t } = useTranslation()

  const namedHeaders = headers.map(
    (h, i) => h || t("guests.import.col_unnamed", { i: i + 1 })
  )

  const previewRows: Array<PreviewRow> = rows.map((row) => ({
    cells: headers.map(
      (_, j) => row[j] ?? <span className="text-muted-foreground">—</span>
    ),
    titles: headers.map((_, j) => row[j] ?? ""),
  }))

  return <PreviewTable headers={namedHeaders} rows={previewRows} />
}
