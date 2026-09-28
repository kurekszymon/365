import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { CaptionLine } from "../../components/CaptionLine";
import { PHONE, PHONE_OUTER } from "../../components/PhoneFrame";
import { guestSheetTop } from "../../components/PhoneShell";
import { SeriesTag } from "../../components/SeriesTag";
import { useFormat } from "../../format";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";
import {
  BESIDE_IN,
  BESIDE_OUT,
  CAMERA_BACK,
  CAMERA_TO_ROW,
  CAMERA_TO_SEATS,
  CAMERA_TO_TABLES,
  FULL_IN,
  FULL_OUT,
  HOOK_OUT,
  PAYOFF_IN,
  TAG_OUT,
  WHERE_IN,
  WHERE_OUT,
} from "../script";
import { ListSeatPhone, phonePlan } from "./ListSeatPhone";
import { sheetHeights } from "./SeatAssignSheet";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = { ...clamp, easing: Easing.inOut(Easing.cubic) };

/** This cut is episode 1 - the series ships `list-seat` first. */
const EPISODE = 1;

/**
 * The band the lines sit in, under the series tag and clear of a Reel's own
 * overlays; the phone is framed below it, faded in over `FADE` so a push-in
 * never shows a hard edge.
 */
const BAND = { top: 140, bottom: 450, padX: 56 };
const VIEW_TOP = BAND.bottom;
const FADE = 40;
const HOOK_SIZE = 84;
const PAYOFF_SIZE = 78;
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

/**
 * The camera, one continuous move: the whole phone under the hook; in on
 * Tomek's row with the chips still in view; the table list; the seat grid,
 * close enough for a 10px name to read; then back over the list, the progress
 * card to his row. Every pose is aimed at the geometry the phone reports.
 */
const cameraAt = (frame: number, plan: ReturnType<typeof phonePlan>): Pose => {
  const mid = PHONE_OUTER.width / 2;
  const outer = (y: number) => y + PHONE.bezel;
  const heights = sheetHeights(plan.tables.length, plan.seats.length);
  const listTop = guestSheetTop(plan.before, "guest");

  const whole: Pose = { scale: 1.5, focus: { x: mid, y: 0 }, anchor: { x: 540, y: 500 } };
  const row: Pose = { scale: 2.3, focus: { x: mid, y: outer(plan.row.y) }, anchor: { x: 540, y: 1400 } };
  const tables: Pose = { scale: 2.3, focus: { x: mid, y: outer(PHONE.height - heights.tables / 2) }, anchor: { x: 540, y: 1180 } };
  const seats: Pose = { scale: 2.7, focus: { x: mid, y: outer(PHONE.height - heights.seats / 2) }, anchor: { x: 540, y: 1180 } };
  const back: Pose = { scale: 2, focus: { x: mid, y: outer((listTop + plan.row.y) / 2) }, anchor: { x: 540, y: 1080 } };

  const shots: [readonly [number, number], Pose][] = [
    [CAMERA_TO_ROW, row],
    [CAMERA_TO_TABLES, tables],
    [CAMERA_TO_SEATS, seats],
    [CAMERA_BACK, back],
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
 * between two is between two identical frames. `recede` (0..1) is the call to
 * action's: the phone steps back and the page washes over it, the payoff
 * stays, and `children` - the close - lands over both.
 */
export const ListSeatStage: React.FC<{ frame: number; recede?: number; children?: React.ReactNode }> = ({
  frame,
  recede = 0,
  children,
}) => {
  const { hall } = useFormat();
  const plan = phonePlan(hall);
  const pose = cameraAt(frame, plan);

  const hook = 1 - interpolate(frame, HOOK_OUT, [0, 1], clamp);
  const line = (enter: readonly [number, number], exit: readonly [number, number]) => ({
    enter: interpolate(frame, enter, [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }),
    exit: interpolate(frame, exit, [0, 1], clamp),
  });
  const where = line(WHERE_IN, WHERE_OUT);
  const full = line(FULL_IN, FULL_OUT);
  const beside = line(BESIDE_IN, BESIDE_OUT);
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
            <ListSeatPhone frame={frame} hall={hall} />
          </div>
        </div>
      </AbsoluteFill>

      {/* The page takes the phone's place in the close, leaving just enough of it to read as the same screen. */}
      <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: interpolate(recede, [0, 1], [0, 0.95]) }} />

      {hook > 0 ? (
        <InBand>
          <Heading size={HOOK_SIZE} opacity={hook}>
            {tl.listSeat.hook}
          </Heading>
        </InBand>
      ) : null}
      {[
        { text: tl.listSeat.where, ...where },
        { text: tl.listSeat.fullTables, ...full },
        { text: tl.listSeat.beside, ...beside },
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
            {tl.listSeat.payoff}
          </Heading>
        </InBand>
      ) : null}

      <SeriesTag episode={EPISODE} opacity={1 - interpolate(frame, TAG_OUT, [0, 1], clamp)} />

      {children}
    </Backdrop>
  );
};
