/**
 * The 15 s social cut. It shares fps and both frame sizes with the walkthrough
 * (`../timeline`) but nothing else - a teaser's beats are its own, so its scene
 * lengths and its shorter crossfade live here.
 */
export const TEASER_SCENES = {
  hook: 90,
  chaos: 100,
  plan: 176,
  cta: 108,
};

/** Shorter than the walkthrough's: a teaser cuts, it doesn't dissolve. */
export const TEASER_TRANSITION = 8;

const sceneFrames = Object.values(TEASER_SCENES);

/** 450 frames - 15 s at 30 fps, the length Reels and TikTok favour. */
export const TEASER_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) -
  TEASER_TRANSITION * (sceneFrames.length - 1);
