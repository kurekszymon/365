import type { Point } from "../geometry";

/**
 * What happens on the keep-apart cut's clock (`KEEP_APART_STARTS`), shared by
 * its three planner scenes: the lines over the room, the camera, the pointer
 * and the two table drags. Frames are cut-global, so a scene reads them at
 * `frame + KEEP_APART_STARTS.{scene}`.
 */

/**
 * The uncle's line is the hook, and it is already up on frame 0 - no entrance -
 * so the first frame of the Reel reads on its own. It gives way once Stół 6
 * has landed and the camera heads for the family tables.
 */
export const HOOK_OUT = [150, 158] as const;

/**
 * The three caption lines - each held for at least ten frames a word. The
 * last one stays up until the call to action takes the room away.
 */
export const PARENTS_LINE_IN = [156, 166] as const;
export const PARENTS_LINE_OUT = [238, 246] as const;
export const DRAG_LINE_IN = [244, 254] as const;
export const DRAG_LINE_OUT = [320, 328] as const;
export const GUESTS_LINE_IN = [328, 338] as const;

/**
 * A drag as `useTableSnap` runs it: the table follows the pointer from the
 * press, arcing through `via`, is let go at `release` - off the grid, as a hand
 * leaves it - and settles on `to`, the spot `snapPositionToGrid` rounds its
 * top-left corner to.
 */
export type Move = {
  table: string;
  /** The button goes down on the table. */
  grab: number;
  /** The table travels. */
  drag: readonly [number, number];
  /** The button comes up. */
  drop: number;
  via: Point;
  release: Point;
  to: Point;
};

/** How long the table takes to settle onto the grid once it is let go. */
export const SNAP = 4;

/** Stół 6, from beside the DJ booth, over the dance floor, to the empty bottom-left corner. */
export const SIX_MOVE: Move = {
  table: "t6",
  grab: 72,
  drag: [78, 126],
  drop: 128,
  via: { x: 440, y: 560 },
  release: { x: 113, y: 857 },
  to: { x: 125, y: 845 },
};

/** Rodzina taty, from behind Rodzina mamy, arcing over the dance floor, to the spot Stół 6 left. */
export const DAD_MOVE: Move = {
  table: "dad",
  grab: 240,
  drag: [244, 298],
  drop: 300,
  via: { x: 425, y: 560 },
  release: { x: 738, y: 356 },
  to: { x: 725, y: 365 },
};

/** The pointer takes the table here, below and right of its name and count - hall units from the table's centre. */
export const GRAB_AT: Point = { x: 38, y: 44 };

/** Each pointer glides in from below, reaches its table just before the press, and leaves after the drop. */
export type PointerTiming = {
  in: readonly [number, number];
  travel: readonly [number, number];
  out: readonly [number, number];
};
export const POINTER_SIX: PointerTiming = { in: [30, 40], travel: [36, SIX_MOVE.grab - 2], out: [136, 148] };
export const POINTER_DAD: PointerTiming = { in: [200, 210], travel: [206, DAD_MOVE.grab - 2], out: [312, 324] };

/**
 * The camera, in hall units and times the room's fitted size. It opens close
 * on the DJ booth and Stół 6, pulls back over the whole room as Stół 6 is
 * taken - early, so its whole trip stays in shot - pushes in on the two family
 * tables, and pulls back again while Rodzina taty crosses the dance floor.
 * One continuous move throughout, never a cut.
 */
export type Shot = { focus: Point; zoom: number };
export const SHOT_DJ: Shot = { focus: { x: 640, y: 260 }, zoom: 1.9 };
export const SHOT_ROOM: Shot = { focus: { x: 420, y: 480 }, zoom: 1 };
export const SHOT_PARENTS: Shot = { focus: { x: 215, y: 530 }, zoom: 1.9 };
export const SHOT_BOTH: Shot = { focus: { x: 425, y: 480 }, zoom: 1.12 };

export const CAMERA_ROOM = [66, 98] as const;
export const CAMERA_IN = [150, 186] as const;
export const CAMERA_BACK = [250, 310] as const;
