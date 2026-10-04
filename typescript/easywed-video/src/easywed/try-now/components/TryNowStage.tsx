import React from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { CaptionLine } from "../../components/CaptionLine";
import { PHONE, PHONE_OUTER } from "../../components/PhoneFrame";
import { SeriesTag } from "../../components/SeriesTag";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";
import { CANVAS, CHALLENGE_SECONDS, PRESET, secondsLeft, shownSeconds } from "../plan";
import {
  CAMERA_TO_END,
  CAMERA_TO_FORM,
  CAMERA_TO_GUESTS,
  CAMERA_TO_PLAN,
  CAMERA_TO_PLANNER,
  CAMERA_TO_SHEET,
  CAMERA_TO_TABLE,
  CLOCK_PULSE,
  CLOCK_START,
  CLOCK_STOP,
  HALL_IN,
  HALL_OUT,
  HOOK_OUT,
  LIST_IN,
  LIST_OUT,
  PAYOFF_IN,
  SEAT_IN,
  SEAT_OUT,
  START_IN,
  START_OUT,
  TABLE_IN,
  TABLE_OUT,
  TAG_OUT,
} from "../script";
import { RunClock } from "./RunClock";
import { TryNowPhone } from "./TryNowPhone";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = { ...clamp, easing: Easing.inOut(Easing.cubic) };

/** This cut is episode 4 - the series ships `try-now` after `ten-tables`. */
const EPISODE = 4;

/**
 * The band the lines sit in, under the series tag and the stopwatch and clear
 * of a Reel's own overlays; the phone is framed below it, faded in over `FADE`
 * so a push-in never shows a hard edge. The list-seat cut's frame.
 */
const BAND = { top: 150, bottom: 450, padX: 56 };
const VIEW_TOP = BAND.bottom;
const VIEW_MID = VIEW_TOP + (1920 - VIEW_TOP) / 2;
const FADE = 40;
const HOOK_SIZE = 96;
const PAYOFF_SIZE = 76;
const CAPTION_SIZE = 64;

/**
 * A shot of the phone: `focus`, a point on it in its outer px (bezel
 * included), lands on `anchor` in the frame, at `scale`.
 */
type Pose = { scale: number; focus: { x: number; y: number }; anchor: { x: number; y: number } };

const mix = (a: Pose, b: Pose, t: number): Pose => ({
  scale: a.scale + (b.scale - a.scale) * t,
  focus: { x: a.focus.x + (b.focus.x - a.focus.x) * t, y: a.focus.y + (b.focus.y - a.focus.y) * t },
  anchor: { x: a.anchor.x + (b.anchor.x - a.anchor.x) * t, y: a.anchor.y + (b.anchor.y - a.anchor.y) * t },
});

const outer = (y: number) => y + PHONE.bezel;
const MID = PHONE_OUTER.width / 2;
/** A shot centred on the span `top..bottom` of the phone screen, at `scale`. */
const onSpan = (top: number, bottom: number, scale: number): Pose => ({
  scale,
  focus: { x: MID, y: outer((top + bottom) / 2) },
  anchor: { x: 540, y: VIEW_MID },
});

/** The plan's span on the phone: from the header over the canvas to the dragged hall's bottom edge. */
const PLAN_TOP = CANVAS.top - 48;
const PLAN_BOTTOM = CANVAS.top + CANVAS.height * 0.88;

/**
 * The camera, one continuous move with no cut in the run: the whole phone on
 * the landing page, its address bar at the top of the shot; in on the planner's
 * top as it opens - the banner, the chip and the card; down over the bottom of
 * the phone for `AddFab`, the sheet and the form; back up over the plan for
 * the table; down again for the tab bar and the guest form; up for the table;
 * down for its form and the picker; and up over the plan as it closes. Every
 * pose is aimed at geometry the phone reports.
 */
const cameraAt = (frame: number): Pose => {
  const whole: Pose = onSpan(-PHONE.bezel, PHONE.height + PHONE.bezel, (1920 - VIEW_TOP - 16) / PHONE_OUTER.height);
  const planTop = onSpan(PHONE.safeTop + 50, PLAN_BOTTOM, 2.45);
  const bottom = onSpan(PHONE.height - 620, PHONE.height, 2.3);
  const plan = onSpan(PLAN_TOP, PLAN_BOTTOM + 20, 2.45);
  const lower = onSpan(PHONE.height - 460, PHONE.height, 2.55);
  const end = onSpan(CANVAS.top, PLAN_BOTTOM + 20, 2.6);

  const shots: [readonly [number, number], Pose][] = [
    [CAMERA_TO_PLANNER, planTop],
    [CAMERA_TO_SHEET, bottom],
    [CAMERA_TO_TABLE, plan],
    [CAMERA_TO_GUESTS, lower],
    [CAMERA_TO_PLAN, plan],
    [CAMERA_TO_FORM, bottom],
    [CAMERA_TO_END, end],
  ];
  return shots.reduce((pose, [range, next]) => mix(pose, next, interpolate(frame, range, [0, 1], ease)), whole);
};

