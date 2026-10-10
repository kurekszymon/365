/**
 * The 16 s list-seat cut, the first of the Instagram series, 9:16 only. It
 * shares fps and the portrait frame with the walkthrough (`../timeline`); its
 * beats are its own.
 */
export const LIST_SEAT_SCENES = {
  hook: 96,
  tables: 150,
  seat: 150,
  cta: 108,
};

/** A social cut: it cuts, it doesn't dissolve - the teaser's length. */
export const LIST_SEAT_TRANSITION = 8;

const sceneFrames = Object.values(LIST_SEAT_SCENES);

/** 480 frames - 16 s at 30 fps: 504 of scenes less three 8-frame cuts. */
export const LIST_SEAT_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) - LIST_SEAT_TRANSITION * (sceneFrames.length - 1);

/**
 * Each scene's frame 0 on the cut's clock - 0, 88, 230, 372. The phone runs
 * through every scene, so they all draw it from that one clock and a cut
 * between two of them never ghosts.
 */
export const LIST_SEAT_STARTS = {
  hook: 0,
  tables: LIST_SEAT_SCENES.hook - LIST_SEAT_TRANSITION,
  seat: LIST_SEAT_SCENES.hook + LIST_SEAT_SCENES.tables - LIST_SEAT_TRANSITION * 2,
  cta: LIST_SEAT_SCENES.hook + LIST_SEAT_SCENES.tables + LIST_SEAT_SCENES.seat - LIST_SEAT_TRANSITION * 3,
};
