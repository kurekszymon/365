import { useTranslation } from "react-i18next"
import type { ColumnMapping } from "@/lib/import/guestsImport"
import type { Guest } from "@/stores/planner.store"
import type { PreviewRow } from "@/components/ui/preview-table"
import { usePlannerStore } from "@/stores/planner.store"
import { PreviewTable } from "@/components/ui/preview-table"

interface IProps {
  mapping: ColumnMapping
  guests: Array<Omit<Guest, "id">>
}

export const GuestImportResultPreview = ({ mapping, guests }: IProps) => {
  const { t } = useTranslation()
  const tables = usePlannerStore((s) => s.tables)
  const tableNameById = new Map(tables.map((tbl) => [tbl.id, tbl.name]))

  const showTable = mapping.table !== null
  const showDietary = mapping.dietary !== null
  const showNote = mapping.note !== null

  const headers = [
    t("guests.import.col.name"),
    ...(showTable ? [t("guests.import.col.table")] : []),
    ...(showDietary ? [t("guests.import.col.dietary")] : []),
    ...(showNote ? [t("guests.import.col.note")] : []),
  ]

  const rows: Array<PreviewRow> = guests.map((g) => {
    const resolvedTable =
      g.tableId && tableNameById.has(g.tableId)
        ? tableNameById.get(g.tableId)!
        : null
    const dietaryText = g.dietary.length > 0 ? g.dietary.join(", ") : null

    return {
      cells: [
        g.name,
        ...(showTable
          ? [
              resolvedTable ?? (
                <span className="text-muted-foreground">
                  {t("guests.unassigned")}
                </span>
              ),
            ]
          : []),
        ...(showDietary
          ? [dietaryText ?? <span className="text-muted-foreground">—</span>]
          : []),
        ...(showNote
          ? [g.note || <span className="text-muted-foreground">—</span>]
          : []),
      ],
      titles: [
        g.name,
        ...(showTable ? [resolvedTable ?? ""] : []),
        ...(showDietary ? [dietaryText ?? ""] : []),
        ...(showNote ? [g.note ?? ""] : []),
      ],
    }
  })

  return <PreviewTable headers={headers} rows={rows} />
}
