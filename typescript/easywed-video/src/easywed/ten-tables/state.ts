import { Easing, interpolate } from "remotion";
import type { Point } from "../geometry";
import { type Metres, PX_PER_M, TEN_TABLES_BATCH } from "../layouts";
import { batchDialog, FIXTURES_TAB, hubCard, MENU, menuRowY, metresToDesk, PANEL_ADD, APP_PX } from "./components/desk";
import type { BatchForm } from "./components/TableBatchDialog";
import {
  CLICK_ADD,
  CLICK_COUNT,
  CLICK_DIAMETER,
  CLICK_MENU,
  CLICK_PARKIET,
  CLICK_RAIL,
  CLICK_ROUND,
  CLICK_SUBMIT,
  COUNT_KEYS,
  DIAMETER_KEYS,
  FIXTURE_MOVES,
  type FixtureMove,
  JUMP_FLOOR,
  JUMP_TABLES,
  type Key,
  POINTER_LINGER,
  PRESS_HELD,
  RIGHT_CLICK,
  SNAP,
} from "./script";

/**
 * The laptop's state at a frame on the cut's clock, read off `script.ts`: the
 * form's fields as they are typed, where each fixture stands, and where the
 * pointer is. The desk and the stage both draw from these, so the pointer and
 * what it presses can never drift apart.
 */

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = { ...clamp, easing: Easing.inOut(Easing.cubic) };

const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** The spot the menu is opened on, just inside (3, 1) m - the snap takes it to (3, 1). */
const CLICK_AT: Metres = { x: TEN_TABLES_BATCH.start.x + 0.2, y: TEN_TABLES_BATCH.start.y + 0.1 };
export const RIGHT_CLICK_AT = metresToDesk(CLICK_AT);
/** Radix opens the menu a couple of px off the pointer. */
export const MENU_AT: Point = { x: RIGHT_CLICK_AT.x + 2 * APP_PX, y: RIGHT_CLICK_AT.y + 2 * APP_PX };
/** *Dodaj stoły*, the menu's second row, where the pointer comes to rest a little in from its left. */
const MENU_ADD_TABLES: Point = { x: MENU_AT.x + (MENU.width * 0.42) * APP_PX, y: MENU_AT.y + menuRowY(1) * APP_PX };

/** What a field shows at `frame`: its starting value, then each key's draft as it lands. */
const typed = (keys: Key[], frame: number, initial: string): string =>
  keys.reduce((text, key) => (frame >= key.frame ? key.text : text), initial);

/** `NumberInput` passes on only a parseable, non-empty draft; the form keeps the last one. */
const parsed = (keys: Key[], frame: number, initial: number): number =>
  keys.reduce((value, key) => (frame >= key.frame && key.text !== "" && Number.isFinite(Number(key.text)) ? Number(key.text) : value), initial);

/** `INITIAL_FORM`: `DEFAULT_TABLE`'s rectangular 2x1 m and eight seats, and a count of 2. */
const INITIAL = { width: 2, height: 1, capacity: TEN_TABLES_BATCH.capacity, count: 2 };

export const batchFormAt = (frame: number): BatchForm => ({
  shape: frame >= CLICK_ROUND ? "round" : "rectangular",
  width: typed(DIAMETER_KEYS, frame, String(INITIAL.width)),
  height: String(INITIAL.height),
  capacity: String(INITIAL.capacity),
  count: typed(COUNT_KEYS, frame, String(INITIAL.count)),
  countValue: parsed(COUNT_KEYS, frame, INITIAL.count),
  focused: frame >= CLICK_COUNT ? "count" : frame >= CLICK_DIAMETER ? "diameter" : undefined,
  pressed:
    frame >= CLICK_ROUND && frame < CLICK_ROUND + PRESS_HELD
      ? "round"
      : frame >= CLICK_SUBMIT && frame < CLICK_SUBMIT + PRESS_HELD
        ? "submit"
        : undefined,
});

/** A fixture's top-left at `frame`, in metres, or null before the cut that shows it inserted. */
export const fixtureAt = (move: FixtureMove, frame: number): Metres | null => {
  if (frame < move.from) return null;
  if (frame < move.drag[0]) return move.inserted;
  if (frame < move.drop) {
    return mix(move.inserted, move.release, interpolate(frame, move.drag, [0, 1], ease));
  }
  return mix(move.release, move.to, interpolate(frame, [move.drop, move.drop + SNAP], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) }));
};

