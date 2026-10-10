import React from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { Backdrop } from "../../../components/Backdrop";
import { CaptionLine } from "../../../components/CaptionLine";
import { Cursor } from "../../../components/Cursor";
import { SeriesTag } from "../../../components/SeriesTag";
import type { Point } from "../../../geometry";
import { tl } from "../../../i18n";
import { TEN_TABLES_BATCH, TEN_TABLES_HALL } from "../../../layouts";
import { colors, fonts, shadow } from "../../../theme";
import {
  CAMERA_BACK,
  FIXTURES_LINE_IN,
  FIXTURES_LINE_OUT,
  HOOK_OUT,
  JUMP_FLOOR,
  JUMP_TABLES,
  LANDED_LINE_IN,
  LANDED_LINE_OUT,
  PAYOFF_IN,
  ROUND_LINE_IN,
  ROUND_LINE_OUT,
  TAG_OUT,
  TYPED_LINE_IN,
  TYPED_LINE_OUT,
} from "../script";
import { MENU_AT, pointerAt } from "../state";
import { APP_PX, CANVAS_BOX, DESK, MENU, menuHeight } from "./desk";
import { TenTablesDesk } from "./TenTablesDesk";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = { ...clamp, easing: Easing.inOut(Easing.cubic) };

/** This cut is episode 3 - the series ships `ten-tables` after `list-seat` and `table-shape`. */
const EPISODE = 3;

/**
 * The band the lines sit in, under the series tag and clear of a Reel's own
 * overlays; the laptop is seen below it, faded in over `FADE` so a push-in
 * never shows a hard edge. The list-seat and table-shape cuts' band, so the
 * series reads alike.
 */
const BAND = { top: 140, bottom: 450, padX: 56 };
const VIEW_TOP = BAND.bottom;
const FADE = 40;
const HOOK_SIZE = 84;
const PAYOFF_SIZE = 80;
const CAPTION_SIZE = 60;
const POINTER_SCALE = 2;

/** The counts every line reads off the room the batch builds. */
const TABLES = TEN_TABLES_HALL.tables.length;
const SEATS = TEN_TABLES_HALL.totalSeats;

/** A shot of the desk: `focus`, a desk point, lands mid-view at `zoom` desk-to-frame. */
type Shot = { focus: Point; zoom: number };

/** Framed so the canvas viewport fills the width - its toolbar, zoom pill and minimap in shot. */
const ROOM: Shot = { focus: { x: CANVAS_BOX.x + CANVAS_BOX.width / 2, y: CANVAS_BOX.y + CANVAS_BOX.height / 2 }, zoom: 1.6 };
/** A step further back for the payoff, aimed a little lower so the planner's header stays out of shot. */
const ROOM_BACK: Shot = { focus: { x: ROOM.focus.x, y: ROOM.focus.y + 45 }, zoom: 1.5 };
/** The menu whole, and the top of the hall it was opened over. */
const MENU_SHOT: Shot = {
  focus: { x: MENU_AT.x + (MENU.width * APP_PX) / 2 - 30, y: MENU_AT.y + (menuHeight * APP_PX) / 2 - 40 },
  zoom: 2.05,
};
/** A centred dialog, wide enough to read. */
const DIALOG_SHOT: Shot = { focus: { x: DESK.width / 2, y: DESK.height / 2 }, zoom: 1.32 };
/** The rail and the panel slid out beside it. */
const RAIL_SHOT: Shot = { focus: { x: 452, y: 470 }, zoom: 1.27 };

/**
 * The camera: moves between shots, and jump cuts where the film skips what v1
 * does between two beats (`script.ts`). A cut starts the next move from where
 * it lands.
 */
type Event = { cut: number; to: Shot } | { range: readonly [number, number]; to: Shot };
const EVENTS: Event[] = [
  { range: [44, 66], to: MENU_SHOT },
  { range: [78, 98], to: DIALOG_SHOT },
  { cut: JUMP_TABLES, to: ROOM },
  { range: [224, 246], to: RAIL_SHOT },
  { range: [268, 286], to: DIALOG_SHOT },
  { cut: JUMP_FLOOR, to: ROOM },
  { range: CAMERA_BACK, to: ROOM_BACK },
];

