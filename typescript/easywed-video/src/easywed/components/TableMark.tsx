import React from "react";
import { interpolateColors } from "remotion";
import { colors } from "../theme";

/**
 * The logo's table as a moving part, for the 9:16 brand loops: a table of
 * radius 33 with its chairs orbiting at 47 (`public/easywed-icon.svg`, as in
 * `BrandMark`). Chairs sit evenly from 12 o'clock clockwise, the way
 * `Canvas/seatLayout.ts` `computeSeatPositions` seats a round table, so
 * chair `i` is the app's *Miejsce i + 1*.
 */
const TABLE_RADIUS = 33;
const ORBIT = 47;

export type SeatAt = {
  /** 0-based, clockwise from 12 o'clock. */
  index: number;
  /** Radians, 0 at 3 o'clock - so 12 o'clock is `-π/2`. */
  angle: number;
};

type Props = {
  size: number;
  /** One per chair: 0 = free (soft green), 1 = a guest seated (terracotta); a spring past 1 swells the chair. */
  fills: number[];
  /** Drawn over the chairs, in the mark's own units (the table's centre at 0,0, the orbit at 47). */
  labels?: (seat: SeatAt) => React.ReactNode;
  /** A chair that breathes its ring without filling, `progress` pacing the ring as a fill does. */
  highlight?: { seat: number; progress: number };
  /**
   * The seat count the chairs are spaced for, `fills.length` by default. It can
   * be fractional while chairs are added: chair `i` sits at `i / seats` of a
   * turn, as `computeSeatPositions` spaces it for a whole count, and a chair at
   * or past `seats` is still growing in from under 12 o'clock's.
   */
  seats?: number;
};

export const TableMark: React.FC<Props> = ({
  size,
  fills,
  labels,
  highlight,
  seats: spacedFor = fills.length,
}) => {
  const seats = fills.map((fill, index) => ({
    index,
    fill,
    angle: (index / spacedFor) * Math.PI * 2 - Math.PI / 2,
    grown: Math.min(Math.max(spacedFor - index, 0), 1),
  }));
  // Chairs still growing go underneath, so they come out from under the others.
  const drawOrder = [
    ...seats.filter((seat) => seat.grown < 1),
    ...seats.filter((seat) => seat.grown === 1),
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="-60 -60 120 120"
      style={{ overflow: "visible" }}
    >
      <circle r={TABLE_RADIUS} fill={colors.brandGreen} />
      {drawOrder.map(({ index, fill, angle, grown }) => {
        const cx = Math.cos(angle) * ORBIT;
        const cy = Math.sin(angle) * ORBIT;
        const settled = Math.min(fill, 1);
        const ring =
          highlight?.seat === index ? Math.min(highlight.progress, 1) : settled;
        return (
          <g key={index}>
            {/* A soft ring that breathes out as the guest sits down. */}
            <circle
              cx={cx}
              cy={cy}
              r={(10 + ring * 8) * grown}
              fill="none"
              stroke={colors.terracotta}
              strokeWidth={1.5}
              opacity={ring > 0 && ring < 1 ? (1 - ring) * 0.6 : 0}
            />
            <circle
              cx={cx}
              cy={cy}
              r={(9 + fill) * grown}
              fill={interpolateColors(
                settled,
                [0, 1],
                [colors.brandGreenSoft, colors.terracotta],
              )}
            />
          </g>
        );
      })}
      {labels
        ? seats.map(({ index, angle }) => (
            <React.Fragment key={index}>
              {labels({ index, angle })}
            </React.Fragment>
          ))
        : null}
    </svg>
  );
};
