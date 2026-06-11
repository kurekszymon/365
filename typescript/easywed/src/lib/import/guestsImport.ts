import type { Dietary, Guest, Table } from "@/stores/planner.store"

// The columns we can map an imported spreadsheet onto. `name` is the only
// required one; the rest are optional and may stay unmapped.
export const GUEST_IMPORT_FIELDS = ["name", "table", "dietary", "note"] as const
export type GuestImportField = (typeof GUEST_IMPORT_FIELDS)[number]

// Column index in the parsed sheet that each field reads from, or `null` when
// the field is unmapped.
export type ColumnMapping = Record<GuestImportField, number | null>

export interface ParsedSheet {
  headers: Array<string>
  rows: Array<Array<string>>
}

// Mirrors the `Dietary` union so we can validate imported cells against it.
// Kept here (not imported from the store) so this module stays pure/testable.
const DIETARY_VALUES: ReadonlyArray<Dietary> = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "halal",
  "kosher",
]

// Lowercase, strip diacritics, collapse whitespace — so "Gość", "gosc" and
// "  GUEST " all compare equal. Used for both header detection and table
// name matching.
export const normalize = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    // Polish "ł" is a precomposed letter that NFD doesn't decompose, so map it
    // explicitly — otherwise "Stół" wouldn't match a header alias of "stol".
    .replace(/ł/gi, "l")
    .trim()
    .toLowerCase()

// Header aliases per field (english + polish). Compared after `normalize`, so
// list them without diacritics.
const HEADER_ALIASES: Record<GuestImportField, Array<string>> = {
  name: ["name", "guest", "full name", "imie", "imię", "gosc", "nazwisko"],
  table: ["table", "stol", "stół", "stolik"],
  dietary: ["dietary", "diet", "dieta", "preferencje", "dietary preferences"],
  note: ["note", "notes", "notatka", "uwagi", "comment", "komentarz"],
}

// Reads a CSV/XLSX File into a header row + data rows of trimmed strings.
// SheetJS is loaded lazily so it never enters the main bundle — the chunk only
// downloads when a user actually picks a file. `XLSX.read` autodetects the
// format, so the same path handles both `.csv` and `.xlsx`.
export const parseGuestFile = async (file: File): Promise<ParsedSheet> => {
  // SheetJS ships from its CDN as CommonJS. Depending on the bundler the API
  // lands either on the module namespace directly (Node/ESM) or under `default`
  // (Vite/esbuild CJS interop) — resolve whichever actually carries `read` so
  // this works in dev, prod and tests alike.
  const mod = await import("xlsx")
  const ns = mod as unknown as { read?: unknown; default: typeof mod }
  const XLSX = ns.read ? mod : ns.default
  const buf = await file.arrayBuffer()
  const workbook = XLSX.read(new Uint8Array(buf), { type: "array" })

  if (workbook.SheetNames.length === 0) return { headers: [], rows: [] }
  const sheet = workbook.Sheets[workbook.SheetNames[0]]

  const matrix = XLSX.utils.sheet_to_json<Array<unknown>>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  })

  const toCells = (row: Array<unknown>): Array<string> =>
    row.map((cell) => (cell == null ? "" : String(cell).trim()))

  if (matrix.length === 0) return { headers: [], rows: [] }
  const [headerRow, ...dataRows] = matrix
  return { headers: toCells(headerRow), rows: dataRows.map(toCells) }
}

// Guesses which column maps to each field from the header labels. Falls back to
// column 0 for `name` so the user always has a sensible starting point.
export const autoDetectMapping = (headers: Array<string>): ColumnMapping => {
  const normalized = headers.map(normalize)
  const find = (field: GuestImportField): number | null => {
    const aliases = HEADER_ALIASES[field]
    const idx = normalized.findIndex((h) => h !== "" && aliases.includes(h))
    return idx === -1 ? null : idx
  }

  const mapping: ColumnMapping = {
    name: find("name"),
    table: find("table"),
    dietary: find("dietary"),
    note: find("note"),
  }
  if (mapping.name === null && headers.length > 0) mapping.name = 0
  return mapping
}

// Splits a dietary cell on common separators and keeps only valid values.
// Unknown tokens are dropped silently rather than failing the whole import.
export const parseDietary = (cell: string): Array<Dietary> => {
  if (!cell) return []
  const seen = new Set<Dietary>()
  for (const part of cell.split(/[,;/]/)) {
    // Collapse internal whitespace to a hyphen so "gluten free" matches the
    // canonical "gluten-free" value (the only multi-word dietary tag).
    const token = normalize(part).replace(/\s+/g, "-")
    const match = DIETARY_VALUES.find((d) => d === token)
    if (match) seen.add(match)
  }
  return [...seen]
}

export interface BuildResult {
  guests: Array<Omit<Guest, "id">>
  skipped: number
  // How many guests matched a table by name but were left unassigned because
  // that table was already full (server enforces capacity, so we mirror it).
  overflowed: number
}

// Turns parsed rows + a column mapping into ready-to-insert guests. Table names
// are matched case/diacritic-insensitively against existing tables; unmatched
// (or unmapped) tables leave the guest unassigned. Rows with a blank name are
// skipped and counted so the UI can report them.
//
// `existingGuests` is the current guest list — needed to honour table capacity:
// the DB's `enforce_table_capacity` trigger rejects the whole batch if any table
// would overflow, so we count remaining seats (capacity minus already-seated
// minus what this import has already assigned) and bump the overflow to
// unassigned rather than failing the import.
export const buildGuests = (
  rows: Array<Array<string>>,
  mapping: ColumnMapping,
  tables: Array<Table>,
  existingGuests: Array<Guest> = []
): BuildResult => {
  const tableIdByName = new Map(tables.map((t) => [normalize(t.name), t.id]))

  // Seats still free per table id, decremented as we assign within this batch.
  const remainingSeats = new Map<string, number>()
  const seatedByTableId = new Map<string, number>()
  for (const g of existingGuests) {
    if (!g.tableId) continue
    seatedByTableId.set(g.tableId, (seatedByTableId.get(g.tableId) ?? 0) + 1)
  }
  for (const table of tables) {
    const seated = seatedByTableId.get(table.id) ?? 0
    remainingSeats.set(table.id, Math.max(0, table.capacity - seated))
  }

  const cell = (row: Array<string>, col: number | null): string =>
    col === null ? "" : (row[col] ?? "")

  const guests: Array<Omit<Guest, "id">> = []
  let skipped = 0
  let overflowed = 0

  for (const row of rows) {
    const name = cell(row, mapping.name).trim()
    if (!name) {
      skipped++
      continue
    }

    const tableName = cell(row, mapping.table).trim()
    const matchedTableId = tableName
      ? (tableIdByName.get(normalize(tableName)) ?? null)
      : null

    // Honour capacity: only seat the guest if the matched table has room left,
    // otherwise fall back to unassigned and count it as an overflow.
    let tableId: string | null = null
    if (matchedTableId !== null) {
      const free = remainingSeats.get(matchedTableId) ?? 0
      if (free > 0) {
        tableId = matchedTableId
        remainingSeats.set(matchedTableId, free - 1)
      } else {
        overflowed++
      }
    }

    const note = cell(row, mapping.note).trim()

    guests.push({
      name,
      tableId,
      dietary: parseDietary(cell(row, mapping.dietary)),
      ...(note ? { note } : {}),
    })
  }

  return { guests, skipped, overflowed }
}
