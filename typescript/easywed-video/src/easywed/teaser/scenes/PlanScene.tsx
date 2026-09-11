import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { HallCanvas, hallAspect } from "../../components/HallCanvas";
import { canvasInsets, PlannerCanvas } from "../../components/PlannerCanvas";
import { useFormat } from "../../format";
import { colors, fonts } from "../../theme";

/** Frame the first table starts taking guests, and the stagger between tables. */
const FILL_FROM = 76;
const FILL_STEP = 7;
const FILL_OVER = 30;

/** Scene padding, so the viewport can be sized off what is left over. */
const PAD = {
  wide: { x: 56, top: 30, bottom: 26 },
  tall: { x: 40, top: 58, bottom: 38 },
};

/** Space between the headline and the viewport, and above the portrait count. */
const GAP_ABOVE_CANVAS = { wide: 20, tall: 24 };
const GAP_ABOVE_STAT = 24;

export const PlanScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: frameWidth, height: frameHeight } = useVideoConfig();
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

  // The viewport is sized to the room rather than to whatever is left of the
  // frame: the plan fills it, so the chrome floats against the walls instead of
  // in the corners of a box the drawing letterboxes inside. Both text blocks
  // are measured off the type scale that draws them, so the fit is exact.
  const pad = tall ? PAD.tall : PAD.wide;
  const insets = canvasInsets(tall);
  const headerHeight = type.title * 1.05;
  const statHeight = type.stat * 1.15 + GAP_ABOVE_STAT;
  const room = {
    width: frameWidth - pad.x * 2 - insets.left - insets.right,
    height:
      frameHeight -
      pad.top -
      pad.bottom -
      headerHeight -
      (tall ? GAP_ABOVE_CANVAS.tall + statHeight : GAP_ABOVE_CANVAS.wide) -
      insets.top -
      insets.bottom,
  };
  const aspect = hallAspect(hall);
  const drawWidth = Math.min(room.width, room.height * aspect);
  const canvas = {
    width: drawWidth + insets.left + insets.right,
    height: drawWidth / aspect + insets.top + insets.bottom,
  };

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
          justifyContent: "center",
          padding: `${pad.top}px ${pad.x}px ${pad.bottom}px`,
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
            width: canvas.width,
            height: canvas.height,
            alignSelf: "center",
            display: "flex",
            flexShrink: 0,
            marginTop: tall ? GAP_ABOVE_CANVAS.tall : GAP_ABOVE_CANVAS.wide,
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

        {tall ? (
          <div style={{ marginTop: GAP_ABOVE_STAT, flexShrink: 0 }}>{stat}</div>
        ) : null}
      </AbsoluteFill>
    </Backdrop>
  );
};
