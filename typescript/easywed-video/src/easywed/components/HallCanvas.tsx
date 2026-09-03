import React from "react";
import { interpolate } from "remotion";
import type { Point } from "../geometry";
import type { HallLayout } from "../layouts";
import { PX_PER_M } from "../layouts";
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

/** Room around the hall for the dimension labels and the room chip. */
const PAD = { left: 46, top: 62, right: 76, bottom: 34 };

/** A fixture, drawn the way the app draws one: slate on a cream floor. */
const Fixture: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  radius?: number;
}> = ({ x, y, width, height, label, radius = 6 }) => (
  <g>
    <rect
      x={x - width / 2}
      y={y - height / 2}
      width={width}
      height={height}
      rx={radius}
      fill={colors.fixture}
      stroke={colors.fixtureBorder}
      strokeWidth={1.5}
    />
    <text
      x={x}
      y={y + 7}
      textAnchor="middle"
      fontFamily={fonts.sans}
      fontSize={20}
      fontWeight={500}
      fill={colors.fixtureInk}
    >
      {label}
    </text>
  </g>
);

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
  const { canvas, danceFloor, meters } = hall;
  const perimeter = (canvas.width + canvas.height) * 2;
  const chipLabel = `${hall.name} · ${meters.width}×${meters.height} m`;
  const chipWidth = 22 + chipLabel.length * 10.6;

  return (
    <svg
      viewBox={`${-PAD.left} ${-PAD.top} ${canvas.width + PAD.left + PAD.right} ${
        canvas.height + PAD.top + PAD.bottom
      }`}
      width="100%"
      height="100%"
      style={{ display: "block" }}
    >
      <defs>
        {/* Two rulings, like the app's ruled-paper grid: 1 m fine, 5 m firmer. */}
        <pattern id="hall-grid" width={PX_PER_M} height={PX_PER_M} patternUnits="userSpaceOnUse">
          <path
            d={`M ${PX_PER_M} 0 L 0 0 0 ${PX_PER_M}`}
            fill="none"
            stroke={colors.grid}
            strokeOpacity={0.5}
            strokeWidth={1}
          />
        </pattern>
        <pattern
          id="hall-grid-major"
          width={PX_PER_M * 5}
          height={PX_PER_M * 5}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${PX_PER_M * 5} 0 L 0 0 0 ${PX_PER_M * 5}`}
            fill="none"
            stroke={colors.grid}
            strokeOpacity={0.75}
            strokeWidth={1.5}
          />
        </pattern>
      </defs>

      <g opacity={outline}>
        <rect x={0} y={0} width={canvas.width} height={canvas.height} fill={colors.bg} />
        <rect x={0} y={0} width={canvas.width} height={canvas.height} fill="url(#hall-grid)" />
        <rect x={0} y={0} width={canvas.width} height={canvas.height} fill="url(#hall-grid-major)" />
      </g>

      {/* The room outline draws itself on, like sketching the hall. */}
      <rect
        x={0}
        y={0}
        width={canvas.width}
        height={canvas.height}
        fill="none"
        stroke={colors.hall}
        strokeWidth={1.5}
        strokeDasharray={perimeter}
        strokeDashoffset={interpolate(outline, [0, 1], [perimeter, 0])}
      />

      {/* Dimension labels sit outside the walls, as on the canvas. */}
      <g opacity={outline} fill={colors.hall} fontFamily={fonts.sans} fontSize={21} fontWeight={500}>
        <text x={canvas.width / 2} y={-22} textAnchor="middle">
          {`${meters.width} m`}
        </text>
        <text
          x={canvas.width + 30}
          y={canvas.height / 2}
          textAnchor="middle"
          transform={`rotate(-90 ${canvas.width + 30} ${canvas.height / 2})`}
        >
          {`${meters.height} m`}
        </text>
      </g>

      {/* The hall's own label chip, grip handle and all. */}
      <g opacity={outline}>
        <rect
          x={14}
          y={14}
          width={chipWidth}
          height={38}
          rx={8}
          fill={colors.card}
          stroke={colors.border}
          strokeWidth={1.5}
        />
        {[0, 1].map((col) =>
          [0, 1, 2].map((row) => (
            <circle
              key={`${col}-${row}`}
              cx={27 + col * 7}
              cy={25 + row * 7}
              r={1.8}
              fill={colors.inkSoft}
            />
          )),
        )}
        <text x={46} y={39} fontFamily={fonts.sans} fontSize={20} fill={colors.ink}>
          {chipLabel}
        </text>
      </g>

      <g opacity={floor}>
        <Fixture
          x={danceFloor.x}
          y={danceFloor.y}
          width={danceFloor.width}
          height={danceFloor.height}
          label="Parkiet"
          radius={24}
        />
        {hall.fixtures.map((fixture) => (
          <Fixture key={fixture.id} {...fixture} />
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
