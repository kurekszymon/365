import type { TableSpec } from "./layouts";

export type GuestSpec = {
  name: string;
  /** The app's own diet tags (`guests.dietary.*`). */
  diet?: "Wege" | "Vegan" | "Bez glutenu";
  table: string;
};

export const GUESTS: GuestSpec[] = [
  { name: "Anna Kowalska", table: "Stół pary młodej" },
  { name: "Piotr Nowak", table: "Stół pary młodej" },
  { name: "Maria Wiśniewska", diet: "Wege", table: "Stół 1" },
  { name: "Tomasz Lewandowski", table: "Stół 1" },
  { name: "Zofia Wójcik", diet: "Bez glutenu", table: "Stół 2" },
  { name: "Jakub Kamiński", table: "Stół 3" },
  { name: "Julia Zielińska", diet: "Vegan", table: "Stół 3" },
  { name: "Michał Dąbrowski", table: "Stół 4" },
  { name: "Hanna Mazur", diet: "Wege", table: "Stół 5" },
];

/** A row of the guest list the import film reads in. */
export type RosterGuest = GuestSpec & { note?: string };

/**
 * First names for the seats `GUESTS` doesn't fill, alternating so every table
 * mixes both. The first two carry Ł and Ż on purpose - an import preview shows
 * its first rows, and those are the letters a broken import mangles.
 */
const FIRST_NAMES = [
  { name: "Łukasz", female: false },
  { name: "Żaneta", female: true },
  { name: "Grzegorz", female: false },
  { name: "Małgorzata", female: true },
  { name: "Mikołaj", female: false },
  { name: "Agnieszka", female: true },
  { name: "Paweł", female: false },
  { name: "Jadwiga", female: true },
  { name: "Przemysław", female: false },
  { name: "Urszula", female: true },
];

/** Surnames as [masculine, feminine]. Eleven against ten first names, so no pairing repeats. */
const SURNAMES: [string, string][] = [
  ["Wróblewski", "Wróblewska"],
  ["Żak", "Żak"],
  ["Szczęsny", "Szczęsna"],
  ["Sikora", "Sikora"],
  ["Kałużny", "Kałużna"],
  ["Jabłoński", "Jabłońska"],
  ["Górski", "Górska"],
  ["Śliwiński", "Śliwińska"],
  ["Król", "Król"],
  ["Pawłowski", "Pawłowska"],
  ["Michalak", "Michalak"],
];

/** The odd note a real list carries - logistics, never the reason for a diet. */
const NOTES: Record<number, string> = { 5: "dojedzie po ślubie", 12: "krzesełko dla dziecka" };

const generatedGuest = (i: number, table: string): RosterGuest => {
  const first = FIRST_NAMES[i % FIRST_NAMES.length];
  const [masculine, feminine] = SURNAMES[(i * 7 + 3) % SURNAMES.length];
  return { name: `${first.name} ${first.female ? feminine : masculine}`, table, note: NOTES[i] };
};

/**
 * A whole guest list for a hall: `GUESTS` at their own tables and a generated
 * name on every other seat, so the list comes to exactly the hall's seat count
 * and every row names a table the hall has. Rows alternate between the two
 * rather than running table by table.
 */
export const rosterFor = (tables: Pick<TableSpec, "label" | "seats">[]): RosterGuest[] => {
  const named: RosterGuest[] = [];
  const generated: RosterGuest[] = [];
  tables.forEach((table) => {
    const own = GUESTS.filter((guest) => guest.table === table.label).slice(0, table.seats);
    named.push(...own);
    for (let seat = own.length; seat < table.seats; seat++) {
      generated.push(generatedGuest(generated.length, table.label));
    }
  });

  const rows: RosterGuest[] = [];
  for (let i = 0; i < Math.max(named.length, generated.length); i++) {
    if (named[i]) rows.push(named[i]);
    if (generated[i]) rows.push(generated[i]);
  }
  return rows;
};

/** The venue line comes from the active `HallLayout` (name + metres). */
export const WEDDING = {
  couple: "Anna & Piotr",
  date: "12 września 2026",
  /** The same day as a date, for the printed report's "Data ślubu". */
  day: new Date(2026, 8, 12),
  /** When the report is printed - the week before, as a couple would hand it on. */
  printedOn: new Date(2026, 8, 5),
};
