/**
 * The 25.5 s try-now speedrun, episode 4 of the Instagram series, 9:16 only.
 * It shares fps and the portrait frame with the walkthrough (`../timeline`);
 * its beats are its own.
 */
export const TRY_NOW_SCENES = {
  hook: 96,
  /** The seeded hall, then the first table in from the add hub. */
  table: 225,
  /** The first guest typed in and seated from the table's form - the clock stops in it. */
  seat: 360,
  cta: 108,
};

/** A social cut: it cuts, it doesn't dissolve - the teaser's length. */
export const TRY_NOW_TRANSITION = 8;

const sceneFrames = Object.values(TRY_NOW_SCENES);

/** 765 frames - 25.5 s at 30 fps: 789 of scenes less three 8-frame cuts. */
export const TRY_NOW_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) - TRY_NOW_TRANSITION * (sceneFrames.length - 1);

/**
 * Each scene's frame 0 on the cut's clock - 0, 88, 305, 657. The phone and the
 * stopwatch run through every scene, so they all draw them from that one clock
 * and a cut between two of them never ghosts, nor skips a second of the run.
 */
export const TRY_NOW_STARTS = {
  hook: 0,
  table: TRY_NOW_SCENES.hook - TRY_NOW_TRANSITION,
  seat: TRY_NOW_SCENES.hook + TRY_NOW_SCENES.table - TRY_NOW_TRANSITION * 2,
  cta: TRY_NOW_SCENES.hook + TRY_NOW_SCENES.table + TRY_NOW_SCENES.seat - TRY_NOW_TRANSITION * 3,
};
