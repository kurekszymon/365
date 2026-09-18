import { released, type Press } from "./script";

/**
 * What happens on the social cut's clock (`SWAP_CUT_STARTS`), shared by its
 * three planner scenes: the pointer's stops and presses, the two names typed
 * into the popover's search, and the two moves. Frames are cut-global, so a
 * scene reads them at `frame + SWAP_CUT_STARTS.{scene}`.
 *
 * The loop (`script.ts`) reaches its rows by flicking the list; this cut types,
 * which is what a user does with a name eighth or fiftieth in the list - the
 * search field is `autoFocus`, so the keys go straight in without a click.
 */

/** The question lands before the first 12 frames are out. */
export const HOOK_IN = [2, 12] as const;

/** The chair at Stół 4, then the mover's row once the search has narrowed to her. */
export const PRESS_SEAT_A: Press = { at: 84, travel: 26 };
export const PRESS_MOVER: Press = { at: 190, travel: 18 };
/** The chair she left empty at Stół 1, then the displaced guest's row. */
export const PRESS_SEAT_B: Press = { at: 266, travel: 30 };
export const PRESS_DISPLACED: Press = { at: 330, travel: 14 };

/** The two moves land as their clicks do. */
export const MOVED_IN = released(PRESS_MOVER);
export const RESEATED = released(PRESS_DISPLACED);

/** How long a chair takes to change colour once its guest has moved. */
export const SEAT_POP = 6;

/** The pointer glides in from below the room, and leaves the moment the last click lands. */
export const POINTER_IN = [44, 56] as const;
export const POINTER_OUT = [RESEATED, RESEATED + 14] as const;

/** The popover's own entrance - `data-open:animate-in`, ~100 ms in the app. */
export const POPOVER_IN = 6;

/** A popover is open from the click that opened it until the click that picks. */
export const POPOVER_A = [released(PRESS_SEAT_A), released(PRESS_MOVER)] as const;
export const POPOVER_B = [released(PRESS_SEAT_B), released(PRESS_DISPLACED)] as const;

/**
 * Typing: one key every `step` frames from `from`. Each popover is left alone
 * long enough to read its sections first - the occupant and his table, then the
 * empty chair's table - before the list narrows.
 */
export type Typing = { from: number; step: number };
export const TYPE_A: Typing = { from: 128, step: 4 };
export const TYPE_B: Typing = { from: 290, step: 4 };

/** How much of `text` has been typed by `frame`. */
export const typedAt = (frame: number, typing: Typing, text: string): string =>
  frame < typing.from ? "" : text.slice(0, Math.floor((frame - typing.from) / typing.step) + 1);

/** The frame the last key of `text` lands. */
export const typedBy = (typing: Typing, text: string): number => typing.from + (text.length - 1) * typing.step;

/** The input's caret, blinking at the browser's ~530 ms while nothing is being typed. */
export const caretOn = (frame: number): boolean => Math.floor(frame / 16) % 2 === 0;

/** The payoff lands with the second pick and holds past the cut - 55 frames, eleven a word. */
export const PAYOFF_IN = [RESEATED, RESEATED + 14] as const;
