export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** 9:16 cut for Reels/TikTok/Stories. Scenes adapt via `useFormat()`. */
export const VERTICAL_WIDTH = 1080;
export const VERTICAL_HEIGHT = 1920;

/** Per-scene lengths, in frames. */
export const SCENES = {
  intro: 120,
  hall: 210,
  guests: 180,
  seating: 240,
  outro: 150,
};

/** Crossfade length between two scenes, in frames. */
export const TRANSITION = 15;

const sceneFrames = Object.keys(SCENES).map((key) => SCENES[key as keyof typeof SCENES]);

/**
 * A `TransitionSeries` overlaps neighbours, so the composition is shorter than
 * the sum of its scenes by one transition per seam.
 */
export const TOTAL_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) - TRANSITION * (sceneFrames.length - 1);
