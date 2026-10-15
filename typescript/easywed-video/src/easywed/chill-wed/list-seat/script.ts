/**
 * What happens on the list-seat cut's clock (`LIST_SEAT_STARTS`), shared by its
 * scenes: the phone, the camera on it, and the lines over it. Frames are
 * cut-global, so a scene reads them at `frame + LIST_SEAT_STARTS.{scene}`.
 */

/**
 * The hook is up on frame 0 over the open guest list and still whole on frame
 * 45; then it makes way for the question, and the camera closes on Tomek's row.
 */
export const HOOK_OUT = [46, 54] as const;
export const CAMERA_TO_ROW = [46, 76] as const;
export const WHERE_IN = [54, 64] as const;
export const WHERE_OUT = [96, 102] as const;

/** The thumb on his row's seat button, and the sheet it opens - the table list. */
export const TAP_ROW = 100;
export const SHEET_UP = [102, 114] as const;
export const CAMERA_TO_TABLES = [100, 126] as const;
export const FULL_IN = [118, 128] as const;
export const FULL_OUT = [214, 220] as const;

/** Stół 5, the one live row; the sheet swaps its list for that table's seats. */
export const TAP_TABLE = 206;
export const STEP_TO_SEATS = [210, 218] as const;
export const CAMERA_TO_SEATS = [210, 240] as const;
export const BESIDE_IN = [240, 250] as const;
export const BESIDE_OUT = [298, 304] as const;

/** The free chair, then - once its button has read *Posadź na miejscu 6* for 40 frames - the button. */
export const TAP_SEAT = 302;
export const TAP_CONFIRM = 344;
/** The sheet drops; he is seated the moment it is confirmed. */
export const SHEET_DOWN = [346, 358] as const;
export const CAMERA_BACK = [346, 370] as const;
/** The payoff lands over the list and stays through the call to action. */
export const PAYOFF_IN = [352, 366] as const;

/** A tapped button reads as held for this long, as `active:` would show it. */
export const PRESS_HELD = 4;

/** The series tag is up from frame 0 and goes as the call to action comes in. */
export const TAG_OUT = [372, 380] as const;
