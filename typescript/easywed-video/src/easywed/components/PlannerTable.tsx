import React from "react";
import { interpolate, interpolateColors } from "remotion";
import type { TableSpec } from "../layouts";
import { SEAT_RADIUS, seatPositions } from "../geometry";
import { colors, fonts } from "../theme";

type Props = {
  table: TableSpec;
  /** Entrance animation, 0 = not placed yet, 1 = settled. */
  enter: number;
  /** Share of the table's seats that are taken, 0..1. */
  fill: number;
  /**
   * Per-seat override, indexed like `seatPositions(table)`, each 0..1. The seat
   * swap needs one chair to empty while the rest stay taken, which `fill` alone
   * - a share, filled in seat order - cannot say. Left out, the table fills in
   * order from `fill`, exactly as every published film draws it.
   */
  fills?: number[];
  /** Extra offset, used while a table is being dragged. */
  dx?: number;
  dy?: number;
  selected?: boolean;
  /**
   * The occupants' initials, indexed like `seatPositions(table)` - what
   * `TableSeats` writes on a taken marker (`getInitials`). Left out, markers
   * stay blank, as every published film draws them.
   */
  initials?: string[];
  /** The name's type size. The couple's own names run longer than *Stół 1*. */
  labelSize?: number;
};

/** `TableSeats`: `fontSize: Math.max(7, seatPx * 0.42)`, in white on the filled marker. */
const INITIALS_SIZE = SEAT_RADIUS * 2 * 0.42;

export const PlannerTable: React.FC<Props> = ({
  table,
  enter,
  fill,
  fills,
  dx = 0,
  dy = 0,
  selected,
  initials,
  labelSize = 22,
}) => {
  const seats = seatPositions(table);
  const takenSeats = fills ? fills.reduce((sum, seat) => sum + seat, 0) : fill * table.seats;
  // Scale about the table's own center so it grows into place, then shift by
  // the drag offset.
  const transform = `translate(${dx} ${dy}) translate(${table.x} ${table.y}) scale(${enter}) translate(${-table.x} ${-table.y})`;

  return (
    <g
      transform={transform}
      opacity={interpolate(enter, [0, 0.4], [0, 1], { extrapolateRight: "clamp" })}
    >
      {seats.map((seat, i) => {
        const taken =
          fills?.[i] ??
          interpolate(fill * table.seats, [i, i + 1], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
        // A small pop as the guest lands, settling back to the resting size.
        const pop = 1 + Math.sin(taken * Math.PI) * 0.35;
        return (
          <g key={i}>
            <circle
              cx={seat.x}
              cy={seat.y}
              r={SEAT_RADIUS * pop}
              fill={interpolateColors(taken, [0, 1], [colors.seatEmpty, colors.seatFilled])}
              stroke={interpolateColors(taken, [0, 1], [colors.seatEmptyBorder, colors.seatFilledBorder])}
              strokeWidth={1.5}
            />
            {initials?.[i] && taken > 0.5 ? (
              <text
                x={seat.x}
                y={seat.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily={fonts.sans}
                fontSize={INITIALS_SIZE}
                fontWeight={500}
                fill={colors.primaryInk}
              >
                {initials[i]}
              </text>
            ) : null}
          </g>
        );
      })}

      {table.shape === "round" ? (
        <circle
          cx={table.x}
          cy={table.y}
          r={table.width / 2}
          fill={colors.table}
          stroke={selected ? colors.selected : colors.tableBorder}
          strokeWidth={selected ? 3 : 1.5}
        />
      ) : (
        <rect
          x={table.x - table.width / 2}
          y={table.y - table.height / 2}
          width={table.width}
          height={table.height}
          rx={10}
          fill={colors.table}
          stroke={selected ? colors.selected : colors.tableBorder}
          strokeWidth={selected ? 3 : 1.5}
        />
      )}

      {/* Two lines, as on the canvas: the name in the heading face, the
          occupancy underneath in muted tabular digits. */}
      <text
        x={table.x}
        y={table.y - 2}
        textAnchor="middle"
        fontFamily={fonts.heading}
        fontSize={labelSize}
        fontWeight={600}
        fill={colors.tableInk}
      >
        {table.label}
      </text>
      <text
        x={table.x}
        y={table.y + 22}
        textAnchor="middle"
        fontFamily={fonts.sans}
        fontSize={17}
        fill={colors.tableInk}
        opacity={0.75}
      >
        {`${Math.round(takenSeats)} / ${table.seats}`}
      </text>
    </g>
  );
};
