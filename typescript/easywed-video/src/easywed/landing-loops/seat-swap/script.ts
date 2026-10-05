/**
 * What happens on the loop's clock (`SWAP_STARTS`), shared by all three scenes:
 * the pointer's stops, its presses, the two list flicks and the two moves.
 * Frames are loop-global, so a scene reads them at `frame + SWAP_STARTS.{scene}`.
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

/** The chair at Stół 4, then the mover's row in the popover that opens over it. */
export const PRESS_SEAT_A: Press = { at: 92, travel: 38 };
export const PRESS_MOVER: Press = { at: 202, travel: 12 };
/** The chair she left empty at Stół 1, then the displaced guest's row. */
export const PRESS_SEAT_B: Press = { at: 244, travel: 36 };
export const PRESS_DISPLACED: Press = { at: 298, travel: 12 };

/** The two moves land as their clicks do. */
export const MOVED_IN = released(PRESS_MOVER);
export const RESEATED = released(PRESS_DISPLACED);

/** How long a chair takes to change colour once its guest has moved. */
export const SEAT_POP = 6;

/**
 * The pointer glides in from the lower right, and leaves the same way the moment
 * the last click lands, so the room it hands back to the loop's frame 0 is the
 * same bare room it started from.
 */
export const POINTER_IN = [24, 34] as const;
export const POINTER_OUT = [RESEATED, RESEATED + 14] as const;

/** The popover's own entrance - `data-open:animate-in`, ~100 ms in the app. */
export const POPOVER_IN = 6;

/** A popover is open from the click that opened it until the click that picks. */
export const POPOVER_A = [released(PRESS_SEAT_A), released(PRESS_MOVER)] as const;
export const POPOVER_B = [released(PRESS_SEAT_B), released(PRESS_DISPLACED)] as const;

/**
 * The list flicks. Stół 4's list holds every guest in the hall, so it falls in
 * two: first until *Przy innym stole* is at the top of the window, where it
 * rests long enough to read the heading and the first amber rows, then on to the
 * guest being picked. Stół 1's only has to drop past *Przy tym stole* to reach
 * *Bez stołu*, which is one short move.
 */
export const SCROLL_A_HEADER = [124, 150] as const;
export const SCROLL_A_ROW = [168, 186] as const;
export const SCROLL_B = [266, 282] as const;

/** The payoff lands with the second pick and holds to the seam - 48 frames, twelve a word. */
export const PAYOFF_IN = [RESEATED, RESEATED + 14] as const;
