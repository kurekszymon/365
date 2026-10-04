import type { Point } from "../geometry";
import { lShapeVertices } from "../geometry";
import type { HallLayout } from "../layouts";
import { PX_PER_M } from "../layouts";

/**
 * What happens on the loop's clock (`SHAPE_STARTS`), shared by all three
 * scenes: the pointer's stops, its presses, the drag, and what the hall looks
 * like at each of them. Frames are loop-global, so a scene reads them at
 * `frame + SHAPE_STARTS.{scene}`.
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

/** The hall's label chip, which opens its settings (`HallView`'s `openHallEdit`). */
export const PRESS_CHIP: Press = { at: 50, travel: 22 };
/** *Kształt L* in the dialog's shape group. */
export const PRESS_L: Press = { at: 96, travel: 28 };
/** *Edytuj obrys* - the dialog gives way to the shape editor. */
export const PRESS_EDIT: Press = { at: 156, travel: 26 };
/** The notch's outer corner, grabbed... */
export const GRAB: Press = { at: 240, travel: 34 };
/** ...pulled a metre up over these frames... */
export const DRAG = [244, 264] as const;
/** ...and let go, which is when the hall itself takes the new outline. */
export const RELEASE = 268;

/** `DialogContent`'s `duration-100` fade and zoom: three frames at 30 fps. */
export const DIALOG_FADE = 3;

/**
 * The pointer glides in from the lower right, and leaves the same way once the
 * vertex is let go, so it never sits over the corner it just moved.
 */
export const POINTER_IN = [PRESS_CHIP.at - PRESS_CHIP.travel - 8, PRESS_CHIP.at - PRESS_CHIP.travel] as const;
export const POINTER_OUT = [RELEASE + 2, RELEASE + 16] as const;

/**
 * The payoff lands with the new wall and holds 59 frames - ten a word for its
 * five - before the loop's seam starts to dissolve it.
 */
export const PAYOFF_IN = [272, 286] as const;

/** The vertex the loop drags: the notch's `(w, 0.5h)` corner, index 3 of the L. */
const DRAGGED = 3;

/**
 * How far it goes: one metre **outward**, up into the cut quarter, so the room
 * only grows and `setHallShape` has nothing to re-clamp. The app snaps a
 * dragged vertex to the canvas snap step (`ShapeEditOverlay`'s `snapVertex`,
 * `snapStep: 1` by default - the toolbar's *1 m*), so the corner lands on the
 * next metre rather than wherever the pointer lets go.
 */
export const DRAG_BY: Point = { x: 0, y: -PX_PER_M };

/** `snapPositionToGrid` at the default 1 m step, in canvas units. */
const snapToMetre = (p: Point): Point => ({
  x: Math.round(p.x / PX_PER_M) * PX_PER_M,
  y: Math.round(p.y / PX_PER_M) * PX_PER_M,
});

export type ShapeState = {
  /** The dialog's shape group has *Kształt L* filled from here on. */
  lShape: boolean;
  /** The hall's committed outline - `undefined` while it is still a rectangle. */
  walls: Point[] | undefined;
  /** What the shape editor draws: the live draft mid-drag, the committed outline otherwise. */
  preview: Point[];
};

/**
 * The hall's outline at a frame, derived from the frame alone so both ends of
 * the loop compute the same room. The pointer moves continuously; the vertex
 * under it hops to the next metre halfway, as the app's snap does.
 */
export const shapeAt = (frame: number, hall: HallLayout, pointerOffset: Point): ShapeState => {
  const lShape = frame >= released(PRESS_L);
  const base = lShapeVertices(hall.canvas);
  const moved = (by: Point) =>
    base.map((v, i) => (i === DRAGGED ? snapToMetre({ x: v.x + by.x, y: v.y + by.y }) : v));

  const dragging = frame >= released(GRAB) && frame < RELEASE;
  const committed = frame >= RELEASE ? moved(DRAG_BY) : base;
  const preview = dragging ? moved(pointerOffset) : committed;

  return { lShape, walls: lShape ? committed : undefined, preview };
};

/** The corner the pointer grabs, before the drag - where it has to travel to. */
export const grabPoint = (hall: HallLayout): Point => lShapeVertices(hall.canvas)[DRAGGED];
