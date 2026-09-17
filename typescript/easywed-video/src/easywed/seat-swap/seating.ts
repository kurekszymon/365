import { GUESTS, rosterFor } from "../data";
import { tl } from "../i18n";
import type { HallLayout } from "../layouts";

/**
 * Who sits where over the loop, and what the seat popover therefore lists.
 * Everything here is read off `data.ts` and the hall rather than typed, so a
 * name or a seat count moving in `data.ts` moves the film with it.
 */

/** Guest names by table id, indexed like that table's chairs; `null` is an empty chair. */
export type ByTable = Record<string, (string | null)[]>;

export type HallSeating = {
  byTable: ByTable;
  /** Guests with no table at all - the app's *Bez stołu*. */
  unassigned: string[];
};

const named = (table: string): string => {
  const guest = GUESTS.find((g) => g.table === table);
  if (!guest) throw new Error(`No named guest at ${table}`);
  return guest.name;
};

/** The guest who moves, and the one whose chair she takes. Both live in `data.ts`. */
export const MOVER = named(tl.hall.table(1));
export const DISPLACED = named(tl.hall.table(4));

/** The two tables the loop touches. */
export const FROM_TABLE = "t1";
export const TO_TABLE = "t4";

/**
 * Which chair a table's list starts on. Nothing in the app fixes the order -
 * `resolveSeatOccupants` pins guests to whichever chairs they were seated on -
 * so the ring is turned for one reason: the seat popover hangs above the chair
 * it opens on, and Stół 4 sits high enough in the room that a menu over its top
 * chair would break out of the canvas and bury the toolbar. Its list starts on
 * the chair facing the middle of the room instead.
 */
const FIRST_CHAIR: Record<string, number> = { [TO_TABLE]: 4 };

/**
 * Every chair taken, before anything moves. `rosterFor` hands back the hall's
 * whole guest list with a table on every row, and a table's rows fill its chairs
 * in the order they come, from `FIRST_CHAIR`. Both guests the loop names come
 * out first at their own table, so each takes their table's starting chair.
 */
const baseSeating = (hall: HallLayout): ByTable => {
  const rows = rosterFor(hall.tables);
  const byTable: ByTable = {};
  hall.tables.forEach((table) => {
    const names = rows.filter((row) => row.table === table.label).map((row) => row.name);
    const first = FIRST_CHAIR[table.id] ?? 0;
    byTable[table.id] = names.map((_, chair) => names[(chair - first + names.length) % names.length]);
  });
  return byTable;
};

/** Which chair a guest is sitting in at the start. */
export const seatIndexOf = (hall: HallLayout, tableId: string, name: string): number => {
  const index = baseSeating(hall)[tableId].indexOf(name);
  if (index < 0) throw new Error(`${name} does not sit at ${tableId}`);
  return index;
};

/**
 * The room at a given frame of the loop's clock.
 *
 * At `movedIn` the mover comes from another table onto a chair at a table that
 * is already full, so the occupant leaves the table outright rather than merely
 * losing their pin - `occupantLeavesTable` in the app's `planner.store.ts`. At
 * `reseated` that occupant takes the chair she left behind.
 */
export const seatingAt = (
  hall: HallLayout,
  frame: number,
  movedIn: number,
  reseated: number,
): HallSeating => {
  const byTable = baseSeating(hall);
  const fromSeat = byTable[FROM_TABLE].indexOf(MOVER);
  const toSeat = byTable[TO_TABLE].indexOf(DISPLACED);

  if (frame < movedIn) return { byTable, unassigned: [] };

  byTable[FROM_TABLE][fromSeat] = frame < reseated ? null : DISPLACED;
  byTable[TO_TABLE][toSeat] = MOVER;
  return { byTable, unassigned: frame < reseated ? [DISPLACED] : [] };
};

/** Per-table, per-chair fill for `HallCanvas`, indexed like `hall.tables`. */
export const seatFillsAt = (hall: HallLayout, seating: HallSeating): number[][] =>
  hall.tables.map((table) => seating.byTable[table.id].map((name) => (name === null ? 0 : 1)));

export type SeatSection = {
  key: string;
  label: string;
  items: string[];
  /** The amber "this moves them" rows. */
  elsewhere: boolean;
};

const byName = (a: string, b: string) => a.localeCompare(b);

/**
 * What `SeatAssignPopover` lists for one chair, in its own order and with empty
 * sections dropped (`sections.filter((section) => section.items.length > 0)`).
 * The app sorts *Przy tym stole* with seatless guests first; in this hall every
 * guest at a table has a chair, so that reduces to a name sort.
 */
export const sectionsFor = (
  seating: HallSeating,
  tableId: string,
  seatIndex: number,
): SeatSection[] => {
  const occupant = seating.byTable[tableId][seatIndex];
  const here = seating.byTable[tableId].filter(
    (name): name is string => name !== null && name !== occupant,
  );
  const elsewhere = Object.entries(seating.byTable)
    .filter(([id]) => id !== tableId)
    .flatMap(([, names]) => names.filter((name): name is string => name !== null));

  return [
    { key: "selected", label: tl.app.seatGroups.selected, items: occupant ? [occupant] : [], elsewhere: false },
    { key: "table", label: tl.app.seatGroups.table, items: here.sort(byName), elsewhere: false },
    { key: "unassigned", label: tl.app.seatGroups.unassigned, items: [...seating.unassigned].sort(byName), elsewhere: false },
    { key: "elsewhere", label: tl.app.seatGroups.elsewhere, items: elsewhere.sort(byName), elsewhere: true },
  ].filter((section) => section.items.length > 0);
};
