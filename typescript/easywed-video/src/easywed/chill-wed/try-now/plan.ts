import { Easing, interpolate } from "remotion";
import { TABLE_PRESETS } from "../../components/AddHub";
import { canvasBox } from "../../components/PhoneShell";
import { PHONE } from "../../components/PhoneFrame";
import type { Point } from "../../geometry";
import { type Metres, SEEDED_HALL } from "../../layouts";
import { CLOCK_START, CLOCK_STOP, NAVIGATE, PAN, PAN_DRAG, PINCH, PINCH_ZOOM, TAP_CARD, TAP_GUEST, TAP_SAVE } from "./script";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = { ...clamp, easing: Easing.inOut(Easing.cubic) };

/** The couple planning signed out, as `/wedding/local` opens: guest mode, `GuestModeBanner` over the header. */
export const MODE = "guest" as const;

/** The seeded hall, in metres. */
export const HALL = SEEDED_HALL.meters;

/** *Okrągły 8*, the card the thumb takes: round, Ø 1.5 m, eight seats (`addPresets.ts`). */
export const PRESET = TABLE_PRESETS[0];
export const PRESET_INDEX = 0;

/** The challenge the hook sets and the payoff counts down from. */
export const CHALLENGE_SECONDS = 60;

/**
 * The stopwatch at `frame`, in seconds of film time: nought until the tap on
 * the landing page, then running with the film, held once the guest is seated.
 */
export const elapsedAt = (frame: number, fps: number) =>
  (Math.min(Math.max(frame, CLOCK_START), CLOCK_STOP) - CLOCK_START) / fps;

/** What a stopwatch shows - whole seconds, truncated - and what the minute has left of it. */
export const shownSeconds = (frame: number, fps: number) => Math.floor(elapsedAt(frame, fps));
export const secondsLeft = (fps: number) => Math.floor(CHALLENGE_SECONDS - elapsedAt(CLOCK_STOP, fps));

/** The plan's own state at `frame`: what the store holds, which the card and the table read. */
export const tablesAt = (frame: number) => (frame >= TAP_CARD ? 1 : 0);
export const guestsAt = (frame: number) => (frame >= TAP_SAVE ? 1 : 0);
/** The picker applies on the tap (`applyToStore` in its `onAssignedGuestIdsChange`), not on the check. */
export const seatedAt = (frame: number) => (frame >= TAP_GUEST ? 1 : 0);

/** The canvas's own box on the phone, under the banner and the header, down to the tab bar. */
export const CANVAS = { width: PHONE.width, ...canvasBox(MODE) };

/**
 * `useWorldGeometry` at zoom 1, the first open: `PIXELS_PER_METER = 40`
 * scaled so the hall fits the box less `VIEWPORT_MARGIN = 48` a side, and
 * centred. A 20x12 m hall on a phone is limited by its width.
 */
const APP_PIXELS_PER_METER = 40;
const VIEWPORT_MARGIN = 48;
const baseScale = Math.min(
  (CANVAS.width - VIEWPORT_MARGIN * 2) / (HALL.width * APP_PIXELS_PER_METER),
  (CANVAS.height - VIEWPORT_MARGIN * 2) / (HALL.height * APP_PIXELS_PER_METER),
);
/** CSS px per metre on the phone's canvas at zoom 1. */
const FIT_PPM = APP_PIXELS_PER_METER * baseScale;

/**
 * `AddHubContent`'s `centerPosition`: the preset's top-left at the hall's
 * middle less half its size - (9.25, 5.25) m for Ø 1.5 m in 20x12 m. Nobody
 * drags it: the run leaves it where the hub put it.
 */
export const TABLE: Metres = {
  x: HALL.width / 2 - PRESET.size.width / 2,
  y: HALL.height / 2 - PRESET.size.height / 2,
};
const TABLE_CENTRE: Metres = { x: HALL.width / 2, y: HALL.height / 2 };

/**
 * `axisPanBounds`: a world wider than the view pans until an edge sits
 * `PAN_PADDING` inside the far one; a narrower one slides only until its far
 * edge meets the view's, stopping `startGutter` short at its near side.
 */
const PAN_PADDING = 48;
const LABEL_GUTTER = { x: 64, y: 36 };
const clampPan = (pan: number, scaled: number, container: number, startGutter: number) => {
  const overflow = scaled - container;
  if (overflow >= 0) {
    const m = overflow / 2 + PAN_PADDING;
    return Math.max(-m, Math.min(m, pan));
  }
  const center = -overflow / 2;
  return Math.max(Math.min(startGutter - center, center), Math.min(center, pan));
};

/**
 * The view at `frame`: CSS px per metre, and the hall's top-left in the canvas
 * box. Fitted and centred; dragged down by one finger; then pinched in with
 * the table's centre pinned, the pan clamped to the bounds as `clampPan` does
 * it - which, zoomed in, lifts the plan back a little.
 */
export const viewAt = (frame: number): { ppm: number; origin: Point } => {
  const fittedHeight = HALL.height * FIT_PPM;
  const dragged = clampPan(PAN_DRAG * interpolate(frame, PAN, [0, 1], ease), fittedHeight, CANVAS.height, LABEL_GUTTER.y);
  const k = 1 + (PINCH_ZOOM - 1) * interpolate(frame, PINCH, [0, 1], ease);
  const ppm = FIT_PPM * k;
  const size = { width: HALL.width * ppm, height: HALL.height * ppm };
  const centred = { x: (CANVAS.width - size.width) / 2, y: (CANVAS.height - size.height) / 2 };
  // The focal point - the table's centre where the drag left it - stays put on the screen.
  const focus = { x: CANVAS.width / 2, y: CANVAS.height / 2 + dragged };
  const raw = { x: focus.x - TABLE_CENTRE.x * ppm, y: focus.y - TABLE_CENTRE.y * ppm };
  return {
    ppm,
    origin: {
      x: centred.x + clampPan(raw.x - centred.x, size.width, CANVAS.width, LABEL_GUTTER.x),
      y: centred.y + clampPan(raw.y - centred.y, size.height, CANVAS.height, LABEL_GUTTER.y),
    },
  };
};

/** A point in hall metres, in the phone screen's CSS px. */
export const hallToScreen = (at: Metres, frame: number): Point => {
  const { ppm, origin } = viewAt(frame);
  return { x: origin.x + at.x * ppm, y: CANVAS.top + origin.y + at.y * ppm };
};

/** The table's centre on the screen at `frame` - where a thumb taps it. */
export const tableCentreAt = (frame: number): Point => hallToScreen(TABLE_CENTRE, frame);

/** Whether the planner has replaced the landing page yet. */
export const inPlanner = (frame: number) => frame >= NAVIGATE;
