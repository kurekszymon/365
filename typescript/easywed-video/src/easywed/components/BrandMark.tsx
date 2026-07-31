import React from "react";
import { interpolate, interpolateColors } from "remotion";
import { colors } from "../theme";
import { range } from "../geometry";

/**
 * Geometry lifted from `public/easywed-icon.svg`, re-centered on 0,0: a table of
 * radius 33 with eight seats orbiting at 47. The two seats at 12 and 3 o'clock
 * are the terracotta "taken" ones in the real logo.
 */
const TABLE_RADIUS = 33;
const ORBIT = 47;
const SEATS = range(8).map((i) => ({
  angle: (i / 8) * Math.PI * 2 - Math.PI / 2,
  taken: i === 0 || i === 2,
}));

type Props = {
  size: number;
  /** 0 = table only, 1 = every seat placed. */
  seatProgress: number;
  /** 0 = all seats free (green), 1 = the logo's two taken seats. */
  fillProgress: number;
};

export const BrandMark: React.FC<Props> = ({ size, seatProgress, fillProgress }) => {
  return (
    <svg width={size} height={size} viewBox="-60 -60 120 120" style={{ overflow: "visible" }}>
      <circle cx={0} cy={0} r={TABLE_RADIUS} fill={colors.brandGreen} />
      {SEATS.map((seat, i) => {
        const start = (i / SEATS.length) * 0.7;
        const appear = interpolate(seatProgress, [start, start + 0.3], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const taken = seat.taken ? fillProgress : 0;
        const radius = (seat.taken ? 10 : 9) * appear * (1 + taken * 0.12);
        return (
          <circle
            key={i}
            cx={Math.cos(seat.angle) * ORBIT}
            cy={Math.sin(seat.angle) * ORBIT}
            r={Math.max(radius, 0)}
            fill={interpolateColors(taken, [0, 1], [colors.brandGreenSoft, colors.terracotta])}
          />
        );
      })}
    </svg>
  );
};
