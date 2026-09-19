import { SCENES, TRANSITION } from "../timeline";
import { IMPORT_EXCEL_SCENES } from "../import-excel/timeline";
import { KIDS_SCENES } from "../kids-count/timeline";
import { KITCHEN_REPORT_SCENES } from "../kitchen-report/timeline";
import { SHAPE_SCENES } from "../odd-room/timeline";
import { SWAP_CUT_SCENES, SWAP_CUT_STARTS } from "../seat-swap/timeline";
import { SCALE_SCENES } from "../to-scale/timeline";

/**
 * The long walkthrough for YouTube, 16:9 only. It shares fps, the frame and the
 * crossfade with the short walkthrough (`../timeline`); most of its chapters
 * are other films' scenes, so their lengths are read from those films rather
 * than copied. Floors is its one new scene.
 */
export const WALKTHROUGH_LONG_SCENES = {
  intro: SCENES.intro,
  hall: SCENES.hall,
  floors: 240,
  shapeL: SHAPE_SCENES.lShape,
  shapeEdit: SHAPE_SCENES.edit,
  importDrop: IMPORT_EXCEL_SCENES.drop,
  importMap: IMPORT_EXCEL_SCENES.map,
  guests: SCENES.guests,
  seating: SCENES.seating,
  kidsTag: KIDS_SCENES.tag,
  kidsCount: KIDS_SCENES.count,
  scaleMeasure: SCALE_SCENES.measure,
  swapPick: SWAP_CUT_SCENES.pick,
  swapReseat: SWAP_CUT_SCENES.reseat,
  reportSheet: KITCHEN_REPORT_SCENES.sheet,
  outro: SCENES.outro,
};

/** A walkthrough dissolves; it doesn't cut like a Reel. */
export const WALKTHROUGH_LONG_TRANSITION = TRANSITION;

const sceneFrames = Object.values(WALKTHROUGH_LONG_SCENES);

/** 2490 frames - 83 s at 30 fps: 2715 of scenes less fifteen 15-frame crossfades. */
export const WALKTHROUGH_LONG_DURATION =
  sceneFrames.reduce((sum, frames) => sum + frames, 0) - WALKTHROUGH_LONG_TRANSITION * (sceneFrames.length - 1);

/**
 * The swap chapters are one continuous shot on the social cut's clock, which
 * seams them over 8 frames. Here the seam is 15, so the reseat starts on the
 * frame the pick's crossfade begins, and both sides draw the same pose.
 */
export const SWAP_RESEAT_START =
  SWAP_CUT_STARTS.pick + WALKTHROUGH_LONG_SCENES.swapPick - WALKTHROUGH_LONG_TRANSITION;
