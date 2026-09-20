import type { Point } from "../geometry";
import { tl } from "../i18n";
import type { HallLayout } from "../layouts";
import { PX_PER_M } from "../layouts";

/**
 * What happens on the loop's clock (`SCALE_STARTS`), shared by all three
 * scenes: the pointer's stops, its presses, and the two measurements. Frames
 * are loop-global, so a scene reads them at `frame + SCALE_STARTS.{scene}`.
 */

/** The question lands before the first 12 frames are out. */
export const HOOK_IN = [2, 12] as const;

/** A press: the pointer arrives by `at`, and the button goes down for a few frames around it. */
export type Press = { at: number; travel: number };
const PRESS_HALF = 3;
export const isPressed = (frame: number, press: Press): boolean =>
  frame >= press.at - PRESS_HALF && frame < press.at + PRESS_HALF;
/** The frame the click lands - the button coming back up. */
export const released = (press: Press): number => press.at + PRESS_HALF;

/** *Mierzenie* on, then the mode switch from the app's default *Środek* to *Krawędź*. */
export const PRESS_TOOL: Press = { at: 60, travel: 22 };
export const PRESS_MODE: Press = { at: 90, travel: 22 };
/** Stół 1, then the dance floor - the first measurement. */
export const PRESS_ACROSS_A: Press = { at: 128, travel: 30 };
export const PRESS_ACROSS_B: Press = { at: 176, travel: 38 };
/** Stół 5, then the dance floor again - the second, vertical one. */
export const PRESS_UP_A: Press = { at: 246, travel: 24 };
export const PRESS_UP_B: Press = { at: 284, travel: 28 };

/**
 * The pointer glides in from the lower right, and leaves the same way the
 * moment the last click lands, so it never sits on the label that click drew.
 */
export const POINTER_IN = [PRESS_TOOL.at - PRESS_TOOL.travel - 8, PRESS_TOOL.at - PRESS_TOOL.travel] as const;
export const POINTER_OUT = [released(PRESS_UP_B), released(PRESS_UP_B) + 14] as const;

/** A distance label pops in over this many frames once its second point is down. */
export const LABEL_POP = 12;

/**
 * The payoff lands with the second label and holds 50 frames - ten a word -
 * before the loop's seam starts to dissolve it.
 */
export const PAYOFF_IN = [280, 294] as const;

export const MEASURE_MODE = tl.app.measureMode;

/** The two `measure.statusbar*` hints, verbatim. */
export const STATUS = tl.app.measureStatus;

type Rect = { x: number; y: number; width: number; height: number };

/** `nearestCircleBorder` in the app's `Canvas/utils.ts`. */
const nearestCircleBorder = (p: Point, c: Point, r: number): Point => {
  const len = Math.hypot(p.x - c.x, p.y - c.y);
  if (len === 0) return { x: c.x + r, y: c.y };
  return { x: c.x + ((p.x - c.x) / len) * r, y: c.y + ((p.y - c.y) / len) * r };
};

/** `nearestRectBorder` in the app's `Canvas/utils.ts`, for a centre-anchored rect. */
const nearestRectBorder = (p: Point, rect: Rect): Point => {
  const x0 = rect.x - rect.width / 2;
  const y0 = rect.y - rect.height / 2;
  const x1 = x0 + rect.width;
  const y1 = y0 + rect.height;
  const d = { left: p.x - x0, right: x1 - p.x, top: p.y - y0, bottom: y1 - p.y };
  const min = Math.min(d.left, d.right, d.top, d.bottom);
  const cx = Math.min(Math.max(p.x, x0), x1);
  const cy = Math.min(Math.max(p.y, y0), y1);
  if (min === d.left) return { x: x0, y: cy };
  if (min === d.right) return { x: x1, y: cy };
  if (min === d.top) return { x: cx, y: y0 };
  return { x: cx, y: y1 };
};

const insideRect = (p: Point, rect: Rect): boolean =>
  Math.abs(p.x - rect.x) <= rect.width / 2 && Math.abs(p.y - rect.y) <= rect.height / 2;

/** How far inside an edge the pointer clicks - near enough that border mode picks that edge. */
const CLICK_INSET = 4;

export type Measurement = {
  /** Where the pointer clicks for each end. */
  clickA: Point;
  clickB: Point;
  /** Where border mode puts each end. */
  a: Point;
  b: Point;
  pressA: Press;
  pressB: Press;
  /** The label, formatted as `MeasureOverlay` formats it: `${d.toFixed(2)} m`. */
  label: string;
};

const measurement = (clickA: Point, a: Point, clickB: Point, pressA: Press, pressB: Press, floor: Rect): Measurement => {
  const b = nearestRectBorder(clickB, floor);
  const metres = Math.hypot(b.x - a.x, b.y - a.y) / PX_PER_M;
  return { clickA, clickB, a, b, pressA, pressB, label: `${metres.toFixed(2)} m` };
};

/**
 * The two measurements, read off the hall rather than typed: Stół 1's right
 * edge across to the dance floor's left edge, then Stół 5's top edge up to the
 * floor's bottom edge. If `layouts.ts` moves a table, the labels follow.
 */
export const measurementsFor = (hall: HallLayout): Measurement[] => {
  const floor = hall.danceFloor;
  const byId = (id: string) => {
    const table = hall.tables.find((t) => t.id === id);
    if (!table) throw new Error(`No table ${id} in ${hall.name}`);
    return table;
  };

  const t1 = byId("t1");
  const acrossClickA = { x: t1.x + t1.width / 2 - 20, y: t1.y };
  const acrossClickB = { x: floor.x - floor.width / 2 + CLICK_INSET, y: t1.y };

  const t5 = byId("t5");
  const upClickA = { x: t5.x, y: t5.y - t5.height / 2 + 20 };
  const upClickB = { x: t5.x, y: floor.y + floor.height / 2 - CLICK_INSET };

  return [
    measurement(
      acrossClickA,
      // The start point turns to face the pointer as it leaves the table.
      nearestCircleBorder(acrossClickB, t1, t1.width / 2),
      acrossClickB,
      PRESS_ACROSS_A,
      PRESS_ACROSS_B,
      floor,
    ),
    measurement(
      upClickA,
      nearestCircleBorder(upClickB, t5, t5.width / 2),
      upClickB,
      PRESS_UP_A,
      PRESS_UP_B,
      floor,
    ),
  ];
};

/**
 * The live end of the dashed line while the second point is pending: the
 * pointer itself over bare floor, snapped to the nearest edge once it is over
 * the dance floor - `resolvePoint` in `useMeasureTool.ts`.
 */
export const pendingEnd = (pointer: Point, hall: HallLayout): Point =>
  insideRect(pointer, hall.danceFloor) ? nearestRectBorder(pointer, hall.danceFloor) : pointer;
