import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { Cursor } from "../../components/Cursor";
import { HallCanvas, hallAspect, PAD as HALL_PAD } from "../../components/HallCanvas";
import { canvasInsets, chromeScale, PlannerCanvas } from "../../components/PlannerCanvas";
import { useFormat } from "../../format";
import type { Point } from "../../geometry";
import { colors, fonts } from "../../theme";
import {
  HOOK_IN,
  isPressed,
  released,
  LABEL_POP,
  MEASURE_MODE,
  type Measurement,
  measurementsFor,
  PAYOFF_IN,
  pendingEnd,
  POINTER_IN,
  POINTER_OUT,
  PRESS_MODE,
  PRESS_TOOL,
  type Press,
  STATUS,
} from "../script";
import { PendingMeasurement, SavedMeasurement } from "./MeasureOverlay";
import { StatusPill } from "./StatusPill";

/** Frame padding, and the width of the text column beside the planner. */
const PAD = { x: 56, y: 56 };
const COLUMN = 560;

/** The pointer is drawn at this multiple of `Cursor`'s own size. */
const POINTER_SCALE = 1.5;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * Where a toolbar chip's centre sits, counted from the toolbar's right end. The
 * chips are HTML and the pointer is not, so their widths are estimated from
 * `PlannerCanvas`'s own padding, gap and icon sizes plus Inter's average glyph
 * width at 10 px - near enough to land a pointer inside a chip.
 */
const GLYPH = 5.3;
const TOOLBAR_GAP = 8;
const chipWidth = (label: string, icon: boolean) => 16 + (icon ? 20 : 0) + label.length * GLYPH;

/** `PlannerCanvas`'s toolbar, right to left, as it stands while the pointer travels to one chip. */
const toolbarRow = (measureMode: string | undefined) => [
  ...(measureMode === undefined ? [] : [{ id: "mode", width: chipWidth(measureMode, false) }]),
  { id: "seats", width: chipWidth("Miejsca", true) },
  { id: "measure", width: chipWidth("Mierzenie", true) },
];

const chipCentreFromRight = (id: string, measureMode: string | undefined): number => {
  let right = 0;
  for (const chip of toolbarRow(measureMode)) {
    if (chip.id === id) return right + chip.width / 2;
    right += chip.width + TOOLBAR_GAP;
  }
  throw new Error(`No toolbar chip ${id}`);
};

/**
 * The planner as the loop shows it: the question beside a seated `WIDE_HALL`,
 * the measure tool switched on from the toolbar, two distances taken with it,
 * then the payoff. Every scene of the loop renders this from the loop's clock.
 */
