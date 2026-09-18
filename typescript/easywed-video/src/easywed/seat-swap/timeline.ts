import { TRANSITION } from "../timeline";

/**
 * The 13 s landing-page loop. It shares fps and the 16:9 frame with the
 * walkthrough (`../timeline`); its beats are its own.
 */
export const SWAP_SCENES = {
  hook: 105,
  pick: 165,
  reseat: 150,
};

/** A page loop dissolves like the walkthrough rather than cutting like a Reel. */
export const SWAP_TRANSITION = TRANSITION;

const sceneFrames = Object.values(SWAP_SCENES);

/** 390 frames - 13 s at 30 fps: 420 of scenes less two 15-frame crossfades. */
export const SWAP_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) - SWAP_TRANSITION * (sceneFrames.length - 1);

/**
 * Each scene's frame 0 on the loop's clock. The three scenes are one continuous
 * shot of the planner, so every scene draws from that shared clock and a
 * crossfade lays identical frames over each other.
 */
export const SWAP_STARTS = {
  hook: 0,
  pick: SWAP_SCENES.hook - SWAP_TRANSITION,
  reseat: SWAP_SCENES.hook + SWAP_SCENES.pick - SWAP_TRANSITION * 2,
};

/**
 * The 17 s social cut of the same move, for Reels and TikTok - and 16:9 for
 * the feed. Its beats are its own: the names are typed into the popover's
 * search rather than scrolled to, and it closes on a call to action instead of
 * handing back to frame 0.
 */
export const SWAP_CUT_SCENES = {
  hook: 96,
  pick: 180,
  reseat: 150,
  cta: 108,
};

/** A social cut: it cuts, it doesn't dissolve - the teaser's length. */
export const SWAP_CUT_TRANSITION = 8;

const cutFrames = Object.values(SWAP_CUT_SCENES);

/** 510 frames - 17 s at 30 fps: 534 of scenes less three 8-frame cuts. */
export const SWAP_CUT_DURATION =
  cutFrames.reduce((sum, frames) => sum + frames, 0) - SWAP_CUT_TRANSITION * (cutFrames.length - 1);

/**
 * Each scene's frame 0 on the cut's clock. The three planner scenes are one
 * continuous shot, as in the loop, so a cut lays identical frames over each other.
 */
export const SWAP_CUT_STARTS = {
  hook: 0,
  pick: SWAP_CUT_SCENES.hook - SWAP_CUT_TRANSITION,
  reseat: SWAP_CUT_SCENES.hook + SWAP_CUT_SCENES.pick - SWAP_CUT_TRANSITION * 2,
  cta: SWAP_CUT_SCENES.hook + SWAP_CUT_SCENES.pick + SWAP_CUT_SCENES.reseat - SWAP_CUT_TRANSITION * 3,
};
