/**
 * What happens on the todo-list cut's clock (`TODO_LIST_STARTS`), shared by
 * its scenes: the phone, the camera on it, and the lines over it. Frames are
 * cut-global, so a scene reads them at `frame + TODO_LIST_STARTS.{scene}`.
 */

/** The hook is up on frame 0 over the planner and still whole on frame 45; it stays while the list opens under it. */
export const HOOK_OUT = [80, 88] as const;

/** *Przypomnienia* in the tab bar; its drawer rises over the plan and the camera follows it. */
export const TAP_TAB = 40;
export const SHEET_UP = [42, 56] as const;
export const CAMERA_TO_SHEET = [40, 66] as const;

/** Close on the rows, the red one first, while the line says why it is red. */
export const CAMERA_CLOSE = [84, 108] as const;
export const OVERDUE_IN = [90, 100] as const;
export const OVERDUE_OUT = [162, 168] as const;

/** The deposit's check: the line struck through, the date back to grey, the tab's count one down. */
export const TAP_CHECK = 172;
export const DONE_IN = [180, 190] as const;
export const DONE_OUT = [222, 228] as const;

/**
 * *Dodaj przypomnienie*, then a jump cut on the scene seam onto its popover
 * already filled in: the add scene draws the popover open, the list scene
 * never does, so the seam's dissolve is the cut.
 */
export const TAP_ADD = 220;

/** The popover's own button: it closes, the fifth row lands, the drawer grows by it. */
export const TAP_SAVE = 294;
export const POPOVER_OUT = [294, 298] as const;
export const GROW = [294, 302] as const;
export const ROW_IN = [296, 306] as const;
export const CAMERA_BACK = [296, 326] as const;
/** The payoff lands over the list and stays through the call to action. */
export const PAYOFF_IN = [306, 320] as const;

/** A tapped button reads as held for this long, as `active:` would show it. */
export const PRESS_HELD = 4;

/** The series tag is up from frame 0 and goes as the call to action comes in. */
export const TAG_OUT = [342, 350] as const;
