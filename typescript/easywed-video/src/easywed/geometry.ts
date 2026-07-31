import type { TableSpec } from "./layouts";

export type Point = { x: number; y: number };

export const SEAT_RADIUS = 11;
const SEAT_GAP = 15;

export const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

/** Seat centers for a table, in canvas coordinates - matching the app's layout. */
export const seatPositions = (table: TableSpec): Point[] => {
  if (table.shape === "round") {
    const radius = table.width / 2 + SEAT_GAP + SEAT_RADIUS;
    return range(table.seats).map((i) => {
      const angle = (i / table.seats) * Math.PI * 2 - Math.PI / 2;
      return {
        x: table.x + Math.cos(angle) * radius,
        y: table.y + Math.sin(angle) * radius,
      };
    });
  }

  const perSide = Math.ceil(table.seats / 2);
  const offset = table.height / 2 + SEAT_GAP + SEAT_RADIUS;
  return range(table.seats).map((i) => {
    const top = i < perSide;
    const indexOnSide = top ? i : i - perSide;
    const countOnSide = top ? perSide : table.seats - perSide;
    const step = table.width / (countOnSide + 1);
    return {
      x: table.x - table.width / 2 + step * (indexOnSide + 1),
      y: table.y + (top ? -offset : offset),
    };
  });
};

/** All seats of all tables, flattened in table order. */
export const allSeats = (tables: TableSpec[]): Point[] => {
  const out: Point[] = [];
  tables.forEach((table) => {
    seatPositions(table).forEach((seat) => out.push(seat));
  });
  return out;
};
