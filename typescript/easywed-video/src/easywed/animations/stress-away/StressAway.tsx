import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { LOOP_MARK, LoopReel } from "../../components/LoopReel";
import { TableMark } from "../../components/TableMark";
import { tl } from "../../i18n";

/**
 * A 9:16 Reel on the `LoopReel` stage: the table slides in empty from the
 * left, seats 12 and 3 o'clock first so it becomes the logo, then the other
 * six one at a time in a shuffled order, and slides out full to the right.
 */

/** Seat indices clockwise from 12 o'clock: the logo's two, then the rest shuffled. */
const FILL_ORDER = [0, 2, 5, 1, 4, 7, 3, 6];
/** The logo's two close together, a beat to read it, then the rest in quick succession. */
const FILL_AT = [28, 46, 76, 84, 92, 100, 108, 116];

/** The last guest's bounce settles by 130, where the slide out begins. */
export const STRESS_AWAY_DURATION = 148;

export const StressAway: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fills = Array.from({ length: 8 }, (_, seat) =>
    spring({
      frame: frame - FILL_AT[FILL_ORDER.indexOf(seat)],
      fps,
      config: { damping: 9, mass: 0.5 },
    }),
  );

  return (
    <LoopReel
      motto={tl.stressAway.motto}
      durationInFrames={STRESS_AWAY_DURATION}
    >
      <TableMark size={LOOP_MARK} fills={fills} />
    </LoopReel>
  );
};
