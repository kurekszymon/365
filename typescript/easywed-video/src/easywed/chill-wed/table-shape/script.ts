/**
 * What happens on the table-shape cut's clock (`TABLE_SHAPE_STARTS`), shared by
 * its scenes: the phone, the camera on it, and the lines over it. Frames are
 * cut-global, so a scene reads them at `frame + TABLE_SHAPE_STARTS.{scene}`.
 */

/** The hook is up on frame 0 over Stół 3 and still whole on frame 45; the camera drifts in meanwhile. */
export const DRIFT = [0, 56] as const;
export const HOOK_OUT = [52, 60] as const;

/**
 * A first tap selects the table - its ring and toolbar - and the toolbar's pen,
 * which a phone adds for this, opens the form (`DraggableTable`).
 */
export const TAP_TABLE = 58;
export const TOOLBAR_IN = [58, 64] as const;
export const TAP_EDIT = 76;
export const SHEET_UP = [78, 92] as const;
export const CAMERA_TO_SHEET = [76, 100] as const;
export const BOTH_IN = [62, 72] as const;
export const BOTH_OUT = [108, 114] as const;

/** *Prostokątny*: the form swaps its fields on the tap; the table turns square, the same 1.5 m. */
export const TAP_SHAPE = 118;
export const MORPH_SQUARE = [118, 130] as const;
export const SQUARE_IN = [122, 132] as const;
export const SQUARE_OUT = [174, 180] as const;

/**
 * The rectangle's extra row pushes the diagram's bottom edge under the
 * drawer's fold, so the thumb scrolls the form up far enough to see all of it.
 */
export const SCROLL = [140, 152] as const;
export const SCROLL_BY = 28;

/** *Szerokość* tapped, cleared, typed; then *Wysokość*. The table follows each value as it lands. */
export const TAP_WIDTH = 172;
export const TYPE_WIDTH = 182;
export const MORPH_LONG = [182, 194] as const;
export const TAP_HEIGHT = 200;
export const TYPE_HEIGHT = 210;
export const MORPH_NARROW = [210, 220] as const;
/** How long a field shows empty between the old value going and the new one being typed. */
export const CLEARED_FOR = 4;
export const DIMS_IN = [186, 196] as const;
export const DIMS_OUT = [236, 242] as const;

/** *Obróć o 90°*: the width and height swap and the table stands upright along the wall. */
export const TAP_ROTATE = 254;
export const MORPH_TURN = [254, 270] as const;
export const WALL_IN = [258, 268] as const;
export const WALL_OUT = [300, 306] as const;

/** The form's done button, then the drawer drops onto the plan and the camera pulls back over it. */
export const TAP_DONE = 308;
export const SHEET_DOWN = [310, 324] as const;
export const CAMERA_BACK = [310, 342] as const;
/** The payoff lands over the plan and stays through the call to action. */
export const PAYOFF_IN = [328, 342] as const;

/** A tapped button reads as held for this long, as `active:` would show it. */
export const PRESS_HELD = 4;

/** The series tag is up from frame 0 and goes as the call to action comes in. */
export const TAG_OUT = [372, 380] as const;
