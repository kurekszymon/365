import { useTranslation } from "react-i18next"
import type { ColumnMapping } from "@/lib/import/guestsImport"
import type { Guest } from "@/stores/planner.store"
import { usePlannerStore } from "@/stores/planner.store"

const PREVIEW_ROWS = 6

interface IProps {
  mapping: ColumnMapping
  guests: Array<Omit<Guest, "id">>
}

// Preview of the normalized guests that will actually be created, resolving
// table names and dietary tags exactly as they'll be stored.
export const GuestImportResultPreview = ({ mapping, guests }: IProps) => {
  const { t } = useTranslation()
  const tables = usePlannerStore((s) => s.tables)
  const tableNameById = new Map(tables.map((tbl) => [tbl.id, tbl.name]))
  const previewGuests = guests.slice(0, PREVIEW_ROWS)
  const showTable = mapping.table !== null
  const showDietary = mapping.dietary !== null
  const showNote = mapping.note !== null

  return (
    <div className="overflow-x-auto rounded-md border text-xs">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-2 py-1 text-left font-medium">
              {t("guests.import.col.name")}
            </th>
            {showTable && (
              <th className="px-2 py-1 text-left font-medium">
                {t("guests.import.col.table")}
              </th>
            )}
            {showDietary && (
              <th className="px-2 py-1 text-left font-medium">
                {t("guests.import.col.dietary")}
              </th>
            )}
            {showNote && (
              <th className="px-2 py-1 text-left font-medium">
                {t("guests.import.col.note")}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {previewGuests.map((g, i) => (
            <tr key={i} className="border-b last:border-b-0">
              <td className="max-w-[12rem] truncate px-2 py-1">{g.name}</td>
              {showTable && (
                <td className="px-2 py-1">
                  {g.tableId ? (
                    tableNameById.get(g.tableId)
                  ) : (
                    <span className="text-muted-foreground">
                      {t("guests.unassigned")}
                    </span>
                  )}
                </td>
              )}
              {showDietary && (
                <td className="px-2 py-1">
                  {g.dietary.length > 0 ? (
                    g.dietary.join(", ")
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              )}
              {showNote && (
                <td className="max-w-[12rem] truncate px-2 py-1" title={g.note}>
                  {g.note || <span className="text-muted-foreground">—</span>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {guests.length > PREVIEW_ROWS && (
        <p className="px-2 py-1 text-center text-muted-foreground italic">
          {t("guests.import.preview_more", {
            count: guests.length - PREVIEW_ROWS,
          })}
        </p>
      )}
    </div>
  )
}
