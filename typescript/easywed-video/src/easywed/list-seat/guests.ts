import { rosterFor, type RosterGuest } from "../data";
import { tl } from "../i18n";
import type { HallLayout } from "../layouts";

/** The cousin who is coming after all, and the family's table. */
export const LATE_GUEST = "Tomasz Lis";
export const FAMILY_TABLE = 5;

/**
 * Who already sits at Stół 5, by seat number: the Wronas, the Nowiccy, and
 * Tomek's uncle Marek and cousin Zuzanna with the free chair between them.
 * They were seated from the canvas's seat markers, which pin a guest to a chair
 * (`seatId`), so `resolveSeatOccupants` leaves seat 6 empty rather than
 * closing the gap. New names - `data.ts`'s roster is spent.
 */
export const FAMILY: { name: string; seat: number }[] = [
  { name: "Adam Wrona", seat: 1 },
  { name: "Beata Wrona", seat: 2 },
  { name: "Paweł Nowicki", seat: 3 },
  { name: "Karolina Nowicka", seat: 4 },
  { name: "Marek Lis", seat: 5 },
  { name: "Zuzanna Lis", seat: 7 },
  { name: "Ewa Lis", seat: 8 },
];

/** The one chair at Stół 5 nobody holds, numbered from 1 as the sheet numbers it - Tomek's. */
export const FREE_SEAT =
  Array.from({ length: FAMILY.length + 1 }, (_, i) => i + 1).find((n) => !FAMILY.some((member) => member.seat === n)) ?? 0;

/**
 * This wedding's guest list: `rosterFor` on every other table, the family at
 * Stół 5, and Tomek last - the store appends a guest, so the one just written
 * in sits at the bottom of the list. Seated or not, it comes to the hall's 58.
 * Kept here, not in `data.ts`, for the reason `kids-count/guests.ts` gives.
 */
export const guestListFor = (hall: HallLayout, seated: boolean): RosterGuest[] => {
  const label = tl.hall.table(FAMILY_TABLE);
  const table = hall.tables.find((t) => t.label === label);
  if (!table || table.seats !== FAMILY.length + 1) {
    throw new Error(`${label} must seat the family and Tomek - ${FAMILY.length + 1} chairs`);
  }
  return [
    ...rosterFor(hall.tables.filter((t) => t !== table)),
    ...FAMILY.map((member) => ({ name: member.name, table: label })),
    { name: LATE_GUEST, table: seated ? label : "" },
  ];
};

/** Stół 5's chairs in order, each with its occupant's name or `null` - what the sheet's seat grid draws. */
export const familySeats = (hall: HallLayout): (string | null)[] => {
  const seats = hall.tables.find((t) => t.label === tl.hall.table(FAMILY_TABLE))?.seats ?? 0;
  return Array.from({ length: seats }, (_, i) => FAMILY.find((member) => member.seat === i + 1)?.name ?? null);
};