/** The fixture being dragged at `frame`, if any - drawn with the selection ring. */
export const draggingAt = (frame: number) => FIXTURE_MOVES.find((move) => frame >= move.grab && frame < move.drop);

/** Where the pointer takes a fixture, from its centre - down and right, clear of its label. */
const grip = (move: FixtureMove): Metres => ({ x: move.size.x * 0.32, y: Math.min(move.size.y * 0.3, 0.35) });

const centreOf = (move: FixtureMove, topLeft: Metres): Metres => ({
  x: topLeft.x + move.size.x / 2,
  y: topLeft.y + move.size.y / 2,
});

type Stop = { frame: number; at: Point; press: boolean };

/**
 * The pointer's runs over the desk. The first two are paths through clicks,
 * each ended by a jump cut; then one drag per fixture, the pointer already on
 * it when the cut lands.
 */
const PATHS: { in: readonly [number, number]; until: number; stops: Stop[] }[] = [
  {
    in: [34, 42],
    until: JUMP_TABLES,
    stops: [
      { frame: RIGHT_CLICK, at: RIGHT_CLICK_AT, press: true },
      { frame: CLICK_MENU, at: MENU_ADD_TABLES, press: true },
      { frame: CLICK_ROUND, at: batchDialog("rectangular").targets.round, press: true },
      { frame: CLICK_DIAMETER, at: batchDialog("round").targets.diameter, press: true },
      { frame: CLICK_COUNT, at: batchDialog("round").targets.count, press: true },
      { frame: CLICK_SUBMIT, at: batchDialog("round").targets.submit, press: true },
    ],
  },
  {
    in: [228, 236],
    until: JUMP_FLOOR,
    stops: [
      { frame: CLICK_RAIL, at: FIXTURES_TAB, press: true },
      { frame: CLICK_ADD, at: PANEL_ADD, press: true },
      { frame: CLICK_PARKIET, at: hubCard("dance-floor"), press: true },
    ],
  },
];

/** Travel ends this many frames before a click, so the pointer settles before it presses. */
const SETTLE = 4;

export type PointerState = { at: Point; opacity: number; pressed: boolean };

export const pointerAt = (frame: number): PointerState | null => {
  const path = PATHS.find((p) => frame >= p.in[0] && frame < p.until);
  if (path) {
    const first = path.stops[0];
    // It comes in from below and to the right of its first stop.
    const entry = { x: first.at.x + 180, y: first.at.y + 260 };
    let at = mix(entry, first.at, interpolate(frame, [path.in[0], first.frame - SETTLE], [0, 1], ease));
    for (let i = 1; i < path.stops.length; i++) {
      const prev = path.stops[i - 1];
      const next = path.stops[i];
      if (frame > prev.frame) at = mix(prev.at, next.at, interpolate(frame, [prev.frame + PRESS_HELD, next.frame - SETTLE], [0, 1], ease));
    }
    return {
      at,
      opacity: interpolate(frame, path.in, [0, 1], clamp),
      pressed: path.stops.some((stop) => stop.press && frame >= stop.frame && frame < stop.frame + PRESS_HELD),
    };
  }

  const move = FIXTURE_MOVES.find((m) => frame >= m.from && frame < m.drop + POINTER_LINGER + 4);
  if (!move) return null;
  const topLeft = fixtureAt(move, Math.min(frame, move.drop - 1));
  if (!topLeft) return null;
  const centre = centreOf(move, topLeft);
  const g = grip(move);
  return {
    at: metresToDesk({ x: centre.x + g.x, y: centre.y + g.y }),
    opacity: interpolate(frame, [move.drop + POINTER_LINGER, move.drop + POINTER_LINGER + 4], [1, 0], clamp),
    pressed: frame >= move.grab && frame < move.drop,
  };
};

/** A fixture's centre-and-size in hall units, as `HallLayout` holds one. */
export const fixtureSpec = (move: FixtureMove, topLeft: Metres) => ({
  id: move.id,
  label: move.label,
  x: (topLeft.x + move.size.x / 2) * PX_PER_M,
  y: (topLeft.y + move.size.y / 2) * PX_PER_M,
  width: move.size.x * PX_PER_M,
  height: move.size.y * PX_PER_M,
});