/** A line centred in the band. */
const InBand: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      left: BAND.padX,
      right: BAND.padX,
      top: BAND.top,
      height: BAND.bottom - BAND.top,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {children}
  </div>
);

const Heading: React.FC<{ size: number; opacity: number; rise?: number; children: React.ReactNode }> = ({
  size,
  opacity,
  rise = 0,
  children,
}) => (
  <div
    style={{
      fontFamily: fonts.heading,
      fontSize: size,
      fontWeight: 600,
      letterSpacing: -2,
      lineHeight: 1.08,
      color: colors.ink,
      textAlign: "center",
      opacity,
      transform: `translateY(${rise}px)`,
    }}
  >
    {children}
  </div>
);

/**
 * Everything the cut shows at `frame` on its clock: the series tag, the
 * stopwatch, the line in the band, and the phone under the camera. Every scene
 * draws it, so a cut between two is between two identical frames. `recede`
 * (0..1) is the call to action's: the phone steps back and the page washes over
 * it, the payoff stays, and `children` - the close - lands over both.
 */
export const TryNowStage: React.FC<{ frame: number; recede?: number; children?: React.ReactNode }> = ({
  frame,
  recede = 0,
  children,
}) => {
  const { fps } = useVideoConfig();
  const pose = cameraAt(frame);

  const hook = 1 - interpolate(frame, HOOK_OUT, [0, 1], clamp);
  const line = (enter: readonly [number, number], exit: readonly [number, number]) => ({
    enter: interpolate(frame, enter, [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }),
    exit: interpolate(frame, exit, [0, 1], clamp),
  });
  const payoff = interpolate(frame, PAYOFF_IN, [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const pulse = interpolate(frame, [CLOCK_PULSE[0], (CLOCK_PULSE[0] + CLOCK_PULSE[1]) / 2, CLOCK_PULSE[1]], [0, 1, 0], clamp);
  const overlays = 1 - interpolate(frame, TAG_OUT, [0, 1], clamp);

  return (
    <Backdrop>
      <AbsoluteFill
        style={{
          transform: `scale(${interpolate(recede, [0, 1], [1, 0.9])}) translateY(${interpolate(recede, [0, 1], [0, 240])}px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: VIEW_TOP,
            bottom: 0,
            overflow: "hidden",
            maskImage: `linear-gradient(to bottom, transparent 0px, black ${FADE}px)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: pose.anchor.x - pose.focus.x * pose.scale,
              top: pose.anchor.y - pose.focus.y * pose.scale - VIEW_TOP,
              transformOrigin: "0 0",
              transform: `scale(${pose.scale})`,
            }}
          >
            <TryNowPhone frame={frame} />
          </div>
        </div>
      </AbsoluteFill>

      {/* The page takes the phone's place in the close, leaving just enough of it to read as the same screen. */}
      <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: interpolate(recede, [0, 1], [0, 0.95]) }} />

      {hook > 0 ? (
        <InBand>
          <Heading size={HOOK_SIZE} opacity={hook}>
            {tl.tryNow.hook(CHALLENGE_SECONDS)}
          </Heading>
        </InBand>
      ) : null}
      {[
        { text: tl.tryNow.start, ...line(START_IN, START_OUT) },
        { text: tl.tryNow.hall, ...line(HALL_IN, HALL_OUT) },
        { text: tl.tryNow.table(PRESET.capacity), ...line(TABLE_IN, TABLE_OUT) },
        { text: tl.tryNow.listed, ...line(LIST_IN, LIST_OUT) },
        { text: tl.tryNow.seated, ...line(SEAT_IN, SEAT_OUT) },
      ].map(({ text, enter, exit }) =>
        enter > 0 && exit < 1 ? (
          <InBand key={text}>
            <CaptionLine text={text} enter={enter} exit={exit} size={CAPTION_SIZE} />
          </InBand>
        ) : null,
      )}
      {payoff > 0 ? (
        <InBand>
          <Heading size={PAYOFF_SIZE} opacity={payoff} rise={interpolate(payoff, [0, 1], [24, 0])}>
            {tl.tryNow.payoff(secondsLeft(fps))}
          </Heading>
        </InBand>
      ) : null}

      <SeriesTag episode={EPISODE} opacity={overlays} />
      <RunClock
        seconds={shownSeconds(frame, fps)}
        running={frame >= CLOCK_START && frame < CLOCK_STOP}
        stopped={frame >= CLOCK_STOP}
        pulse={pulse}
        opacity={overlays}
      />

      {children}
    </Backdrop>
  );
};
