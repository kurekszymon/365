import React from "react";
import { interpolate } from "remotion";
import type { Point } from "../geometry";
import type { HallLayout } from "../layouts";
import { colors, fonts } from "../theme";
import { PlannerTable } from "./PlannerTable";

type Props = {
  hall: HallLayout;
  /** Hall outline stroke draw-on, 0..1. */
  outline: number;
  /** Dance floor and fixtures fade-in, 0..1. */
  floor: number;
  /** Per-table entrance, indexed like `hall.tables`. */
  tableIn: number[];
  /** Per-table share of taken seats, indexed like `hall.tables`. */
  seatFill: number[];
  /** Per-table drag offset, indexed like `hall.tables`. */
  offsets?: Point[];
  selectedTableId?: string;
  /** Overlays drawn in canvas coordinates (cursor, flying guest chips). */
  children?: React.ReactNode;
};

const GRID = 40;

export const HallCanvas: React.FC<Props> = ({
  hall,
  outline,
  floor,
  tableIn,
  seatFill,
  offsets,
  selectedTableId,
  children,
}) => {
  const { canvas, danceFloor } = hall;
  const perimeter = (canvas.width + canvas.height) * 2;

  return (
    <svg
      viewBox={`-8 -8 ${canvas.width + 16} ${canvas.height + 16}`}
      width="100%"
      height="100%"
      style={{ display: "block" }}
    >
      <defs>
        <pattern id="hall-grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
          <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke={colors.border} strokeWidth={1} />
        </pattern>
      </defs>

      <rect
        x={0}
        y={0}
        width={canvas.width}
        height={canvas.height}
        fill="url(#hall-grid)"
        opacity={outline}
      />

      {/* The room outline draws itself on, like sketching the hall. */}
      <rect
        x={0}
        y={0}
        width={canvas.width}
        height={canvas.height}
        rx={10}
        fill="none"
        stroke={colors.hall}
        strokeWidth={5}
        strokeDasharray={perimeter}
        strokeDashoffset={interpolate(outline, [0, 1], [perimeter, 0])}
      />

      <g opacity={floor}>
        <rect
          x={danceFloor.x - danceFloor.width / 2}
          y={danceFloor.y - danceFloor.height / 2}
          width={danceFloor.width}
          height={danceFloor.height}
          rx={12}
          fill={colors.accentSoft}
          stroke={colors.accent}
          strokeWidth={3}
          strokeDasharray="12 10"
          opacity={0.9}
        />
        <text
          x={danceFloor.x}
          y={danceFloor.y + 8}
          textAnchor="middle"
          fontFamily={fonts.sans}
          fontSize={26}
          fontWeight={600}
          letterSpacing={2}
          fill={colors.accent}
        >
          DANCE FLOOR
        </text>

        {hall.fixtures.map((fixture) => (
          <g key={fixture.id}>
            <rect
              x={fixture.x - fixture.width / 2}
              y={fixture.y - fixture.height / 2}
              width={fixture.width}
              height={fixture.height}
              rx={10}
              fill={colors.bgDeep}
              stroke={colors.tableBorder}
              strokeWidth={3}
            />
            <text
              x={fixture.x}
              y={fixture.y + 8}
              textAnchor="middle"
              fontFamily={fonts.sans}
              fontSize={22}
              fontWeight={500}
              fill={colors.inkSoft}
            >
              {fixture.label}
            </text>
          </g>
        ))}
      </g>

      {hall.tables.map((table, i) => (
        <PlannerTable
          key={table.id}
          table={table}
          enter={tableIn[i] ?? 0}
          fill={seatFill[i] ?? 0}
          dx={offsets?.[i]?.x ?? 0}
          dy={offsets?.[i]?.y ?? 0}
          selected={selectedTableId === table.id}
        />
      ))}

      {children}
    </svg>
  );
};
