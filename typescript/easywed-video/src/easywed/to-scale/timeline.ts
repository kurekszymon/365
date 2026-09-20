import { TRANSITION } from "../timeline";

/**
 * The 12 s landing-page loop. It shares fps and the 16:9 frame with the
 * walkthrough (`../timeline`); its beats are its own.
 */
export const SCALE_SCENES = {
  hook: 120,
  measure: 150,
  gap: 120,
};

/** A page loop dissolves like the walkthrough rather than cutting like a Reel. */
export const SCALE_TRANSITION = TRANSITION;

const sceneFrames = Object.values(SCALE_SCENES);

/** 360 frames - 12 s at 30 fps: 390 of scenes less two 15-frame crossfades. */
export const SCALE_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) - SCALE_TRANSITION * (sceneFrames.length - 1);

/**
 * Each scene's frame 0 on the loop's clock. The three scenes are one continuous
 * shot of the planner, so every scene draws from that shared clock and a
 * crossfade lays identical frames over each other.
 */
export const SCALE_STARTS = {
  hook: 0,
  measure: SCALE_SCENES.hook - SCALE_TRANSITION,
  gap: SCALE_SCENES.hook + SCALE_SCENES.measure - SCALE_TRANSITION * 2,
};
