/**
 * The 16 s ciocie-single cut, 9:16 only. It shares fps and the portrait frame
 * with the walkthrough (`../../timeline`); its beats are its own.
 */
export const CIOCIE_SCENES = {
  hook: 96,
  single: 150,
  ciocie: 150,
  cta: 108,
};

/** A social cut: it cuts, it doesn't dissolve - the teaser's length. */
export const CIOCIE_TRANSITION = 8;

const sceneFrames = Object.values(CIOCIE_SCENES);

/** 480 frames - 16 s at 30 fps: 504 of scenes less three 8-frame cuts. */
export const CIOCIE_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) - CIOCIE_TRANSITION * (sceneFrames.length - 1);

/**
 * Each scene's frame 0 on the cut's clock - 0, 88, 230, 372. The phone runs
 * through every scene, so they all draw it from that one clock and a cut
 * between two of them never ghosts.
 */
export const CIOCIE_STARTS = {
  hook: 0,
  single: CIOCIE_SCENES.hook - CIOCIE_TRANSITION,
  ciocie: CIOCIE_SCENES.hook + CIOCIE_SCENES.single - CIOCIE_TRANSITION * 2,
  cta: CIOCIE_SCENES.hook + CIOCIE_SCENES.single + CIOCIE_SCENES.ciocie - CIOCIE_TRANSITION * 3,
};
