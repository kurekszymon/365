/**
 * The 17 s keep-apart cut, for Reels and TikTok, 9:16 only. It shares fps and
 * the portrait frame with the walkthrough (`../timeline`); its beats are its own.
 */
export const KEEP_APART_SCENES = {
  hook: 96,
  uncle: 150,
  parents: 180,
  cta: 108,
};

/** A social cut: it cuts, it doesn't dissolve - the teaser's length. */
export const KEEP_APART_TRANSITION = 8;

const sceneFrames = Object.values(KEEP_APART_SCENES);

/** 510 frames - 17 s at 30 fps: 534 of scenes less three 8-frame cuts. */
export const KEEP_APART_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) - KEEP_APART_TRANSITION * (sceneFrames.length - 1);

/**
 * Each scene's frame 0 on the cut's clock. The three planner scenes are one
 * continuous shot, so every scene draws from that shared clock and a cut lays
 * identical frames over each other.
 */
export const KEEP_APART_STARTS = {
  hook: 0,
  uncle: KEEP_APART_SCENES.hook - KEEP_APART_TRANSITION,
  parents: KEEP_APART_SCENES.hook + KEEP_APART_SCENES.uncle - KEEP_APART_TRANSITION * 2,
  cta:
    KEEP_APART_SCENES.hook + KEEP_APART_SCENES.uncle + KEEP_APART_SCENES.parents - KEEP_APART_TRANSITION * 3,
};
