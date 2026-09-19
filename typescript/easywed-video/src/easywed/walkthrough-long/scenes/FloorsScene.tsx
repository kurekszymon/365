import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { Cursor } from "../../components/Cursor";
import { HallCanvas, PAD as HALL_PAD } from "../../components/HallCanvas";
import { HALL_PANEL, HallPanel, hallPanelHeight, hallPanelTargets } from "../../components/HallPanel";
import { canvasInsets, chromeScale, PlannerCanvas } from "../../components/PlannerCanvas";
import { useFormat } from "../../format";
import type { Point } from "../../geometry";
import { tl } from "../../i18n";
import { PX_PER_M, secondHallBeside, type HallLayout } from "../../layouts";
import { SHAPE_TALL } from "../../odd-room/components/ShapePlanner";
import { colors, fonts } from "../../theme";
import { HallsPanel, hallsPanelAddTarget, hallsPanelHeight } from "../components/HallsPanel";

/**
 * Floors: the halls list opened over the room the walkthrough just sketched,
 * *Dodaj salę* pressed, the new hall's *Piętro* set to 1, and the view pulled
 * back until both halls are in it - the way `HallsPanelContent` and
 * `addHall` + `openHallEdit` do it at v1. The new hall comes up where
 * `nextHallPosition` puts a second one, beside the first, so nothing is
 * dragged. It is given a dance floor and a bar and no tables, then its label
 * chip is pressed, which opens the settings the next chapter (`ShapeLScene`
 * on the same second hall) picks up.
 *
 * Laid out as `ShapePlanner` lays out the chapters either side of it - the
 * line in a column, the planner beside it; in portrait the line over the
 * planner and the forms in the phone's bottom sheet (`MobilePanelDrawer`) -
 * with the forms at the same place and scale, so the crossfade into
 * *Kształt L* doesn't jump.
 */

/** The line lands in the scene's first 20 frames. */
const LINE_IN = [6, 18] as const;

/** The halls list opens; `DialogContent`'s `duration-100` is three frames. */
const LIST_OPEN = 18;
const DIALOG_FADE = 3;

type Press = { at: number; travel: number };
const PRESS_HALF = 3;
const isPressed = (frame: number, press: Press) => frame >= press.at - PRESS_HALF && frame < press.at + PRESS_HALF;
const released = (press: Press) => press.at + PRESS_HALF;

/** *Dodaj salę*: the list gives way to the new hall's settings. */
const PRESS_ADD: Press = { at: 62, travel: 24 };
/** *Piętro*, then the one key typed into it. */
const PRESS_FLOOR: Press = { at: 96, travel: 22 };
const TYPED_AT = 110;
/** The check that closes the dialog - every edit in it has already applied. */
const PRESS_DONE: Press = { at: 134, travel: 20 };
/** The view pulls back over both halls. */
const ZOOM_OUT = [142, 172] as const;
/** Sala 2 is given its dance floor and bar. */
const FIXTURES_IN = [176, 192] as const;
/** Sala 2's label chip, which opens its settings for the next chapter. */
const PRESS_CHIP: Press = { at: 206, travel: 24 };
/**
 * Then the pointer heads for *Kształt L*, and is there before the crossfade
 * starts at 225 - where the next chapter's pointer already is - so the two
 * don't ghost across the seam.
 */
const TO_L = [212, 224] as const;

const POINTER_IN = [PRESS_ADD.at - PRESS_ADD.travel - 10, PRESS_ADD.at - PRESS_ADD.travel] as const;

/** As `ShapePlanner`: frame padding, the text column, the app's pixels -> frame pixels, the pointer's size. */
const PAD = { x: 56, y: 56 };
const COLUMN = 560;
const APP_PX = 1.25;
const POINTER_SCALE = 1.5;
/** `DialogOverlay`'s `backdrop-blur-xs`. */
const SCRIM_BLUR = 4;
/** `HallView`'s label chip, aimed at near its grip end, in hall units - as `ShapePlanner` aims it. */
const CHIP_AIM = { x: 70, y: 33 };
/** The zoom pill's reading while the first hall fills the view, as `PlannerCanvas` defaults it. */
const ZOOM_BASE = 92;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** A hall's place on the world canvas, in hall units. */
const origin = (hall: HallLayout): Point => ({
  x: (hall.position?.x ?? 0) * PX_PER_M,
  y: (hall.position?.y ?? 0) * PX_PER_M,
});

type Bounds = { x0: number; y0: number; x1: number; y1: number };

/** What `HallCanvas` draws for a hall, its labels and chip included, in world units. */
const drawnBounds = (hall: HallLayout): Bounds => {
  const o = origin(hall);
  return {
    x0: o.x - HALL_PAD.left,
    y0: o.y - HALL_PAD.top,
    x1: o.x + hall.canvas.width + HALL_PAD.right,
    y1: o.y + hall.canvas.height + HALL_PAD.bottom,
  };
};

const union = (a: Bounds, b: Bounds): Bounds => ({
  x0: Math.min(a.x0, b.x0),
  y0: Math.min(a.y0, b.y0),
  x1: Math.max(a.x1, b.x1),
  y1: Math.max(a.y1, b.y1),
});

