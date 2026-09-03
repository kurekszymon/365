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

/** The venue line comes from the active `HallLayout` (name + metres). */
export const WEDDING = {
  couple: "Anna & Piotr",
  date: "12 września 2026",
};
