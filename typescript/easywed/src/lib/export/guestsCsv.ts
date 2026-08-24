import type { TFunction } from "i18next"
import type { Guest } from "@/stores/planner.store"
import type { GuestSort } from "@/lib/export/guests"
import { useGlobalStore } from "@/stores/global.store"
import { useMenuStore } from "@/stores/menu.store"
import { usePlannerStore } from "@/stores/planner.store"
import {
  DEFAULT_GUEST_SORT,
  byGuestName,
  groupGuestsByTable,
} from "@/lib/export/guests"
import { downloadBlob } from "@/lib/export/downloadBlob"

/**
 * The columns an export may carry, in emitted order.
 *
 * `dish` is the per-guest menu choice, and adding it is **safe for
 * re-import**: `guestsImport` maps by column *index* over its own closed
 * `GUEST_IMPORT_FIELDS` list and ignores any header it does not recognise, so a
 * flat export with this column round-trips exactly as it did before, with the
 * dish simply dropped. Checked rather than assumed - it would have been a
 * silent regression, and "the file I exported yesterday no longer imports" is
 * about the worst bug this feature could have caused.
 */
export const GUEST_FIELDS = [
  "name",
  "table",
  "dietary",
  "dish",
  "note",
] as const
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

// Guard against CSV formula injection: any cell whose first character is one
// of =, +, -, @ (or a control char that tricks auto-detection) is treated as
// a formula by Excel/Sheets/Numbers. Prefixing with a tab forces it to be
// read as text without adding a visible character in most tools.
const CSV_INJECTION_LEAD = /^[=+\-@\t\r]/
const sanitizeCell = (value: string): string =>
  CSV_INJECTION_LEAD.test(value) ? `\t${value}` : value

// RFC 4180 quoting: wrap a cell in double quotes (escaping inner quotes) only
// when it contains a quote, comma or newline. Replaces papaparse's `unparse`
// for our one-row-at-a-time emit so we don't carry a CSV lib just for this.
const csvCell = (value: string): string =>
  /["\r\n,]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
const csvRow = (cells: Array<string>): string =>
  cells.map(sanitizeCell).map(csvCell).join(",")

// In grouped mode the "table" column is redundant - it's already carried by
// the section heading - so we drop it from the emitted columns.
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
  t: TFunction,
  sort: GuestSort = DEFAULT_GUEST_SORT
): { header: Array<string>; rows: Array<BuiltRow> } => {
  const active = effectiveFields(fields, formatMode)
  const { tables, guests } = usePlannerStore.getState()
  const tableNameById = new Map(tables.map((tbl) => [tbl.id, tbl.name]))
  // Read from the store the way `buildFilename` reads global.store: this module
  // is called from dialogs and from the print path, and threading the catalogue
  // through every caller would buy nothing.
  //
  // Unfiltered by `archived_at` on purpose - a dish the venue retired after
  // this couple ordered it still has to be named on their export. Empty for
  // every wedding with no venue, which is what makes the column blank rather
  // than broken in guest mode.
  const dishNameById = new Map(
    useMenuStore.getState().options.map((option) => [option.id, option.name])
  )
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
    if (f === "dish") {
      return g.menuOptionId ? (dishNameById.get(g.menuOptionId) ?? "") : ""
    }
    return g.note ?? ""
  }

  const toDataRow = (g: Guest): BuiltRow => ({
    kind: "data",
    cells: active.map((f) => cellFor(f, g)),
  })

  if (formatMode === "flat") {
    // Flat has no section headings, so "by seat" only means something once the
    // rows are grouped by table first: tables in natural order, seat order
    // within each, unassigned last. Columns are untouched either way, so a flat
    // export stays re-importable under both sorts.
    if (sort === "seat") {
      const { groups, unassigned } = groupGuestsByTable(tables, guests, "seat")
      const ordered = [...groups.flatMap((g) => g.guests), ...unassigned]
      return { header, rows: ordered.map(toDataRow) }
    }
    return { header, rows: [...guests].sort(byGuestName).map(toDataRow) }
  }

  const { groups, unassigned } = groupGuestsByTable(tables, guests, sort)
  const out: Array<BuiltRow> = []

  for (const { table: tbl, guests: tableGuests } of groups) {
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
  t: TFunction,
  sort: GuestSort = DEFAULT_GUEST_SORT
) => {
  const { header, rows } = buildRows(fields, formatMode, t, sort)
  if (header.length === 0) return

  // Flat: column header line + data rows.
  // Grouped: heading rows stay single-cell (no empty-column padding), and each
  // new section after the first is preceded by a blank line so spreadsheets
  // render a visual gap between tables.
  const emit = (cells: Array<string>) => csvRow(cells)

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
