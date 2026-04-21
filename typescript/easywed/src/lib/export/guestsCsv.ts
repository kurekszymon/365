import Papa from "papaparse"
import type { TFunction } from "i18next"
import type { Guest } from "@/stores/planner.store"
import { useGlobalStore } from "@/stores/global.store"
import { usePlannerStore } from "@/stores/planner.store"

export const GUEST_FIELDS = ["name", "table", "dietary", "note"] as const
export type GuestField = (typeof GUEST_FIELDS)[number]

export const FORMAT_MODES = ["flat", "grouped"] as const
export type FormatMode = (typeof FORMAT_MODES)[number]

const buildFilename = () => {
  const { name, date } = useGlobalStore.getState()
  const iso = (date ?? new Date()).toISOString().slice(0, 10)
  // Only strip characters that filesystems actually reject. Unicode is fine.
  const safe = (name ?? "").replace(/[/\\?%*:|"<>]/g, "-").trim()
  return `${safe || "easywed"}-guests-${iso}.csv`
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    // Defer teardown so the browser has time to kick off the download request
    // before the object URL is invalidated.
    a.remove()
    URL.revokeObjectURL(url)
  }, 100)
}

// Guard against CSV formula injection: any cell whose first character is one
// of =, +, -, @ (or a control char that tricks auto-detection) is treated as
// a formula by Excel/Sheets/Numbers. Prefixing with a tab forces it to be
// read as text without adding a visible character in most tools.
const CSV_INJECTION_LEAD = /^[=+\-@\t\r]/
const sanitizeCell = (value: string): string =>
  CSV_INJECTION_LEAD.test(value) ? `\t${value}` : value

// In grouped mode the "table" column is redundant — it's already carried by
// the section heading — so we drop it from the emitted columns.
export const effectiveFields = (
  fields: Array<GuestField>,
  formatMode: FormatMode
): Array<GuestField> =>
  GUEST_FIELDS.filter(
    (f) => fields.includes(f) && !(formatMode === "grouped" && f === "table")
  )

export interface BuiltRow {
  kind: "heading" | "data"
  cells: Array<string>
}

export const buildRows = (
  fields: Array<GuestField>,
  formatMode: FormatMode,
  t: TFunction
): { header: Array<string>; rows: Array<BuiltRow> } => {
  const active = effectiveFields(fields, formatMode)
  const { tables, guests } = usePlannerStore.getState()
  const tableNameById = new Map(tables.map((tbl) => [tbl.id, tbl.name]))
  const unassignedLabel = t("export.unassigned")

  const header = active.map((f) => t(`export.col.${f}`))

  const cellFor = (f: GuestField, g: Guest): string => {
    if (f === "name") return g.name
    if (f === "table") {
      return g.tableId
        ? (tableNameById.get(g.tableId) ?? unassignedLabel)
        : unassignedLabel
    }
    if (f === "dietary") return g.dietary.join(", ")
    return g.note ?? ""
  }

  const toDataRow = (g: Guest): BuiltRow => ({
    kind: "data",
    cells: active.map((f) => cellFor(f, g)),
  })

  const byName = (a: Guest, b: Guest) => a.name.localeCompare(b.name)

  if (formatMode === "flat") {
    return { header, rows: [...guests].sort(byName).map(toDataRow) }
  }

  const out: Array<BuiltRow> = []
  const sortedTables = [...tables].sort((a, b) => a.name.localeCompare(b.name))
  for (const tbl of sortedTables) {
    const tableGuests = guests.filter((g) => g.tableId === tbl.id).sort(byName)
    out.push({
      kind: "heading",
      cells: [
        t("export.csv.section.table", {
          name: tbl.name,
          seated: tableGuests.length,
          capacity: tbl.capacity,
        }),
      ],
    })
    for (const g of tableGuests) out.push(toDataRow(g))
  }
  const unassigned = guests.filter((g) => !g.tableId).sort(byName)
  if (unassigned.length > 0) {
    out.push({
      kind: "heading",
      cells: [
        t("export.csv.section.unassigned", {
          label: unassignedLabel,
          count: unassigned.length,
        }),
      ],
    })
    for (const g of unassigned) out.push(toDataRow(g))
  }

  return { header, rows: out }
}

export const exportGuestsCsv = (
  fields: Array<GuestField>,
  formatMode: FormatMode,
  t: TFunction
) => {
  const { header, rows } = buildRows(fields, formatMode, t)
  if (header.length === 0) return

  // Flat: column header line + data rows.
  // Grouped: heading rows stay single-cell (no empty-column padding), and each
  // new section after the first is preceded by a blank line so spreadsheets
  // render a visual gap between tables.
  const emit = (cells: Array<string>) => Papa.unparse([cells.map(sanitizeCell)])

  const lines: Array<string> = []
  if (formatMode === "flat") lines.push(emit(header))

  let seenHeading = false
  for (const r of rows) {
    if (r.kind === "heading") {
      if (seenHeading) lines.push("")
      seenHeading = true
    }
    lines.push(emit(r.cells))
  }

  const csv = lines.join("\r\n")
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" })
  downloadBlob(blob, buildFilename())
}
