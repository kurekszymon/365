import React from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { LOOP_MARK, LoopReel } from "../../components/LoopReel";
import { TableMark } from "../../components/TableMark";
import { tl } from "../../i18n";
import {
  EXTRA_CHAIR_AT,
  EXTRA_CHAIR_BEATS,
  EXTRA_CHAIR_DURATION,
} from "./timeline";

/**
 * A 9:16 Reel on the `LoopReel` stage: the table slides in full, 8 of 8, its
 * seat count goes to 10 - the eight chairs close up round the same table, as
 * `computeSeatPositions` re-spaces a round table, and the two new ones come in
 * as the last two seats clockwise, where `seat-8` and `seat-9` sit in the app -
 * then two more guests sit down and it slides out full.
 */

const BEFORE = 8;
const AFTER = 10;
/** The second new chair fills this long after the first. */
const SECOND_SITS = 16;
/** „więcej przy tym samym stole” is ~1120 px at the stage's 88 and the stage gives it 1016. */
const MOTTO_SIZE = 76;

export const ExtraChair: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const seats = interpolate(
    frame,
    [EXTRA_CHAIR_AT.chairs, EXTRA_CHAIR_AT.chairs + EXTRA_CHAIR_BEATS.chairs],
    [BEFORE, AFTER],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    },
  );

  // The eight already seated stay put; the new chairs fill with stress-away's bounce.
  const fills = Array.from({ length: AFTER }, (_, seat) =>
    seat < BEFORE
      ? 1
      : spring({
          frame:
            frame -
            EXTRA_CHAIR_AT.sit -
            (seat === BEFORE ? 0 : SECOND_SITS),
          fps,
          config: { damping: 9, mass: 0.5 },
        }),
  );

  return (
    <LoopReel
      motto={tl.extraChair.motto}
      durationInFrames={EXTRA_CHAIR_DURATION}
      textSize={MOTTO_SIZE}
    >
      <TableMark size={LOOP_MARK} fills={fills} seats={seats} />
    </LoopReel>
  );
};
