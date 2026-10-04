import type { ColumnMapping } from "../components/ImportDialog";
import { rosterFor, type RosterGuest } from "../data";
import { tl } from "../i18n";
import type { HallLayout } from "../layouts";

/** The file the couple drags in. */
export const FILE_NAME = tl.import.fileName;

/**
 * The spreadsheet's header row. Each one is an alias `autoDetectMapping`
 * (`lib/import/guestsImport.ts`) already recognises once `normalize` strips the
 * diacritics - "Gość" -> "gosc", "Stół" -> "stol" - so the wizard maps all four
 * fields on its own, as it would with this file.
 */
export const SHEET_HEADERS = tl.import.sheetHeaders;

export const SHEET_MAPPING: ColumnMapping = { name: 0, table: 1, dietary: 2, note: 3 };

/**
 * The guest list as the file holds it - one row per seat in the hall, so the
 * import comes to exactly `hall.totalSeats` and every row's table exists.
 */
export const sheetFor = (hall: HallLayout): { guests: RosterGuest[]; rows: string[][] } => {
  const guests = rosterFor(hall.tables);
  return {
    guests,
    rows: guests.map((guest) => [guest.name, guest.table, guest.diet ? tl.diet[guest.diet] : "", guest.note ?? ""]),
  };
};
