/**
 * The 16 s table-shape cut, the second of the Instagram series, 9:16 only. It
 * shares fps and the portrait frame with the walkthrough (`../timeline`); its
 * beats are its own.
 */
export const TABLE_SHAPE_SCENES = {
  hook: 96,
  shape: 150,
  turn: 150,
  cta: 108,
};

/** A social cut: it cuts, it doesn't dissolve - the teaser's length. */
export const TABLE_SHAPE_TRANSITION = 8;

const sceneFrames = Object.values(TABLE_SHAPE_SCENES);

/** 480 frames - 16 s at 30 fps: 504 of scenes less three 8-frame cuts. */
export const TABLE_SHAPE_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) - TABLE_SHAPE_TRANSITION * (sceneFrames.length - 1);

/**
 * Each scene's frame 0 on the cut's clock - 0, 88, 230, 372. The phone runs
 * through every scene, so they all draw it from that one clock and a cut
 * between two of them never ghosts.
 */
export const TABLE_SHAPE_STARTS = {
  hook: 0,
  shape: TABLE_SHAPE_SCENES.hook - TABLE_SHAPE_TRANSITION,
  turn: TABLE_SHAPE_SCENES.hook + TABLE_SHAPE_SCENES.shape - TABLE_SHAPE_TRANSITION * 2,
  cta: TABLE_SHAPE_SCENES.hook + TABLE_SHAPE_SCENES.shape + TABLE_SHAPE_SCENES.turn - TABLE_SHAPE_TRANSITION * 3,
};
