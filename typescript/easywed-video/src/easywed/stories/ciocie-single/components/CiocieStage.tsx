import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { DRAWER_HEIGHT, DRAWER_TOP } from "../../../chill-wed/table-shape/components/TableEditSheet";
import { Backdrop } from "../../../components/Backdrop";
import { CaptionLine } from "../../../components/CaptionLine";
import { PHONE, PHONE_OUTER } from "../../../components/PhoneFrame";
import { tl } from "../../../i18n";
import { colors, fonts } from "../../../theme";
import {
  CAMERA_WIDE,
  CIOCIE_IN,
  CIOCIE_OUT,
  CIOCIE_PASS,
  DRIFT,
  HOOK_OUT,
  JUMP,
  PAYOFF_IN,
  SINGLE_IN,
  SINGLE_OUT,
  SINGLE_PASS,
} from "../script";
import { CiociePhone, PHONE_MARKS } from "./CiociePhone";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = { ...clamp, easing: Easing.inOut(Easing.cubic) };

/**
 * The band the lines sit in, clear of a Reel's own overlays; the phone is
 * framed below it, faded in over `FADE` so a push-in never shows a hard edge.
 * The table-shape cut's band and type, without a series tag over it: this
 * cut stands on its own.
 */
const BAND = { top: 140, bottom: 450, padX: 56 };
const VIEW_TOP = BAND.bottom;
const FADE = 40;
const HOOK_SIZE = 84;
const PAYOFF_SIZE = 84;
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

const on = (y: number, scale = 2.3): Pose => ({ scale, focus: { x: mid, y: outer(y) }, anchor: { x: 540, y: 1180 } });
const SHEET: Pose = { scale: 2.3, focus: { x: mid, y: outer(DRAWER_TOP + DRAWER_HEIGHT / 2) }, anchor: { x: 540, y: 1195 } };
const WIDE: Pose = { scale: 2.15, focus: { x: mid, y: outer(PHONE_MARKS.canvas.y) }, anchor: { x: 540, y: 1190 } };

/**
 * The camera: close on Stół 2 under the hook, drifting in until the tap; the
 * drawer whole while the name is retyped; back on the table to read its new
 * name. The jump cut lands it on Stół 5, and the same moves follow; then it
 * steps back with the pinch over the whole room. Every pose is aimed at
 * geometry the phone reports.
 */
const cameraAt = (frame: number): Pose => {
  const shots: [readonly [number, number], Pose][] =
    frame < JUMP
      ? [
          [DRIFT, on(PHONE_MARKS.singles.y, 2.45)],
          [SINGLE_PASS.cameraToSheet, SHEET],
          [SINGLE_PASS.cameraBack, on(PHONE_MARKS.singles.y, 2.45)],
        ]
      : [
          [CIOCIE_PASS.cameraToSheet, SHEET],
          [CIOCIE_PASS.cameraBack, on(PHONE_MARKS.aunts.y, 2.45)],
          [CAMERA_WIDE, WIDE],
        ];
  const start = frame < JUMP ? on(PHONE_MARKS.singles.y, 2.3) : on(PHONE_MARKS.aunts.y, 2.45);
  return shots.reduce((pose, [range, next]) => mix(pose, next, interpolate(frame, range, [0, 1], ease)), start);
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
 * Everything the cut shows at `frame` on its clock: the line in the band and
 * the phone under the camera. Every scene draws it, so a cut between two is
 * between two identical frames - the one real cut, the jump to Stół 5, lives
 * on this clock too. `recede` (0..1) is the call to action's: the phone steps
 * back and the page washes over it, the payoff stays, and `children` - the
 * close - lands over both.
 */
export const CiocieStage: React.FC<{ frame: number; recede?: number; children?: React.ReactNode }> = ({
  frame,
  recede = 0,
  children,
}) => {
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
            <CiociePhone frame={frame} />
          </div>
        </div>
      </AbsoluteFill>

      {/* The page takes the phone's place in the close, leaving just enough of it to read as the same screen. */}
      <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: interpolate(recede, [0, 1], [0, 0.95]) }} />

      {hook > 0 ? (
        <InBand>
          <Heading size={HOOK_SIZE} opacity={hook}>
            {tl.ciocie.hook}
          </Heading>
        </InBand>
      ) : null}
      {[
        { text: tl.ciocie.singlesLine, ...line(SINGLE_IN, SINGLE_OUT) },
        { text: tl.ciocie.auntsLine, ...line(CIOCIE_IN, CIOCIE_OUT) },
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
            {tl.ciocie.payoff}
          </Heading>
        </InBand>
      ) : null}

      {children}
    </Backdrop>
  );
};
