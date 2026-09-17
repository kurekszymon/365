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
