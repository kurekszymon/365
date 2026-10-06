import { LOOP_SLIDE } from "../../components/LoopReel";

/**
 * The extra-chair loop's beats, in order. It is one shot with no
 * `TransitionSeries`, so the beats add up with no seams to subtract.
 */
export const EXTRA_CHAIR_BEATS = {
  /** The full table slides in. */
  in: LOOP_SLIDE,
  /** 8 of 8, held. */
  full: 18,
  /** The count goes 8 -> 10; the chairs re-space and the two new ones grow in. */
  chairs: 30,
  /** 8 seated, 2 free. */
  free: 10,
  /** The two new chairs fill one after the other. */
  sit: 30,
  /** 10 of 10, held. */
  hold: 14,
  /** The table slides out. */
  out: LOOP_SLIDE,
};

/** Where each beat starts, composition-global. */
export const EXTRA_CHAIR_AT = {
  chairs: EXTRA_CHAIR_BEATS.in + EXTRA_CHAIR_BEATS.full,
  sit:
    EXTRA_CHAIR_BEATS.in +
    EXTRA_CHAIR_BEATS.full +
    EXTRA_CHAIR_BEATS.chairs +
    EXTRA_CHAIR_BEATS.free,
};

/** 18 + 18 + 30 + 10 + 30 + 14 + 18 = 138 frames (4.6 s). */
export const EXTRA_CHAIR_DURATION = Object.values(EXTRA_CHAIR_BEATS).reduce(
  (sum, beat) => sum + beat,
  0,
);
