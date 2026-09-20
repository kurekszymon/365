import React from "react";
import { polygonPoints, type Point } from "../../geometry";
import { colors } from "../../theme";

/**
 * Redraws `planner/Canvas/ShapeEditOverlay.tsx` for a hall: the live outline
 * in the planner's selection colour (`fill-planner-selected/10
 * stroke-planner-selected`), a hollow dashed marker at every edge's midpoint
 * (`MIDPOINT_R = 4.5`) and a filled handle on every vertex (`HANDLE_R = 6`,
 * `stroke-card` at 2). Drawn inside `HallCanvas`, in canvas units; `px` is how
 * many canvas units make one of the app's screen pixels, since the app sizes
 * the handles on screen rather than in the room.
 */
export const VertexHandles: React.FC<{ vertices: Point[]; px: number; opacity: number }> = ({
  vertices,
  px,
  opacity,
}) => {
  const midpoints = vertices.map((a, i) => {
    const b = vertices[(i + 1) % vertices.length];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  });

  return (
    <g opacity={opacity}>
      <polygon
        points={polygonPoints(vertices)}
        fill={colors.selected}
        fillOpacity={0.1}
        stroke={colors.selected}
        strokeWidth={1.5 * px}
        strokeLinejoin="round"
      />
      {midpoints.map((m, i) => (
        <circle
          key={`mid-${i}`}
          cx={m.x}
          cy={m.y}
          r={4.5 * px}
          fill={colors.card}
          stroke={colors.selected}
          strokeWidth={1.5 * px}
          strokeDasharray={`${2 * px} ${2 * px}`}
        />
      ))}
      {vertices.map((v, i) => (
        <circle
          key={`v-${i}`}
          cx={v.x}
          cy={v.y}
          r={6 * px}
          fill={colors.selected}
          stroke={colors.card}
          strokeWidth={2 * px}
        />
      ))}
    </g>
  );
};
