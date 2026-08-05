import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AppFrame } from "../components/AppFrame";
import { Cursor } from "../components/Cursor";
import { HallCanvas } from "../components/HallCanvas";
import { PlannerCanvas } from "../components/PlannerCanvas";
import { SceneLabel } from "../components/SceneLabel";
import { useFormat } from "../format";
import type { Point } from "../geometry";
import { colors, fonts } from "../theme";

/**
 * Offset the dragged table starts at. Landscape: the empty band right of the
 * head table. Portrait: parked on the dance floor, so dragging it into the left
 * column reads as fixing an obviously wrong spot.
 */
const DRAG_FROM = { wide: { x: 90, y: -150 }, tall: { x: 300, y: -140 } };

export const HallScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { hall, tall, pad, gap, type } = useFormat();

  // Table 3 is the one the cursor picks up and moves into place.
  const draggedIndex = hall.tables.findIndex((t) => t.id === "t3");
  const dragFrom = tall ? DRAG_FROM.tall : DRAG_FROM.wide;

  const outline = interpolate(frame, [6, 56], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const floor = interpolate(frame, [56, 76], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const tableIn = hall.tables.map((_, i) =>
    spring({ frame: frame - (66 + i * 7), fps, config: { damping: 13, mass: 0.6 } }),
  );

  // The cursor moves in shortly after the table lands, so the misplaced state is
  // never on screen long enough to read as the layout.
  const grab = interpolate(frame, [112, 124], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const drag = interpolate(frame, [124, 168], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const cursorVisible = interpolate(frame, [100, 112, 178, 190], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const offsets: Point[] = hall.tables.map((_, i) =>
    i === draggedIndex
      ? { x: interpolate(drag, [0, 1], [dragFrom.x, 0]), y: interpolate(drag, [0, 1], [dragFrom.y, 0]) }
      : { x: 0, y: 0 },
  );

  const dragged = hall.tables[draggedIndex];
  const cursor = {
    x: dragged.x + offsets[draggedIndex].x + 30,
    y: dragged.y + offsets[draggedIndex].y + 24,
  };

  const canvas = (
    <HallCanvas
      hall={hall}
      outline={outline}
      floor={floor}
      tableIn={tableIn}
      seatFill={hall.tables.map(() => 0)}
      offsets={offsets}
      selectedTableId={grab > 0.5 && drag < 1 ? dragged.id : undefined}
    >
      <Cursor x={cursor.x} y={cursor.y} opacity={cursorVisible} pressed={grab > 0.5 && drag < 1} />
    </HallCanvas>
  );

  const venuePill = (
    <div
      style={{
        marginTop: tall ? 26 : 44,
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 24px",
        borderRadius: 18,
        backgroundColor: colors.secondary,
        fontFamily: fonts.sans,
        fontSize: type.body,
        color: colors.ink,
        opacity: outline,
      }}
    >
      <span style={{ color: colors.inkSoft }}>Venue</span>
      <strong style={{ fontWeight: 600 }}>
        {`${hall.name} · ${hall.meters.width} × ${hall.meters.height} m`}
      </strong>
    </div>
  );

  return (
    <AppFrame activeRail="tables">
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: tall ? "column" : "row",
          padding: tall ? `${pad}px 40px 8px` : "34px 20px 34px 40px",
          gap,
          minWidth: 0,
        }}
      >
        <div style={{ width: tall ? "100%" : 540, paddingTop: tall ? 8 : 40, flexShrink: 0 }}>
          <SceneLabel
            step="Step 01"
            title="Sketch the hall"
            subtitle="Round and rectangular tables, the dance floor, fixtures - lay out the room exactly as it will look on the day."
            from={10}
          />
          {venuePill}
        </div>

        <PlannerCanvas hall={hall} tall={tall}>
          {canvas}
        </PlannerCanvas>
      </div>
    </AppFrame>
  );
};
