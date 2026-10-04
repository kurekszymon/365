import { GUESTS, rosterFor, type RosterGuest } from "../data";
import type { DietKey } from "../i18n";
import type { HallLayout } from "../layouts";

/**
 * Diets on the guests `rosterFor` generates, by their index in generation
 * order - on top of the four `GUESTS` already carry, so the list comes to 14
 * diets in 58 (7 Wege, 4 Vegan, 3 Bez glutenu) and every table has a few.
 * Kept here rather than in `data.ts`: the import cut's sheet is published with
 * the roster as it is.
 */
const EXTRA_DIETS: Record<number, DietKey> = {
  0: "vegetarian", // Łukasz Sikora, Stół pary młodej
  2: "vegan", // Grzegorz Górski, Stół pary młodej
  4: "vegetarian", // Mikołaj Pawłowski, Stół pary młodej
  7: "glutenFree", // Jadwiga Król, Stół pary młodej
  12: "vegetarian", // Grzegorz Michalak, Stół 1
  19: "vegan", // Urszula Kałużna, Stół 2
  25: "vegetarian", // Agnieszka Szczęsna, Stół 3
  31: "glutenFree", // Żaneta Wróblewska, Stół 4
  38: "vegan", // Przemysław Jabłoński, Stół 5
  44: "vegetarian", // Mikołaj Sikora, Stół 6
};

/**
 * The wedding's guest list in the order the import left it - the same 58
 * people the import cut reads in, one per seat, so every table is full - with
 * the diets the couple has typed in since.
 */
export const guestListFor = (hall: HallLayout): RosterGuest[] => {
  let generated = -1;
  return rosterFor(hall.tables).map((guest) => {
    if (GUESTS.includes(guest)) return guest;
    generated++;
    const diet = EXTRA_DIETS[generated];
    return diet ? { ...guest, diet } : guest;
  });
};
