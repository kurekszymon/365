import { LOOP_SLIDE } from "../../components/LoopReel";

/**
 * The seat-number loop's beats, in order. It is one shot with no
 * `TransitionSeries`, so the beats add up with no seams to subtract.
 */
export const SEAT_NUMBER_BEATS = {
  /** The empty table slides in. */
  in: LOOP_SLIDE,
  /** Eight free chairs, held. */
  empty: 6,
  /** Numerals 1-8 come in clockwise from 12 o'clock. */
  numerals: 36,
  /** All eight numbered, held. */
  numbered: 10,
  /** Chair 5 breathes its ring and its numeral turns terracotta. */
  highlight: 16,
  /** The guest drops onto chair 5 and it fills. */
  land: 20,
  /** The fill's bounce settles. */
  settle: 10,
  /** One guest on chair 5, held. */
  hold: 14,
  /** The table slides out, numerals with it. */
  out: LOOP_SLIDE,
};

/** Where each beat starts, composition-global. */
export const SEAT_NUMBER_AT = {
  numerals: SEAT_NUMBER_BEATS.in + SEAT_NUMBER_BEATS.empty,
  highlight:
    SEAT_NUMBER_BEATS.in +
    SEAT_NUMBER_BEATS.empty +
    SEAT_NUMBER_BEATS.numerals +
    SEAT_NUMBER_BEATS.numbered,
  land:
    SEAT_NUMBER_BEATS.in +
    SEAT_NUMBER_BEATS.empty +
    SEAT_NUMBER_BEATS.numerals +
    SEAT_NUMBER_BEATS.numbered +
    SEAT_NUMBER_BEATS.highlight,
};

/** 18 + 6 + 36 + 10 + 16 + 20 + 10 + 14 + 18 = 148 frames (4.9 s). */
export const SEAT_NUMBER_DURATION = Object.values(SEAT_NUMBER_BEATS).reduce(
  (sum, beat) => sum + beat,
  0,
);
