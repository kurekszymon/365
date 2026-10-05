/**
 * The 18 s ten-tables cut, the third of the Instagram series, 9:16 only. It
 * shares fps and the portrait frame with the walkthrough (`../timeline`); its
 * beats are its own.
 */
export const TEN_TABLES_SCENES = {
  hook: 96,
  batch: 180,
  room: 180,
  cta: 108,
};

/** A social cut: it cuts, it doesn't dissolve - the teaser's length. */
export const TEN_TABLES_TRANSITION = 8;

const sceneFrames = Object.values(TEN_TABLES_SCENES);

/** 540 frames - 18 s at 30 fps: 564 of scenes less three 8-frame cuts. */
export const TEN_TABLES_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) - TEN_TABLES_TRANSITION * (sceneFrames.length - 1);

/**
 * Each scene's frame 0 on the cut's clock - 0, 88, 260, 432. The laptop runs
 * through every scene, so they all draw it from that one clock and a cut
 * between two of them never ghosts.
 */
export const TEN_TABLES_STARTS = {
  hook: 0,
  batch: TEN_TABLES_SCENES.hook - TEN_TABLES_TRANSITION,
  room: TEN_TABLES_SCENES.hook + TEN_TABLES_SCENES.batch - TEN_TABLES_TRANSITION * 2,
  cta: TEN_TABLES_SCENES.hook + TEN_TABLES_SCENES.batch + TEN_TABLES_SCENES.room - TEN_TABLES_TRANSITION * 3,
};