const mixShot = (a: Shot, b: Shot, t: number): Shot => ({
  focus: { x: a.focus.x + (b.focus.x - a.focus.x) * t, y: a.focus.y + (b.focus.y - a.focus.y) * t },
  // Geometric, so a push reads as a steady move at every scale.
  zoom: a.zoom * Math.pow(b.zoom / a.zoom, t),
});

const cameraAt = (frame: number): Shot =>
  EVENTS.reduce<Shot>((shot, event) => {
    if ("cut" in event) return frame >= event.cut ? event.to : shot;
    if (frame < event.range[0]) return shot;
    return mixShot(shot, event.to, interpolate(frame, event.range, [0, 1], ease));
  }, ROOM);

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
 * in the band, and the laptop under the camera with the pointer over it. Every
 * scene draws it, so a cut between two is between two identical frames.
 * `recede` (0..1) is the call to action's: the laptop steps back and the page
 * washes over it, the payoff stays, and `children` - the close - lands over both.
 */
export const TenTablesStage: React.FC<{ frame: number; recede?: number; children?: React.ReactNode }> = ({
  frame,
  recede = 0,
  children,
}) => {
  const { width: frameWidth, height: frameHeight, fps } = useVideoConfig();
  const camera = cameraAt(frame);
  const view = { width: frameWidth, height: frameHeight - VIEW_TOP };
  const toView = (p: Point): Point => ({
    x: view.width / 2 + (p.x - camera.focus.x) * camera.zoom,
    y: view.height / 2 + (p.y - camera.focus.y) * camera.zoom,
  });
  const origin = toView({ x: 0, y: 0 });
  const pointer = pointerAt(frame);

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
              left: origin.x,
              top: origin.y,
              width: DESK.width,
              height: DESK.height,
              transformOrigin: "0 0",
              transform: `scale(${camera.zoom})`,
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: shadow.card,
            }}
          >
            <TenTablesDesk frame={frame} fps={fps} />
          </div>

          {pointer ? (
            <svg width={view.width} height={view.height} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
              <g transform={`translate(${toView(pointer.at).x} ${toView(pointer.at).y}) scale(${POINTER_SCALE})`}>
                <Cursor x={0} y={0} opacity={pointer.opacity} pressed={pointer.pressed} />
              </g>
            </svg>
          ) : null}
        </div>
      </AbsoluteFill>

      {/* The page takes the laptop's place in the close, leaving just enough of it to read as the same screen. */}
      <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: interpolate(recede, [0, 1], [0, 0.95]) }} />

      {hook > 0 ? (
        <InBand>
          <Heading size={HOOK_SIZE} opacity={hook}>
            {tl.tenTables.hook(TABLES, TEN_TABLES_HALL.tables[0].seats)}
          </Heading>
        </InBand>
      ) : null}
      {[
        { text: tl.tenTables.round(TEN_TABLES_BATCH.diameter), ...line(ROUND_LINE_IN, ROUND_LINE_OUT) },
        { text: tl.tenTables.typed(TEN_TABLES_BATCH.count), ...line(TYPED_LINE_IN, TYPED_LINE_OUT) },
        { text: tl.tenTables.landed(TABLES), ...line(LANDED_LINE_IN, LANDED_LINE_OUT) },
        { text: tl.tenTables.fixtures, ...line(FIXTURES_LINE_IN, FIXTURES_LINE_OUT) },
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
            {tl.tenTables.payoff(TABLES, SEATS)}
          </Heading>
        </InBand>
      ) : null}

      <SeriesTag episode={EPISODE} opacity={1 - interpolate(frame, TAG_OUT, [0, 1], clamp)} />

      {children}
    </Backdrop>
  );
};
