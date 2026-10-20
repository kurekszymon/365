import React from "react";
import {
  Easing,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { LOOP_MARK, LoopReel } from "../../components/LoopReel";
import { ORBIT, TableMark } from "../../components/TableMark";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";
import {
  SEAT_NUMBER_AT,
  SEAT_NUMBER_BEATS,
  SEAT_NUMBER_DURATION,
} from "./timeline";

/**
 * A 9:16 Reel on the `LoopReel` stage: the table slides in with all eight
 * chairs free, the chairs are numbered 1-8 clockwise from 12 o'clock - the
 * app's *Miejsce N* (`seats.numbered`), chair `i` being `seat-i` in
 * `computeSeatPositions`' order - then chair 5 at 6 o'clock is picked, a
 * guest drops onto it, and it slides out with that one chair taken. The app
 * draws initials on its seat markers, not numbers (`TableSeats.tsx`): the
 * numerals stand in for *Miejsce N*, as the mark stands in for a table.
 */

const SEATS = 8;
/** Chair 5, index 4 - 6 o'clock. Not 6: *„Posadź na miejscu 6”* is the list-seat cut's. */
const PICKED = 4;
/** A numeral starts this long after the one before it, and fades in over `NUMERAL_FADE`. */
const NUMERAL_STEP = 4;
const NUMERAL_FADE = 8;
/** Numerals sit outside the chairs and the widest ring (`ORBIT` + 18), in the mark's units. */
const NUMERAL_ORBIT = 74;
const NUMERAL_SIZE = 11;
/** How far the numerals reach past the mark's 120-unit box, in px - so the slide out still clears them. */
const NUMERAL_OVERHANG =
  ((NUMERAL_ORBIT + NUMERAL_SIZE - 60) * LOOP_MARK) / 120;
/** Frames the guest takes to drop onto the chair; the chair fills as it lands. */
const DROP = 14;
/** The guest fades in over the drop's first frames rather than popping on. */
const DROP_FADE = 4;
/** The drop starts this much larger - in the air over the table - and lands at a chair's size. */
const DROP_LIFT = 0.7;
/** The drop bows out to the right of a straight fall, in the mark's units. */
const DROP_BOW = 36;
/** A seated chair's radius in the mark (`TableMark`: 9 + a fill of 1). */
const GUEST_RADIUS = 10;

export const SeatNumber: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const landed = SEAT_NUMBER_AT.land + DROP;
  const fill = spring({
    frame: frame - landed,
    fps,
    config: { damping: 9, mass: 0.5 },
  });
  const fills = Array.from({ length: SEATS }, (_, seat) =>
    seat === PICKED ? fill : 0,
  );

  const picked = interpolate(
    frame,
    [
      SEAT_NUMBER_AT.highlight,
      SEAT_NUMBER_AT.highlight + SEAT_NUMBER_BEATS.highlight,
    ],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );

  // The guest's way down: from over the table's centre to chair 5, falling faster as it goes.
  const drop = interpolate(frame, [SEAT_NUMBER_AT.land, landed], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });
  const chairY = Math.sin((PICKED / SEATS) * Math.PI * 2 - Math.PI / 2) * ORBIT;
  const guestX = 2 * (1 - drop) * drop * DROP_BOW;
  const guestY = drop * drop * chairY;
  const guestOpacity =
    frame < SEAT_NUMBER_AT.land
      ? 0
      : interpolate(
          frame,
          [SEAT_NUMBER_AT.land, SEAT_NUMBER_AT.land + DROP_FADE],
          [0, 1],
          { extrapolateRight: "clamp" },
        ) *
        (1 - Math.min(fill, 1));

  return (
    <LoopReel
      motto={tl.seatNumber.motto}
      durationInFrames={SEAT_NUMBER_DURATION}
      overhang={NUMERAL_OVERHANG}
    >
      <TableMark
        size={LOOP_MARK}
        fills={fills}
        // Until the guest lands the pick breathes the ring; from then on the fill does, as in stress-away.
        highlight={
          frame < landed ? { seat: PICKED, progress: picked } : undefined
        }
        labels={({ index, angle }) => (
          <>
            <text
              x={Math.cos(angle) * NUMERAL_ORBIT}
              y={Math.sin(angle) * NUMERAL_ORBIT}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={fonts.sans}
              fontSize={NUMERAL_SIZE}
              fontWeight={500}
              fill={
                index === PICKED
                  ? interpolateColors(
                      picked,
                      [0, 1],
                      [colors.inkSoft, colors.terracotta],
                    )
                  : colors.inkSoft
              }
              opacity={interpolate(
                frame,
                [
                  SEAT_NUMBER_AT.numerals + index * NUMERAL_STEP,
                  SEAT_NUMBER_AT.numerals + index * NUMERAL_STEP + NUMERAL_FADE,
                ],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              )}
            >
              {index + 1}
            </text>
            {/* The guest rides on chair 5's label so it draws over the chairs. */}
            {index === PICKED ? (
              <circle
                cx={guestX}
                cy={guestY}
                r={GUEST_RADIUS * (1 + DROP_LIFT * (1 - drop))}
                fill={colors.terracotta}
                opacity={guestOpacity}
              />
            ) : null}
          </>
        )}
      />
    </LoopReel>
  );
};
