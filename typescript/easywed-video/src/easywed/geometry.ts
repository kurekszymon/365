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

  // `computeSeatPositions` seats the two longer edges: top then bottom, or -
  // for a table standing taller than it is wide, as a rotated one does - left
  // then right, each run top to bottom. Every published film's rectangle is wide.
  const horizontal = table.width >= table.height;
  const perSide = Math.ceil(table.seats / 2);
  const edge = horizontal ? table.width : table.height;
  const offset = (horizontal ? table.height : table.width) / 2 + SEAT_GAP + SEAT_RADIUS;
  return range(table.seats).map((i) => {
    const first = i < perSide;
    const indexOnSide = first ? i : i - perSide;
    const countOnSide = first ? perSide : table.seats - perSide;
    const along = -edge / 2 + (edge / (countOnSide + 1)) * (indexOnSide + 1);
    const across = first ? -offset : offset;
    return horizontal ? { x: table.x + along, y: table.y + across } : { x: table.x + across, y: table.y + along };
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

/**
 * `verticesForHallPreset(preset, size)` from the app's `src/lib/geometry.ts`,
 * for the one polygon preset a film uses so far: the L, with the top-right
 * quarter cut out, spanning the hall's bounding box exactly. In canvas units
 * rather than metres - the proportions are the same.
 */
export const lShapeVertices = (canvas: { width: number; height: number }): Point[] => {
  const w = canvas.width;
  const h = canvas.height;
  return [
    { x: 0, y: 0 },
    { x: w * 0.5, y: 0 },
    { x: w * 0.5, y: h * 0.5 },
    { x: w, y: h * 0.5 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
};

/** An SVG `points` attribute for a polygon - `polygonPoints` in the app. */
export const polygonPoints = (vertices: Point[]): string =>
  vertices.map((v) => `${v.x},${v.y}`).join(" ");
