/**
 * What happens on the try-now speedrun's clock (`TRY_NOW_STARTS`), shared by
 * its scenes: the phone, the camera on it, the stopwatch and the lines over it.
 * Frames are cut-global, so a scene reads them at `frame + TRY_NOW_STARTS.{scene}`.
 *
 * Between `CLOCK_START` and `CLOCK_STOP` nothing is cut or sped up: every tap,
 * keystroke and sheet is drawn at a thumb's pace, so the stopwatch reads the
 * film's own time.
 */

import { TRY_NOW_STARTS } from "./timeline";

/** The hook is up on frame 0 over the landing page, whole by frame 45; the thumb takes *Wypróbujcie bez konta* at 50. */
export const TAP_TRY = 50;
/** The stopwatch starts on that tap. */
export const CLOCK_START = TAP_TRY;
/** `/wedding/local` takes the landing page's place, the seeded hall already in it. */
export const NAVIGATE = 56;
export const HOOK_OUT = [50, 58] as const;
export const CAMERA_TO_PLANNER = [56, 76] as const;
/** One word, held 30 frames. */
export const START_IN = [56, 62] as const;
export const START_OUT = [92, 98] as const;

/**
 * At the fitted zoom the card (`z-20`) covers the top of the hall, its chip
 * included, so one finger drags the plan down (`useCanvasPan`) by `PAN_DRAG`
 * px until the hall clears it - within `axisPanBounds` for a hall shorter than
 * the view.
 */
export const PAN = [112, 128] as const;
export const PAN_DRAG = 90;

/** Three words over the hall, its chip and the card: 40 frames fully up. */
export const HALL_IN = [104, 112] as const;
export const HALL_OUT = [152, 158] as const;

/** Down over the bottom of the phone: `AddFab`, then the sheet it opens on *Stoły*. */
export const CAMERA_TO_SHEET = [148, 166] as const;
export const TAP_FAB = 160;
export const HUB_UP = [162, 174] as const;

/**
 * *Okrągły 8*: v1 inserts it in the middle of the hall and swaps the sheet
 * straight to *Edytuj stół* (`openTableEdit`), which grows to its 85% while the
 * picker's content goes; the check closes it onto the plan.
 */
export const TAP_CARD = 200;
export const FORM_GROW = [202, 210] as const;
/** Three words, over the form that reads *Liczba miejsc 8*, and on over the plan: 90 frames fully up. */
export const TABLE_IN = [206, 214] as const;
export const TABLE_OUT = [304, 310] as const;
export const TAP_DONE = 250;
export const FORM_DOWN = [252, 264] as const;
export const CAMERA_TO_TABLE = [250, 270] as const;

/**
 * At the fitted zoom a 1.5 m table is ~22 px across, too narrow for its
 * `0 / 8` (`truncate`), so two fingers pinch the plan in on it (`usePinch`,
 * its focal point pinned, the pan clamped to the bounds) until the count
 * reads - and it stays there.
 */
export const PINCH = [272, 292] as const;
export const PINCH_ZOOM = 2.2;
/** *Goście* in the tab bar; its drawer rises on the empty list, and *Dodaj gościa* opens the form as a drawer over it. */
export const CAMERA_TO_GUESTS = [296, 316] as const;
export const TAP_GUESTS = 315;
export const GUESTS_UP = [317, 329] as const;
export const TAP_ADD_GUEST = 335;
export const ADD_UP = [337, 349] as const;

/** *Babcia Jadzia*, one character every `TYPE_EVERY` frames from `TYPE_FROM` - 13 of them, done by 454. */
export const TYPE_FROM = 350;
export const TYPE_EVERY = 8;

/** *Zapisz*: the form drops onto the list, her row already in it. */
export const TAP_SAVE = 465;
export const ADD_DOWN = [467, 479] as const;
/** Three words, over her row: 32 frames fully up. */
export const LIST_IN = [468, 476] as const;
export const LIST_OUT = [508, 514] as const;

/** A tap on the plan above the drawer (`DrawerOverlay`) closes it. */
export const TAP_OUTSIDE = 488;
export const GUESTS_DOWN = [490, 500] as const;
export const CAMERA_TO_PLAN = [484, 502] as const;

/** The table: a tap selects it, ring and toolbar; the toolbar's pen opens its form. */
export const TAP_TABLE = 505;
export const TAP_PEN = 520;
export const FORM2_UP = [522, 534] as const;
export const CAMERA_TO_FORM = [518, 536] as const;
/** The thumb scrolls the form to *Przypisz gości*. */
export const SCROLL = [530, 545] as const;
/** *Wybierz gości* opens the picker; her row is tapped, and the store takes her at once (`applyToStore`). */
export const TAP_PICK = 555;
export const TAP_GUEST = 570;
/** A tap on the form outside the popover closes it; the check closes the form. */
export const TAP_CLOSE_PICKER = 580;
export const TAP_DONE2 = 598;
export const FORM2_DOWN = [600, 612] as const;
export const CAMERA_TO_END = [598, 616] as const;
/** Three words, over the picker: 70 frames fully up. */
export const SEAT_IN = [518, 526] as const;
export const SEAT_OUT = [596, 602] as const;

/** The form is off the plan, the table reads `1 / 8`, the card is done: the stopwatch stops. */
export const CLOCK_STOP = FORM2_DOWN[1] + 2;

/** The stopwatch pulses once as it stops, and the payoff lands under it and stays through the call to action. */
export const CLOCK_PULSE = [CLOCK_STOP, CLOCK_STOP + 14] as const;
export const PAYOFF_IN = [618, 632] as const;

/** A tapped button reads as held for this long, as `active:` would show it. */
export const PRESS_HELD = 4;

/** The series tag and the stopwatch are up from frame 0 and go as the call to action comes in. */
export const TAG_OUT = [TRY_NOW_STARTS.cta, TRY_NOW_STARTS.cta + 8] as const;
