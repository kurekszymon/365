/**
 * The 17 s kids-count cut. Like the teaser it shares fps and both frame sizes
 * with the walkthrough (`../timeline`) and nothing else - its beats and its
 * crossfade live here.
 */
export const KIDS_SCENES = {
  hook: 96,
  /** Two guests tagged on camera, with a hard cut between them at local frame 72. */
  tag: 180,
  count: 150,
  cta: 108,
};

/** A social cut: it cuts, it doesn't dissolve - the teaser's length. */
export const KIDS_TRANSITION = 8;

const sceneFrames = Object.values(KIDS_SCENES);

/** 510 frames - 17 s at 30 fps: 534 of scenes less three 8-frame cuts. */
export const KIDS_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) - KIDS_TRANSITION * (sceneFrames.length - 1);
