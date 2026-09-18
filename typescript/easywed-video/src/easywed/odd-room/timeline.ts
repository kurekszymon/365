import { TRANSITION } from "../timeline";

/**
 * The 12 s landing-page loop. It shares fps and the 16:9 frame with the
 * walkthrough (`../timeline`); its beats are its own.
 */
export const SHAPE_SCENES = {
  hook: 105,
  lShape: 150,
  edit: 135,
};

/** A page loop dissolves like the walkthrough rather than cutting like a Reel. */
export const SHAPE_TRANSITION = TRANSITION;

const sceneFrames = Object.values(SHAPE_SCENES);

/** 360 frames - 12 s at 30 fps: 390 of scenes less two 15-frame crossfades. */
export const SHAPE_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) - SHAPE_TRANSITION * (sceneFrames.length - 1);

/**
 * Each scene's frame 0 on the loop's clock. The three scenes are one continuous
 * shot of the planner, so every scene draws from that shared clock and a
 * crossfade lays identical frames over each other.
 */
export const SHAPE_STARTS = {
  hook: 0,
  lShape: SHAPE_SCENES.hook - SHAPE_TRANSITION,
  edit: SHAPE_SCENES.hook + SHAPE_SCENES.lShape - SHAPE_TRANSITION * 2,
};
