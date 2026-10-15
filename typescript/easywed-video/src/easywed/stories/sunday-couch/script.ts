import type { Point } from "../../geometry";

/**
 * What happens on the sunday-couch cut's clock (`SUNDAY_COUCH_STARTS`), shared
 * by every scene: the time chip, the two voices, the room laid out and seated,
 * the camera on the laptop and its one pointer. Frames are cut-global, so a
 * scene reads them at `frame + SUNDAY_COUCH_STARTS.{scene}`.
 */

/**
 * The chip's clock: `tl.couch.times[i]` from `TICKS[i]`, each change rolling in
 * over `TICK` frames. The evening jumps forward on the scene cuts - the room is
 * laid out by 20:10, the guests are on the list by 21:05.
 */
export const TICKS = [0, 90, 262, 464] as const;
export const TICK = 8;

/** The couple's lines, by `tl.couch` key. */
export type LineKey =
  | "hook"
  | "tea"
  | "floor"
  | "headTable"
  | "howMany"
  | "tableCount"
  | "grandma"
  | "cousins"
  | "work"
  | "whereElse"
  | "everyone"
  | "seated";

/**
 * One line of the conversation. The left voice asks, the right one answers;
 * a pair shares the band over the laptop and leaves it together. `enter` is
 * left out for the hook, which is up on frame 0 so the Reel's first frame reads
 * on its own. Every line is held for at least ten frames a word, never under 30.
 */
export type Line = {
  key: LineKey;
  side: "left" | "right";
  enter?: readonly [number, number];
  exit: readonly [number, number];
};

export const LINES: Line[] = [
  // 19:40 - "Dobra, dziś w końcu robimy plan stołów." is up from frame 0; the answer lands by 54.
  { key: "hook", side: "left", exit: [96, 104] },
  { key: "tea", side: "right", enter: [46, 54], exit: [96, 104] },
  // 20:10 - each line lands with what it asks for: the floor, then the head table.
  { key: "floor", side: "left", enter: [104, 112], exit: [178, 186] },
  { key: "headTable", side: "right", enter: [128, 136], exit: [178, 186] },
  { key: "howMany", side: "left", enter: [188, 196], exit: [256, 264] },
  { key: "tableCount", side: "right", enter: [218, 226], exit: [256, 264] },
  // 21:05 - the seating.
  { key: "grandma", side: "left", enter: [272, 280], exit: [364, 372] },
  { key: "cousins", side: "right", enter: [294, 302], exit: [364, 372] },
  { key: "work", side: "left", enter: [378, 386], exit: [456, 464] },
  { key: "whereElse", side: "right", enter: [414, 422], exit: [456, 464] },
  // 22:30 - the last pair leaves as the call to action takes the room away.
  { key: "everyone", side: "left", enter: [478, 486], exit: [566, 574] },
  { key: "seated", side: "right", enter: [510, 518], exit: [566, 574] },
];

/** The dance floor and the bar land together, as "Parkiet na środek." comes up. */
export const FLOOR_IN = [106, 118] as const;

/**
 * Each table's entrance - a spring from this frame. The head table lands with
 * its line; the rest follow round the room, left column, bottom row, right column.
 */
export const TABLE_IN: Record<string, number> = {
  head: 130,
  t1: 146,
  t2: 152,
  t5: 158,
  t6: 164,
  t4: 170,
  t3: 176,
};

/** The guest list is on the panel from the 21:05 tick - added between two ticks of the clock. */
export const LIST_FROM = TICKS[2];

/**
 * Each table fills seat by seat over its range. The head table and the tables
 * nearest it go first ("Babcia blisko nas."), Stół 3 by the bar goes last,
 * once its line is up - everyone is seated before 22:30.
 */
export const FILL: Record<string, readonly [number, number]> = {
  head: [276, 300],
  t1: [288, 312],
  t2: [312, 336],
  t5: [330, 354],
  t6: [346, 370],
  t4: [360, 384],
  t3: [404, 432],
};

/**
 * The camera on the laptop. A `desk` shot is in the laptop's own pixels
 * (the 1920x1080 screen); a `hall` shot is in hall units, `span` of them across
 * the frame, and is placed on the laptop through whichever layout is on
 * screen - so a close-up follows the room when the guest panel opens.
 * `atY` is where the shot's focus lands in the frame.
 */
export type Shot =
  | { kind: "desk"; focus: Point; zoom: number; atY: number }
  | { kind: "hall"; focus: Point; span: number; atY: number };

/** The whole laptop, lid and base, across the frame's width. */
export const SHOT_WIDE: Shot = { kind: "desk", focus: { x: 960, y: 563 }, zoom: 0.5, atY: 1060 };
/** The room edge to edge, its dimension labels and chip included, the header just gone under the lines' band. */
export const SHOT_ROOM: Shot = { kind: "hall", focus: { x: 600, y: 350 }, span: 1322, atY: 1140 };
/** The head table and the tables nearest it, down to the bottom row. */
export const SHOT_HEAD: Shot = { kind: "hall", focus: { x: 380, y: 330 }, span: 760, atY: 1190 };
/** Close on the bar and Stół 3 beside it, so the initials read. */
export const SHOT_BAR: Shot = { kind: "hall", focus: { x: 990, y: 200 }, span: 560, atY: 1190 };

/** One continuous move: in on the room as it is laid out, back, in on the seating, back over the seated room. */
export const CAMERA: { from: Shot; to: Shot; range: readonly [number, number] }[] = [
  { from: SHOT_WIDE, to: SHOT_ROOM, range: [96, 128] },
  { from: SHOT_ROOM, to: SHOT_WIDE, range: [232, 260] },
  { from: SHOT_WIDE, to: SHOT_HEAD, range: [298, 324] },
  { from: SHOT_HEAD, to: SHOT_BAR, range: [372, 400] },
  { from: SHOT_BAR, to: SHOT_WIDE, range: [464, 498] },
];

/**
 * A stop of the pointer: a hall point it reaches by `frame`, pressing there
 * when `press` is set. `seat` names a table's chair (`seatPositions` index)
 * rather than a point, so the pointer lands on the marker it fills.
 */
export type Stop = { frame: number; press?: boolean } & (
  | { at: Point }
  | { table: string; seat: number }
);

/** A run of the pointer: it fades in near its first stop, visits each in turn, and fades out. */
export type PointerRun = { in: readonly [number, number]; out: readonly [number, number]; stops: Stop[] };

/** How long a press is held down. */
export const PRESS = 5;

/** One pointer, because it is one laptop - it places the floor and the head table, then seats guests at the close-ups. */
export const POINTER_RUNS: PointerRun[] = [
  {
    in: [98, 106],
    out: [142, 152],
    stops: [
      { frame: 106, at: { x: 640, y: 400 }, press: true },
      { frame: 128, at: { x: 640, y: 130 }, press: true },
    ],
  },
  {
    in: [324, 332],
    out: [356, 364],
    stops: [
      { frame: 332, table: "t2", seat: 6, press: true },
      { frame: 344, table: "t5", seat: 4, press: true },
    ],
  },
  {
    in: [398, 406],
    out: [440, 450],
    stops: [
      { frame: 406, table: "t3", seat: 1, press: true },
      { frame: 418, table: "t3", seat: 4, press: true },
      { frame: 430, table: "t3", seat: 6, press: true },
    ],
  },
];
