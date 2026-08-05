export type GuestSpec = {
  name: string;
  diet?: "Vegetarian" | "Vegan" | "Gluten-free";
  table: string;
};

export const GUESTS: GuestSpec[] = [
  { name: "Anna Kowalska", table: "Head table" },
  { name: "Piotr Nowak", table: "Head table" },
  { name: "Maria Wiśniewska", diet: "Vegetarian", table: "Table 1" },
  { name: "Tomasz Lewandowski", table: "Table 1" },
  { name: "Zofia Wójcik", diet: "Gluten-free", table: "Table 2" },
  { name: "Jakub Kamiński", table: "Table 3" },
  { name: "Julia Zielińska", diet: "Vegan", table: "Table 3" },
  { name: "Michał Dąbrowski", table: "Table 4" },
  { name: "Hanna Mazur", diet: "Vegetarian", table: "Table 5" },
];

/** The venue line comes from the active `HallLayout` (name + metres). */
export const WEDDING = {
  couple: "Anna & Piotr",
  date: "12 September 2026",
};
