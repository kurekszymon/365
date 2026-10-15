/**
 * The 18 s mama-link cut, for Reels and TikTok, 9:16 only. It shares fps and
 * the portrait frame with the walkthrough (`../timeline`); its beats are its own.
 */
export const MAMA_SCENES = {
  hook: 96,
  invite: 180,
  phone: 180,
  cta: 108,
};

/** A social cut: it cuts, it doesn't dissolve - the teaser's length. */
export const MAMA_TRANSITION = 8;

const sceneFrames = Object.values(MAMA_SCENES);

/** 540 frames - 18 s at 30 fps: 564 of scenes less three 8-frame cuts. */
export const MAMA_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) - MAMA_TRANSITION * (sceneFrames.length - 1);

/**
 * Each scene's frame 0 on the cut's clock. Mum's phone runs through three of
 * the four scenes, so they all draw from that shared clock, and the laptop in
 * between keeps to it too.
 */
export const MAMA_STARTS = {
  hook: 0,
  invite: MAMA_SCENES.hook - MAMA_TRANSITION,
  phone: MAMA_SCENES.hook + MAMA_SCENES.invite - MAMA_TRANSITION * 2,
  cta: MAMA_SCENES.hook + MAMA_SCENES.invite + MAMA_SCENES.phone - MAMA_TRANSITION * 3,
};
