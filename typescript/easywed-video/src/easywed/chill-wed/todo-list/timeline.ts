/**
 * The 15 s todo-list cut, the fifth of the Instagram series, 9:16 only. It
 * shares fps and the portrait frame with the walkthrough (`../timeline`); its
 * beats are its own.
 */
export const TODO_LIST_SCENES = {
  hook: 96,
  list: 150,
  add: 120,
  cta: 108,
};

/** A social cut: it cuts, it doesn't dissolve - the teaser's length. */
export const TODO_LIST_TRANSITION = 8;

const sceneFrames = Object.values(TODO_LIST_SCENES);

/** 450 frames - 15 s at 30 fps: 474 of scenes less three 8-frame cuts. */
export const TODO_LIST_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) - TODO_LIST_TRANSITION * (sceneFrames.length - 1);

/**
 * Each scene's frame 0 on the cut's clock - 0, 88, 230, 342. The phone runs
 * through every scene, so they all draw it from that one clock and a cut
 * between two of them never ghosts - except where a scene asks for the jump.
 */
export const TODO_LIST_STARTS = {
  hook: 0,
  list: TODO_LIST_SCENES.hook - TODO_LIST_TRANSITION,
  add: TODO_LIST_SCENES.hook + TODO_LIST_SCENES.list - TODO_LIST_TRANSITION * 2,
  cta: TODO_LIST_SCENES.hook + TODO_LIST_SCENES.list + TODO_LIST_SCENES.add - TODO_LIST_TRANSITION * 3,
};
