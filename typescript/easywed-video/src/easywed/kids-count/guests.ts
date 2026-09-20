import { GUESTS, rosterFor, type RosterGuest } from "../data";
import { tl } from "../i18n";
import type { HallLayout } from "../layouts";

/**
 * The five children on this wedding's list. They take the seats `rosterFor`
 * would have filled with generated adults rather than being added to it, so the
 * list stays at the hall's 58 and every other film's counts still agree.
 *
 * Each one is placed by the table it sits at and its position among that
 * table's generated seats, rather than by a global index: both halls order
 * their tables the same way, and this survives a hall whose tables change.
 * Kept here, not in `data.ts`, for the same reason the report cut's diets are -
 * the import cut's sheet is published with the roster as it shipped.
 *
 * `ageGroup` holds the app's stored value: the `AGE_GROUP_PRESETS` key for a
 * preset, and the typed text for a bracket the couple invented ("6-12").
 */
const KIDS: { name: string; ageGroup: string; table: number; nth: number }[] = [
  { name: "Staś Mazur", ageGroup: "0-3", table: 5, nth: 0 },
  { name: "Lena Mazur", ageGroup: "3-6", table: 5, nth: 1 },
  { name: "Antek Sikora", ageGroup: "3-6", table: 5, nth: 2 },
  { name: "Kuba Król", ageGroup: "6-12", table: 6, nth: 0 },
  { name: "Ola Król", ageGroup: "6-12", table: 6, nth: 1 },
];

/** The two brackets typed into the form on camera, in the order the film types them. */
export const TAGGED_ON_CAMERA = [KIDS[0], KIDS[3]] as const;

/**
 * This wedding's guest list before anyone has typed a diet: 58 names, five of
 * them children. The diets `GUESTS` carries are dropped, so the only badge on
 * screen is the age bracket this film is about.
 */
export const guestListFor = (hall: HallLayout): RosterGuest[] => {
  const generatedAt = new Map<string, number>();
  return rosterFor(hall.tables).map((guest) => {
    const adult: RosterGuest = { name: guest.name, table: guest.table, note: guest.note };
    if (GUESTS.includes(guest)) return adult;
    const nth = generatedAt.get(guest.table) ?? 0;
    generatedAt.set(guest.table, nth + 1);
    const kid = KIDS.find((entry) => tl.hall.table(entry.table) === guest.table && entry.nth === nth);
    return kid ? { ...adult, name: kid.name, ageGroup: kid.ageGroup } : adult;
  });
};

/** Row index of a guest by name, for the cursor to aim at. */
export const rowOf = (guests: RosterGuest[], name: string): number =>
  guests.findIndex((guest) => guest.name === name);