export const ScalePlanner: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps, width: frameWidth, height: frameHeight } = useVideoConfig();
  const { hall, tall, type, gap } = useFormat();

  // The viewport is sized to the room, as `PlanScene` sizes it, so the chrome
  // floats against the walls rather than in the corners of a letterbox.
  const insets = canvasInsets(tall);
  const room = {
    width: frameWidth - PAD.x * 2 - COLUMN - gap - insets.left - insets.right,
    height: frameHeight - PAD.y * 2 - insets.top - insets.bottom,
  };
  const aspect = hallAspect(hall);
  const drawWidth = Math.min(room.width, room.height * aspect);
  const box = {
    width: drawWidth + insets.left + insets.right,
    height: drawWidth / aspect + insets.top + insets.bottom,
  };

  // Hall units -> viewport pixels, and back.
  const unit = drawWidth / (hall.canvas.width + HALL_PAD.left + HALL_PAD.right);
  const toBox = (p: Point): Point => ({
    x: insets.left + (p.x + HALL_PAD.left) * unit,
    y: insets.top + (p.y + HALL_PAD.top) * unit,
  });
  const toHall = (p: Point): Point => ({
    x: (p.x - insets.left) / unit - HALL_PAD.left,
    y: (p.y - insets.top) / unit - HALL_PAD.top,
  });

  // Tool state, straight off the presses - on release, as a click lands, so a
  // chip doesn't shift along the toolbar while the pointer is still on it.
  const measuring = frame >= released(PRESS_TOOL);
  const measureMode = measuring
    ? frame >= released(PRESS_MODE)
      ? MEASURE_MODE.border
      : MEASURE_MODE.center
    : undefined;

  const measurements = measurementsFor(hall);

  // The toolbar row sits `GAP` in from the viewport's top-right corner, 26 units tall.
  const scale = chromeScale(tall);
  const toolbarRight = box.width - 10 * scale;
  const toolbarY = (10 + 13) * scale;
  const chip = (id: string, mode: string | undefined): Point => ({
    x: toolbarRight - chipCentreFromRight(id, mode) * scale,
    y: toolbarY,
  });

  // The pointer's stops, each reached just before its press lands.
  const entry = { x: box.width * 0.8, y: box.height * 0.62 };
  const stops: { at: Point; press: Press }[] = [
    { at: chip("measure", undefined), press: PRESS_TOOL },
    { at: chip("mode", MEASURE_MODE.center), press: PRESS_MODE },
    ...measurements.flatMap((m) => [
      { at: toBox(m.clickA), press: m.pressA },
      { at: toBox(m.clickB), press: m.pressB },
    ]),
  ];
  const exitTo = { x: box.width * 0.9, y: box.height * 0.95 };

  let pointer = entry;
  for (let i = 0; i < stops.length; i++) {
    const arrive = stops[i].press.at - 2;
    const depart = arrive - stops[i].press.travel;
    if (frame < depart) break;
    const from = i === 0 ? entry : stops[i - 1].at;
    const t = interpolate(frame, [depart, arrive], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
    pointer = { x: from.x + (stops[i].at.x - from.x) * t, y: from.y + (stops[i].at.y - from.y) * t };
  }
  const leave = interpolate(frame, POINTER_OUT, [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  pointer = {
    x: pointer.x + (exitTo.x - pointer.x) * leave,
    y: pointer.y + (exitTo.y - pointer.y) * leave,
  };
  const pointerOpacity =
    interpolate(frame, POINTER_IN, [0, 1], clamp) * interpolate(frame, POINTER_OUT, [1, 0], clamp);
  const pressed = stops.some((stop) => isPressed(frame, stop.press));

  const pending = measurements.find((m) => frame >= released(m.pressA) && frame < released(m.pressB));

  const hookIn = interpolate(frame, HOOK_IN, [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const payoffIn = interpolate(frame, PAYOFF_IN, [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });

  return (
    <Backdrop>
      <AbsoluteFill
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: `${PAD.y}px ${PAD.x}px`,
          gap,
        }}
      >
        <div style={{ width: COLUMN, alignSelf: "stretch", paddingTop: insets.top, flexShrink: 0 }}>
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: type.title * 1.4,
              fontWeight: 600,
              letterSpacing: -2,
              lineHeight: 1.05,
              color: colors.ink,
              opacity: hookIn,
              transform: `translateY(${interpolate(hookIn, [0, 1], [24, 0])}px)`,
            }}
          >
            Zmieszczą się te stoły?
          </div>

          <div
            style={{
              marginTop: 36,
              fontFamily: fonts.sans,
              fontSize: type.body * 1.5,
              fontWeight: 500,
              lineHeight: 1.3,
              color: colors.terracotta,
              opacity: payoffIn,
              transform: `translateY(${interpolate(payoffIn, [0, 1], [18, 0])}px)`,
            }}
          >
            {"Odległości w metrach, nie na oko."}
          </div>
        </div>

        <div style={{ position: "relative", width: box.width, height: box.height, display: "flex", flexShrink: 0 }}>
          <PlannerCanvas hall={hall} tall={tall} measureMode={measureMode}>
            <HallCanvas
              hall={hall}
              outline={1}
              floor={1}
              tableIn={hall.tables.map(() => 1)}
              seatFill={hall.tables.map(() => 1)}
            >
              {measurements.map((m) =>
                frame >= released(m.pressB) ? (
                  <SavedMeasurementAt key={m.label + m.a.y} m={m} frame={frame} fps={fps} />
                ) : null,
              )}
              {pending ? (
                <PendingMeasurement a={pending.a} end={pendingEnd(toHall(pointer), hall)} />
              ) : null}
            </HallCanvas>
          </PlannerCanvas>

          {measuring ? (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 24 * scale,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <StatusPill
                text={pending ? STATUS.started : STATUS.idle}
                scale={scale}
                opacity={interpolate(frame, [released(PRESS_TOOL), released(PRESS_TOOL) + 5], [0, 1], clamp)}
              />
            </div>
          ) : null}

          <svg
            width={box.width}
            height={box.height}
            style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
          >
            <g transform={`translate(${pointer.x} ${pointer.y}) scale(${POINTER_SCALE})`}>
              <Cursor x={0} y={0} opacity={pointerOpacity} pressed={pressed} />
            </g>
          </svg>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};

const SavedMeasurementAt: React.FC<{
  m: Measurement;
  frame: number;
  fps: number;
}> = ({ m, frame, fps }) => (
  <SavedMeasurement
    a={m.a}
    b={m.b}
    label={m.label}
    line={1}
    pop={spring({ frame: frame - released(m.pressB), fps, config: { damping: 14, mass: 0.5 }, durationInFrames: LABEL_POP })}
  />
);
