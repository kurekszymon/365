import { Easing, interpolate } from "remotion";
import { previewOf, initialsOf, type FormState } from "../../chill-wed/table-shape/shape";
import { rosterFor } from "../../data";
import { tl } from "../../i18n";
import { CIOCIE_HALL, PX_PER_M, type TableSpec } from "../../layouts";
import { CIOCIE_PASS, CLEAR_EVERY, JUMP, PINCH, SINGLE_PASS, type Pass } from "./script";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const HALL = CIOCIE_HALL;

const tableOf = (n: number): TableSpec => {
  const table = HALL.tables.find((t) => t.label === tl.hall.table(n));
  if (!table || table.shape !== "round") throw new Error(`${tl.hall.table(n)} must be a round table`);
  return table;
};

/**
 * The two tables the couple renames: Stół 2 top right and Stół 5 bottom left,
 * the dance floor between them. Renaming moves nobody - a guest holds its
 * table by `tableId`, not by name.
 */
export const RENAMES = [
  { table: tableOf(2), to: tl.ciocie.singles, pass: SINGLE_PASS },
  { table: tableOf(5), to: tl.ciocie.aunts, pass: CIOCIE_PASS },
] as const;

/** The wedding's guest list on this room: `rosterFor`, 58 names, each at a table. */
export const GUEST_LIST = rosterFor(HALL.tables);

/** Each table's guests in list order, which is the order `resolveSeatOccupants` fills its chairs. */
export const guestsAt = (label: string) => GUEST_LIST.filter((guest) => guest.table === label).map((guest) => guest.name);

/**
 * What the name field holds at `frame` through a pass: the old name, going one
 * character at a time from the end, then the new one, typed one at a time.
 */
export const fieldAt = (frame: number, from: string, to: string, pass: Pass): string => {
  if (frame < pass.clearFrom) return from;
  if (frame < pass.typeFrom) {
    const gone = Math.floor((frame - pass.clearFrom) / CLEAR_EVERY) + 1;
    return from.slice(0, Math.max(0, from.length - gone));
  }
  const typed = Math.floor((frame - pass.typeFrom) / pass.every) + 1;
  return to.slice(0, Math.min(to.length, typed));
};

/**
 * Every table's name on the canvas at `frame`. The form applies each change as
 * it is typed (`applyToStore` → `updateTable`, the name trimmed), and a table
 * whose name is empty draws only its count (`TableVisual`'s `hasName`).
 */
export const canvasNamesAt = (frame: number): string[] =>
  HALL.tables.map((table) => {
    const rename = RENAMES.find((r) => r.table.id === table.id);
    return rename ? fieldAt(frame, table.label, rename.to, rename.pass).trim() : table.label;
  });

/** Which pass the cut is in at `frame`: the first until the jump, the second after it. */
export const passAt = (frame: number) => (frame < JUMP ? RENAMES[0] : RENAMES[1]);

/** The selected table at `frame`, if any - from its tap (or the jump) until the form's check. */
export const selectedAt = (frame: number): TableSpec | undefined => {
  const { table, pass } = passAt(frame);
  const from = pass.tapTable ?? JUMP;
  return frame >= from && frame < pass.tapDone ? table : undefined;
};

/** The form's fields for a round Ø 1.8 m table - the shape and size never change here. */
const DIAMETER = String(RENAMES[0].table.width / PX_PER_M);
export const FORM: FormState = { round: true, diameter: DIAMETER, width: DIAMETER, height: DIAMETER, focus: null };
export const PREVIEW = previewOf({ round: true, width: Number(DIAMETER), height: Number(DIAMETER) }, RENAMES[0].table.seats);

/** `getInitials` for every table's guests, indexed like `HALL.tables`. */
export const INITIALS = HALL.tables.map((table) => guestsAt(table.label).map(initialsOf));

/**
 * The couple's view of the plan inside the phone: `zoom` canvas units to a
 * CSS px (60 units a metre, so the app's `ppm` is 60 × zoom) and the canvas
 * point at the middle of the canvas box. Pinched in on the top half, round
 * Stół 2; after the jump, scrolled down to Stół 5; pinched out over the whole
 * room for the payoff.
 */
type View = { zoom: number; centre: { x: number; y: number } };
const TOP: View = { zoom: 0.75, centre: { x: 580, y: 400 } };
const LOW: View = { zoom: 0.75, centre: { x: 300, y: 660 } };
const ROOM: View = { zoom: 0.43, centre: { x: 420, y: 470 } };

export const viewAt = (frame: number): View => {
  if (frame < JUMP) return TOP;
  const t = interpolate(frame, PINCH, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return {
    zoom: LOW.zoom + (ROOM.zoom - LOW.zoom) * t,
    centre: {
      x: LOW.centre.x + (ROOM.centre.x - LOW.centre.x) * t,
      y: LOW.centre.y + (ROOM.centre.y - LOW.centre.y) * t,
    },
  };
};

/** `seatSizePx`: `clamp(ppm * 0.34, 12, 44)`; `TableSeats` writes initials from 14 px up. */
export const seatPxAt = (zoom: number) => Math.min(44, Math.max(12, PX_PER_M * zoom * 0.34));
export const showsInitials = (zoom: number) => seatPxAt(zoom) >= 14;
