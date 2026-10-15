import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { Backdrop } from "../../../components/Backdrop";
import { CaptionLine } from "../../../components/CaptionLine";
import { PHONE, PHONE_OUTER } from "../../../components/PhoneFrame";
import { SeriesTag } from "../../../components/SeriesTag";
import { tl } from "../../../i18n";
import { colors, fonts } from "../../../theme";
import { REMINDERS } from "../reminders";
import {
  CAMERA_BACK,
  CAMERA_CLOSE,
  CAMERA_TO_SHEET,
  DONE_IN,
  DONE_OUT,
  HOOK_OUT,
  OVERDUE_IN,
  OVERDUE_OUT,
  PAYOFF_IN,
  TAG_OUT,
} from "../script";
import { popoverBottom, sheetMarks } from "./RemindersSheet";
import { TodoListPhone } from "./TodoListPhone";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = { ...clamp, easing: Easing.inOut(Easing.cubic) };

/** This cut is episode 5 - the series ships `todo-list` last, after `try-now`. */
const EPISODE = 5;

/**
 * The band the lines sit in, under the series tag and clear of a Reel's own
 * overlays; the phone is framed below it, faded in over `FADE` so a push-in
 * never shows a hard edge. The list-seat cut's band, so the series reads alike.
 */
const BAND = { top: 140, bottom: 450, padX: 56 };
const VIEW_TOP = BAND.bottom;
const FADE = 40;
const HOOK_SIZE = 84;
const PAYOFF_SIZE = 80;
const CAPTION_SIZE = 60;

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

const mid = PHONE_OUTER.width / 2;
const outer = (y: number) => y + PHONE.bezel;

const BEFORE = sheetMarks(REMINDERS.length - 1);
const AFTER = sheetMarks(REMINDERS.length);

/**
 * The camera, one continuous move: the lower phone under the hook, the room
 * and the tab bar the thumb reaches for; the drawer whole once it is up; close
 * on the trigger and the rows - the red one first, the popover over them - so
 * a row's date reads; then back over the five rows for the payoff. Every pose
 * is aimed at geometry the sheet reports.
 */
const cameraAt = (frame: number): Pose => {
  const planner: Pose = { scale: 2.1, focus: { x: mid, y: outer(560) }, anchor: { x: 540, y: 1250 } };
  const sheet: Pose = {
    scale: 2.3,
    focus: { x: mid, y: outer((BEFORE.top + PHONE.height) / 2) },
    anchor: { x: 540, y: 1215 },
  };
  const close: Pose = {
    scale: 2.7,
    focus: { x: mid, y: outer((BEFORE.trigger.top + Math.max(BEFORE.rowBottom(3), popoverBottom(4))) / 2) },
    anchor: { x: 540, y: 1195 },
  };
  const back: Pose = {
    scale: 2.3,
    focus: { x: mid, y: outer((AFTER.top + PHONE.height) / 2) },
    anchor: { x: 540, y: 1215 },
  };

  const shots: [readonly [number, number], Pose][] = [
    [CAMERA_TO_SHEET, sheet],
    [CAMERA_CLOSE, close],
    [CAMERA_BACK, back],
  ];
  return shots.reduce((pose, [range, next]) => mix(pose, next, interpolate(frame, range, [0, 1], ease)), planner);
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
      lineHeight: 1.05,
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
 * Everything the cut shows at `frame` on its clock: the series tag, the line
 * in the band, and the phone under the camera. Every scene draws it, so a cut
 * between two is between two identical frames - bar `jumped`, which the add
 * scene and the close set: their phone has the popover open, so the seam into
 * the add scene is the jump cut past the typing. `recede` (0..1) is the call
 * to action's: the phone steps back and the page washes over it, the payoff
 * stays, and `children` - the close - lands over both.
 */
export const TodoListStage: React.FC<{
  frame: number;
  jumped?: boolean;
  recede?: number;
  children?: React.ReactNode;
}> = ({ frame, jumped = false, recede = 0, children }) => {
  const pose = cameraAt(frame);

  const hook = 1 - interpolate(frame, HOOK_OUT, [0, 1], clamp);
  const line = (enter: readonly [number, number], exit: readonly [number, number]) => ({
    enter: interpolate(frame, enter, [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }),
    exit: interpolate(frame, exit, [0, 1], clamp),
  });
  const payoff = interpolate(frame, PAYOFF_IN, [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

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
            <TodoListPhone frame={frame} jumped={jumped} />
          </div>
        </div>
      </AbsoluteFill>

      {/* The page takes the phone's place in the close, leaving just enough of it to read as the same screen. */}
      <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: interpolate(recede, [0, 1], [0, 0.95]) }} />

      {hook > 0 ? (
        <InBand>
          <Heading size={HOOK_SIZE} opacity={hook}>
            {tl.todoList.hook}
          </Heading>
        </InBand>
      ) : null}
      {[
        { text: tl.todoList.overdue, ...line(OVERDUE_IN, OVERDUE_OUT) },
        { text: tl.todoList.done, ...line(DONE_IN, DONE_OUT) },
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
            {tl.todoList.payoff}
          </Heading>
        </InBand>
      ) : null}

      <SeriesTag episode={EPISODE} opacity={1 - interpolate(frame, TAG_OUT, [0, 1], clamp)} />

      {children}
    </Backdrop>
  );
};
