import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { HallCanvas, hallAspect } from "../../components/HallCanvas";
import { PlannerCanvas } from "../../components/PlannerCanvas";
import { useFormat } from "../../format";
import { colors, fonts } from "../../theme";

/** Frame the first table starts taking guests, and the stagger between tables. */
const FILL_FROM = 76;
const FILL_STEP = 7;
const FILL_OVER = 30;

/** Side padding of the scene, so the canvas box can be sized off it. */
const PAD_X = { wide: 56, tall: 40 };

export const PlanScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: frameWidth } = useVideoConfig();
  const { hall, tall, type } = useFormat();

  const outline = interpolate(frame, [4, 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const floor = interpolate(frame, [30, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tableIn = hall.tables.map((_, i) =>
    spring({ frame: frame - (30 + i * 5), fps, config: { damping: 13, mass: 0.55 } }),
  );

  // The room fills table by table, left to right, and the counter is read back
  // off the same numbers so the headline can never disagree with the canvas.
  const seatFill = hall.tables.map((_, i) =>
    interpolate(frame, [FILL_FROM + i * FILL_STEP, FILL_FROM + i * FILL_STEP + FILL_OVER], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const seated = hall.tables.reduce((sum, table, i) => sum + Math.round(seatFill[i] * table.seats), 0);

  const titleIn = spring({ frame: frame - 4, fps, config: { damping: 200 }, durationInFrames: 26 });
  const statIn = spring({ frame: frame - 66, fps, config: { damping: 200 }, durationInFrames: 24 });

  // Capping the canvas box at the hall's own aspect ratio keeps the planner
  // chrome - toolbar, zoom pill, minimap - against the room rather than pinned
  // to the far corners of a box the drawing letterboxes inside.
  const padX = tall ? PAD_X.tall : PAD_X.wide;
  const maxCanvasHeight = (frameWidth - padX * 2) / hallAspect(hall);

  const stat = (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 14,
        opacity: statIn,
        transform: `translateY(${interpolate(statIn, [0, 1], [18, 0])}px)`,
      }}
    >
      <span
        style={{
          fontFamily: fonts.heading,
          fontSize: type.stat,
          fontWeight: 600,
          letterSpacing: -1,
          color: colors.terracotta,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {`${seated} / ${hall.totalSeats}`}
      </span>
      <span style={{ fontFamily: fonts.sans, fontSize: type.body, color: colors.inkSoft }}>
        gości ma swoje miejsce
      </span>
    </div>
  );

  return (
    <Backdrop>
      {/* Landscape puts the count beside the headline; portrait has the height
          to spare, so it sits under the room and balances the frame. */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: `${tall ? 64 : 40}px ${padX}px ${tall ? 44 : 32}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 40,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: type.title,
              fontWeight: 600,
              letterSpacing: -1.5,
              lineHeight: 1.05,
              color: colors.ink,
              opacity: titleIn,
              transform: `translateY(${interpolate(titleIn, [0, 1], [24, 0])}px)`,
            }}
          >
            Albo jeden plan sali.
          </div>
          {tall ? null : stat}
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            maxHeight: maxCanvasHeight,
            display: "flex",
            marginTop: tall ? 26 : 20,
          }}
        >
          <PlannerCanvas hall={hall} tall={tall}>
            <HallCanvas
              hall={hall}
              outline={outline}
              floor={floor}
              tableIn={tableIn}
              seatFill={seatFill}
            />
          </PlannerCanvas>
        </div>

        {tall ? <div style={{ marginTop: 26, flexShrink: 0 }}>{stat}</div> : null}
      </AbsoluteFill>
    </Backdrop>
  );
};
