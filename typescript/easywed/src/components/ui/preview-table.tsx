import type { ReactNode } from "react"
import { useExpandableRows } from "@/hooks/useExpandableRows"
import { ShowMoreButton } from "@/components/ui/show-more-button"
import { cn } from "@/lib/utils"

export interface PreviewRow {
  kind?: "heading" | "data"
  cells: ReactNode[]
  titles?: string[]
}

interface PreviewTableProps {
  headers: string[]
  rows: PreviewRow[]
  initial?: number
  emptyState?: ReactNode
}

export const PreviewTable = ({
  headers,
  rows,
  initial = 6,
  emptyState,
}: PreviewTableProps) => {
  const { visible, remaining, isExpanded, showAll } = useExpandableRows(
    rows,
    initial
  )
  const colSpan = Math.max(headers.length, 1)

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-md border text-xs",
        isExpanded && "max-h-60 overflow-y-auto"
      )}
    >
      <table className="w-full border-collapse">
        {headers.length > 0 && (
          <thead className={cn(isExpanded && "sticky top-0")}>
            <tr className="border-b bg-muted/50">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-2 py-1 text-left font-medium whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {visible.length === 0 && emptyState ? (
            <tr>
              <td
                colSpan={colSpan}
                className="px-2 py-3 text-center text-muted-foreground italic"
              >
                {emptyState}
              </td>
            </tr>
          ) : (
            visible.map((row, i) =>
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
                      title={row.titles?.[j]}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              )
            )
          )}
          {remaining > 0 && (
            <tr>
              <td colSpan={colSpan} className="p-0">
                <ShowMoreButton count={remaining} onClick={showAll} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
