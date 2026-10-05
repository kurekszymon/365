/**
 * The 22.7 s sunday-couch cut, for Reels and TikTok, 9:16 only. It shares fps
 * and the portrait frame with the walkthrough (`../timeline`); its beats are its own.
 */
export const SUNDAY_COUCH_SCENES = {
  hook: 96,
  hall: 180,
  seating: 210,
  done: 120,
  cta: 108,
};

/** A social cut: it cuts, it doesn't dissolve - the teaser's length. */
export const SUNDAY_COUCH_TRANSITION = 8;

const sceneFrames = Object.values(SUNDAY_COUCH_SCENES);

/** 682 frames - 22.7 s at 30 fps: 714 of scenes less four 8-frame cuts. */
export const SUNDAY_COUCH_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) - SUNDAY_COUCH_TRANSITION * (sceneFrames.length - 1);

type Scene = keyof typeof SUNDAY_COUCH_SCENES;

/**
 * Each scene's frame 0 on the cut's clock. The whole evening is one shot of
 * the laptop, so every scene draws from that shared clock and a cut lays
 * identical frames over each other.
 */
export const SUNDAY_COUCH_STARTS = (Object.keys(SUNDAY_COUCH_SCENES) as Scene[]).reduce(
  (starts, scene, i, scenes) => ({
    ...starts,
    [scene]:
      scenes.slice(0, i).reduce((sum, before) => sum + SUNDAY_COUCH_SCENES[before], 0) - SUNDAY_COUCH_TRANSITION * i,
  }),
  {} as Record<Scene, number>,
);
