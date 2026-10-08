/**
 * What happens on the ciocie-single cut's clock (`CIOCIE_STARTS`), shared by
 * its scenes: the phone, the camera on it, and the lines over it. Frames are
 * cut-global, so a scene reads them at `frame + CIOCIE_STARTS.{scene}`.
 */

/** The hook is up on frame 0 over Stół 2 and stays while the couple renames it; the camera drifts in meanwhile. */
export const DRIFT = [0, 56] as const;
export const HOOK_OUT = [174, 182] as const;

/** One pass of the table form: select, pen, the drawer, the name retyped, the check. */
export type Pass = {
  /** The tap that selects the table - its ring and the toolbar. Left out, the jump cut lands on it selected. */
  tapTable?: number;
  tapEdit: number;
  sheetUp: readonly [number, number];
  cameraToSheet: readonly [number, number];
  tapName: number;
  /** The old name goes one character every `CLEAR_EVERY` frames, from here. */
  clearFrom: number;
  /** The new name lands one character every `every` frames, from here. */
  typeFrom: number;
  every: number;
  tapDone: number;
  sheetDown: readonly [number, number];
  cameraBack: readonly [number, number];
};

/** A held backspace: the old name goes faster than the new one is typed. */
export const CLEAR_EVERY = 2;

/** Stół 2, top right, becomes *Single* - typed at 8 frames a character, the brief's pace. */
export const SINGLE_PASS: Pass = {
  tapTable: 60,
  tapEdit: 76,
  sheetUp: [78, 92],
  cameraToSheet: [76, 100],
  tapName: 100,
  clearFrom: 106,
  typeFrom: 124,
  every: 8,
  tapDone: 174,
  sheetDown: [176, 188],
  cameraBack: [176, 198],
};
export const TOOLBAR_IN = [60, 66] as const;
export const SINGLE_IN = [182, 190] as const;
export const SINGLE_OUT = [222, 228] as const;

/**
 * The jump cut, on the seam: the camera lands on Stół 5, bottom left, the
 * couple already scrolled down to it and the table already selected - the
 * tap and the pan are the first pass's, seen once.
 */
export const JUMP = 230;

/** Stół 5 becomes *Ciocie*, a little quicker - the viewer has seen the move. */
export const CIOCIE_PASS: Pass = {
  tapEdit: 238,
  sheetUp: [240, 252],
  cameraToSheet: [238, 256],
  tapName: 256,
  clearFrom: 260,
  typeFrom: 276,
  every: 6,
  tapDone: 314,
  sheetDown: [316, 328],
  cameraBack: [316, 334],
};
export const CIOCIE_IN = [322, 330] as const;
export const CIOCIE_OUT = [360, 366] as const;

/** Two fingers pinch the plan out to the whole room; the camera steps back with it. */
export const PINCH = [350, 374] as const;
export const CAMERA_WIDE = [348, 376] as const;
/** The payoff lands over the whole room and stays through the call to action. */
export const PAYOFF_IN = [364, 376] as const;

/** A tapped button reads as held for this long, as `active:` would show it. */
export const PRESS_HELD = 4;
