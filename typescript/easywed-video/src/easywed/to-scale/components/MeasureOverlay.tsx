import React from "react";
import type { Point } from "../../geometry";
import { colors, fonts } from "../../theme";

/**
 * Redraws `planner/Canvas/MeasureOverlay.tsx`: a saved measurement is a dashed
 * teal line with a dot at each end, a white label at its midpoint and the small
 * red-crossed delete button off the label's top-right corner; the one being
 * placed is a fainter dot and a fainter dashed line to the pointer.
 *
 * The app draws in screen pixels; this draws in hall units, so every size is
 * the app's own multiplied up - `LINE` for the line and dots, `LABEL` for the
 * label, which is the payoff of the loop and has to read at half size.
 */
const LINE = 2.2;
const LABEL = 2.8;

/** `MeasureOverlay`'s delete button: `stroke-red-300` ring, `red-500` cross. */
const DELETE_RING = "#fca5a5";
const DELETE_CROSS = "#ef4444";

export const SavedMeasurement: React.FC<{
  a: Point;
  b: Point;
  label: string;
  /** Line and dots, 0..1. */
  line: number;
  /** The label's pop-in, 0..1. */
  pop: number;
}> = ({ a, b, label, line, pop }) => {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const labelWidth = Math.max(52, label.length * 6.5) * LABEL;
  const labelHeight = 20 * LABEL;
  const deleteX = mx + labelWidth / 2 + 5 * LABEL;
  const deleteY = my - labelHeight / 2 - 5 * LABEL;

  return (
    <g>
      <g opacity={line}>
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={colors.measure}
          strokeWidth={1.5 * LINE}
          strokeDasharray={`${5 * LINE} ${3 * LINE}`}
          opacity={0.85}
        />
        <circle cx={a.x} cy={a.y} r={6 * LINE} fill={colors.measure} opacity={0.9} />
        <circle cx={b.x} cy={b.y} r={6 * LINE} fill={colors.measure} opacity={0.9} />
      </g>

      <g
        opacity={Math.min(1, pop * 2)}
        transform={`translate(${mx} ${my}) scale(${0.7 + 0.3 * pop}) translate(${-mx} ${-my})`}
      >
        <rect
          x={mx - labelWidth / 2}
          y={my - labelHeight / 2}
          width={labelWidth}
          height={labelHeight}
          rx={4 * LABEL}
          fill={colors.paper}
          stroke={colors.measure}
          strokeWidth={1 * LABEL}
          opacity={0.95}
        />
        <text
          x={mx}
          y={my + 4 * LABEL}
          textAnchor="middle"
          fontFamily={fonts.sans}
          fontSize={10 * LABEL}
          fontWeight={600}
          fill={colors.measure}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {label}
        </text>

        <circle
          cx={deleteX}
          cy={deleteY}
          r={7 * LABEL}
          fill={colors.paper}
          stroke={DELETE_RING}
          strokeWidth={1.5 * LABEL}
          opacity={0.95}
        />
        {[1, -1].map((dir) => (
          <line
            key={dir}
            x1={deleteX - 2.5 * LABEL}
            y1={deleteY - 2.5 * LABEL * dir}
            x2={deleteX + 2.5 * LABEL}
            y2={deleteY + 2.5 * LABEL * dir}
            stroke={DELETE_CROSS}
            strokeWidth={1.5 * LABEL}
            strokeLinecap="round"
          />
        ))}
      </g>
    </g>
  );
};

/** The first point is down; the line follows the pointer to where the second would land. */
export const PendingMeasurement: React.FC<{ a: Point; end: Point }> = ({ a, end }) => (
  <g>
    <circle cx={a.x} cy={a.y} r={4 * LINE} fill={colors.measure} opacity={0.7} />
    <line
      x1={a.x}
      y1={a.y}
      x2={end.x}
      y2={end.y}
      stroke={colors.measure}
      strokeWidth={1.5 * LINE}
      strokeDasharray={`${4 * LINE} ${4 * LINE}`}
      opacity={0.5}
    />
  </g>
);
