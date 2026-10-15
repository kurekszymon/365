/**
 * The 20 s import cut. Like the teaser it shares fps and both frame sizes with
 * the walkthrough (`../timeline`) and nothing else - its beats and its crossfade
 * live here.
 */
export const IMPORT_EXCEL_SCENES = {
  hook: 90,
  drop: 150,
  map: 180,
  landed: 204,
};

/** A social cut: it cuts, it doesn't dissolve - the teaser's length. */
export const IMPORT_EXCEL_TRANSITION = 8;

const sceneFrames = Object.values(IMPORT_EXCEL_SCENES);

/** 600 frames - 20 s at 30 fps. */
export const IMPORT_EXCEL_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) -
  IMPORT_EXCEL_TRANSITION * (sceneFrames.length - 1);