const lerpBounds = (a: Bounds, b: Bounds, t: number): Bounds => ({
  x0: a.x0 + (b.x0 - a.x0) * t,
  y0: a.y0 + (b.y0 - a.y0) * t,
  x1: a.x1 + (b.x1 - a.x1) * t,
  y1: a.y1 + (b.y1 - a.y1) * t,
});

export const FloorsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width: frameWidth, height: frameHeight } = useVideoConfig();
  const { tall, type, gap } = useFormat();
  const main = useFormat().hall;
  const second = secondHallBeside(main);
  const T = SHAPE_TALL;

  // The whole planner area, not sized to one room: the view inside it pulls back.
  const box = tall
    ? { width: frameWidth - T.padX * 2, height: frameHeight - T.roomTop - T.padY }
    : { width: frameWidth - PAD.x * 2 - COLUMN - gap, height: frameHeight - PAD.y * 2 };
  const boxAt = { x: T.padX, y: T.roomTop };
  const sheetWidth = frameWidth / T.appPx;
  const insets = canvasInsets(tall);
  const inner = {
    width: box.width - insets.left - insets.right,
    height: box.height - insets.top - insets.bottom,
  };

  // The camera: the first hall alone, then both.
  const zoomOut = interpolate(frame, ZOOM_OUT, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const alone = drawnBounds(main);
  const both = union(alone, drawnBounds(second));
  const fitOf = (view: Bounds) =>
    Math.min(inner.width / (view.x1 - view.x0), inner.height / (view.y1 - view.y0));
  const view = lerpBounds(alone, both, zoomOut);
  const px = fitOf(view);
  const shift = {
    x: insets.left + (inner.width - (view.x1 - view.x0) * px) / 2 - view.x0 * px,
    y: insets.top + (inner.height - (view.y1 - view.y0) * px) / 2 - view.y0 * px,
  };
  const toBox = (p: Point): Point => ({ x: shift.x + p.x * px, y: shift.y + p.y * px });
  const zoomLabel = `${Math.round((ZOOM_BASE * px) / fitOf(alone))}%`;

  // The dialog: the list until *Dodaj salę* lands, then the new hall's settings,
  // centred on the planner as `DialogContent` centres itself.
  const added = frame >= released(PRESS_ADD);
  const closedAt = released(PRESS_DONE);
  const chipAt = released(PRESS_CHIP);
  const dialogIn =
    frame < chipAt
      ? interpolate(frame, [LIST_OPEN, LIST_OPEN + DIALOG_FADE], [0, 1], clamp) *
        interpolate(frame, [closedAt, closedAt + DIALOG_FADE], [1, 0], clamp)
      : interpolate(frame, [chipAt, chipAt + DIALOG_FADE], [0, 1], clamp);
  const listHeight = hallsPanelHeight(1, tall);
  const settingsHeight = hallPanelHeight(false, tall);
  // A sheet stands on the frame's bottom edge; a dialog is centred on the planner.
  const dialogAt = (height: number, p: Point): Point =>
    tall
      ? { x: p.x * T.appPx - boxAt.x, y: frameHeight - (height - p.y) * T.appPx - boxAt.y }
      : {
          x: box.width / 2 + (p.x - HALL_PANEL.width / 2) * APP_PX,
          y: box.height / 2 + (p.y - height / 2) * APP_PX,
        };
  const targets = tall ? hallPanelTargets(false, sheetWidth, true) : hallPanelTargets(false);
  const addTarget = tall ? hallsPanelAddTarget(1, sheetWidth, true) : hallsPanelAddTarget(1);

  // The pointer's stops, each reached just before its press lands.
  const chip = toBox({ x: origin(second).x + CHIP_AIM.x, y: origin(second).y + CHIP_AIM.y });
  const entry = { x: box.width * 0.78, y: box.height * 0.86 };
  const stops: { at: Point; press: Press }[] = [
    { at: dialogAt(listHeight, addTarget), press: PRESS_ADD },
    { at: dialogAt(settingsHeight, targets.floor), press: PRESS_FLOOR },
    { at: dialogAt(settingsHeight, targets.done), press: PRESS_DONE },
    { at: chip, press: PRESS_CHIP },
  ];
  let pointer = entry;
  for (let i = 0; i < stops.length; i++) {
    const arrive = stops[i].press.at - 2;
    const depart = arrive - stops[i].press.travel;
    if (frame < depart) break;
    const from = i === 0 ? entry : stops[i - 1].at;
    const t = interpolate(frame, [depart, arrive], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
    pointer = { x: from.x + (stops[i].at.x - from.x) * t, y: from.y + (stops[i].at.y - from.y) * t };
  }
  const toL = interpolate(frame, TO_L, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const lTarget = dialogAt(settingsHeight, targets.lShape);
  pointer = { x: pointer.x + (lTarget.x - pointer.x) * toL, y: pointer.y + (lTarget.y - pointer.y) * toL };
  const pointerOpacity = interpolate(frame, POINTER_IN, [0, 1], clamp);
  const pressed = stops.some((stop) => isPressed(frame, stop.press));

  const lineIn = interpolate(frame, LINE_IN, [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const secondIn = interpolate(frame, [released(PRESS_ADD), released(PRESS_ADD) + 6], [0, 1], clamp);
  const fixturesIn = interpolate(frame, FIXTURES_IN, [0, 1], clamp);
  const scale = chromeScale(tall);

  const hallAt = (hall: HallLayout, opacity: number, floor: number) => {
    const o = toBox({ x: origin(hall).x - HALL_PAD.left, y: origin(hall).y - HALL_PAD.top });
    return (
      <div
        style={{
          position: "absolute",
          left: o.x,
          top: o.y,
          width: (hall.canvas.width + HALL_PAD.left + HALL_PAD.right) * px,
          height: (hall.canvas.height + HALL_PAD.top + HALL_PAD.bottom) * px,
          display: "flex",
          opacity,
        }}
      >
        <HallCanvas
          hall={hall}
          outline={1}
          floor={floor}
          tableIn={hall.tables.map(() => 1)}
          seatFill={hall.tables.map(() => 0)}
        />
      </div>
    );
  };

  const halls = (
    <PlannerCanvas hall={main} tall={tall} zoom={zoomLabel}>
      {/* The halls are placed in the viewport's own pixels - the chrome's insets included - so drawn from its corner. */}
      <div style={{ position: "absolute", left: -insets.left, top: -insets.top, width: box.width, height: box.height }}>
        {hallAt(main, 1, 1)}
        {added ? hallAt(second, secondIn, fixturesIn) : null}
      </div>
    </PlannerCanvas>
  );

  const form = (drawer: boolean) =>
    added ? (
      <HallPanel
        hallName={second.name}
        meters={second.meters}
        lShape={false}
        floor={frame >= TYPED_AT ? String(second.floor) : undefined}
        floorFocused={frame >= released(PRESS_FLOOR) && frame < closedAt}
        position={second.position}
        drawer={drawer}
        width={drawer ? sheetWidth : undefined}
      />
    ) : (
      <HallsPanel
        halls={[main]}
        addPressed={isPressed(frame, PRESS_ADD)}
        drawer={drawer}
        width={drawer ? sheetWidth : undefined}
      />
    );

  if (tall) {
    // The sheet changes height when the list gives way to the form; it slides by its own.
    const sheetHeight = added ? settingsHeight : listHeight;
    return (
      <Backdrop>
        <AbsoluteFill style={{ padding: `${T.padY}px ${T.padX}px 0`, alignItems: "center" }}>
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: T.hookSize,
              fontWeight: 600,
              letterSpacing: -2,
              lineHeight: 1.05,
              color: colors.ink,
              textAlign: "center",
              opacity: lineIn,
              transform: `translateY(${interpolate(lineIn, [0, 1], [24, 0])}px)`,
            }}
          >
            {tl.walkthrough.floors}
          </div>
        </AbsoluteFill>

        <div
          style={{ position: "absolute", left: boxAt.x, top: boxAt.y, width: box.width, height: box.height, display: "flex" }}
        >
          {halls}
        </div>

        {dialogIn > 0 ? (
          <AbsoluteFill style={{ justifyContent: "flex-end", overflow: "hidden" }}>
            <AbsoluteFill
              style={{ backgroundColor: colors.scrim, backdropFilter: `blur(${SCRIM_BLUR * T.appPx}px)`, opacity: dialogIn }}
            />
            {/* `DrawerContent` slides up from the bottom edge rather than fading in. */}
            <div
              style={{
                transform: `translateY(${(1 - dialogIn) * sheetHeight * T.appPx}px) scale(${T.appPx})`,
                transformOrigin: "bottom left",
                width: sheetWidth,
              }}
            >
              {form(true)}
            </div>
          </AbsoluteFill>
        ) : null}

        <svg
          width={box.width}
          height={box.height}
          style={{ position: "absolute", left: boxAt.x, top: boxAt.y, overflow: "visible" }}
        >
          <g transform={`translate(${pointer.x} ${pointer.y}) scale(${T.pointer})`}>
            <Cursor x={0} y={0} opacity={pointerOpacity} pressed={pressed} />
          </g>
        </svg>
      </Backdrop>
    );
  }

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
              opacity: lineIn,
              transform: `translateY(${interpolate(lineIn, [0, 1], [24, 0])}px)`,
            }}
          >
            {tl.walkthrough.floors}
          </div>
        </div>

        <div style={{ position: "relative", width: box.width, height: box.height, display: "flex", flexShrink: 0 }}>
          {halls}

          {dialogIn > 0 ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 20 * scale,
                overflow: "hidden",
                backgroundColor: colors.scrim,
                backdropFilter: `blur(${SCRIM_BLUR * APP_PX}px)`,
                opacity: dialogIn,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ transform: `scale(${APP_PX * interpolate(dialogIn, [0, 1], [0.95, 1])})` }}>
                {form(false)}
              </div>
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
