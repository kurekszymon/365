/**
 * The 18 s kitchen-report cut. Like the teaser it shares fps and both frame
 * sizes with the walkthrough (`../timeline`) and nothing else - its beats and
 * its crossfade live here.
 */
export const KITCHEN_REPORT_SCENES = {
  /** Three messages typed in one after another; the last settles at 116 and holds 50 frames before the cut. */
  hook: 174,
  tags: 120,
  sheet: 150,
  cta: 120,
};

/** A social cut: it cuts, it doesn't dissolve - the teaser's length. */
export const KITCHEN_REPORT_TRANSITION = 8;

const sceneFrames = Object.values(KITCHEN_REPORT_SCENES);

/** 540 frames - 18 s at 30 fps. */
export const KITCHEN_REPORT_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) -
  KITCHEN_REPORT_TRANSITION * (sceneFrames.length - 1);
