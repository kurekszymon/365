import React from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { Cursor } from "../../components/Cursor";
import { HallCanvas, hallAspect, PAD as HALL_PAD } from "../../components/HallCanvas";
import { canvasInsets, chromeScale, PlannerCanvas } from "../../components/PlannerCanvas";
import { useFormat } from "../../format";
import type { Point } from "../../geometry";
import { tl } from "../../i18n";
import { L_HALL, type HallLayout } from "../../layouts";
import { colors, fonts } from "../../theme";
import {
  DIALOG_FADE,
  DRAG,
  DRAG_BY,
  GRAB,
  grabPoint,
  HOOK_IN,
  isPressed,
  PAYOFF_IN,
  POINTER_IN,
  POINTER_OUT,
  PRESS_CHIP,
  PRESS_EDIT,
  PRESS_L,
  type Press,
  released,
  RELEASE,
  shapeAt,
} from "../script";
import { HALL_PANEL, HallPanel, hallPanelHeight, hallPanelTargets } from "../../components/HallPanel";
import { ShapeEditPill } from "./ShapeEditPill";
import { VertexHandles } from "./VertexHandles";

/** Frame padding, and the width of the text column beside the planner. */
const PAD = { x: 56, y: 56 };
const COLUMN = 560;

/** The pointer is drawn at this multiple of `Cursor`'s own size. */
const POINTER_SCALE = 1.5;

/**
 * The app's own pixels -> frame pixels, for the dialog, the shape-edit pill
 * and the vertex handles: big enough to read at the page's 960 px, small
 * enough that the dialog leaves the room's right-hand wall in view.
 */
const APP_PX = 1.25;

/** `DialogOverlay`'s `backdrop-blur-xs`. */
const SCRIM_BLUR = 4;

/** `HallView`'s label chip, which the pointer clicks near its grip end. */
const CHIP_AIM = { x: 70, y: 33 };

/**
 * Portrait, for the long walkthrough's 9:16 cut, stacks as the seat-swap cut
 * does (`SwapCutPlanner`): the question and the payoff centred over the room.
 * The hall's settings there are the phone's bottom sheet
 * (`MobilePanelDrawer`), as wide as the frame at the import cut's 2x
 * (`dialogScale`) - which also sizes the shape-edit pill and the handles.
 */
export const SHAPE_TALL = { padX: 48, padY: 150, roomTop: 500, hookSize: 92, payoffSize: 60, pointer: 2.2, appPx: 2 };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * The planner as the loop shows it: the question beside `L_HALL` drawn as a
 * plain rectangle, its settings opened from the label chip, *Kształt L* picked,
 * the dialog giving way to the shape editor, and one corner dragged a metre
 * outward. Every scene of the loop renders this from the loop's clock.
 *
 * The long walkthrough shapes its second hall instead, passed as `hall`, and
 * its 9:16 cut draws this stacked, the settings in the phone's bottom sheet.
 */
export const ShapePlanner: React.FC<{ frame: number; hall?: HallLayout }> = ({
  frame,
  // The loop is 16:9 only - the L is its own room, so this reads `L_HALL` rather than `useFormat().hall`.
  hall = L_HALL,
}) => {
  const { width: frameWidth, height: frameHeight } = useVideoConfig();
  const { tall, type, gap } = useFormat();

  // The viewport is sized to the room, as `PlanScene` sizes it.
  const insets = canvasInsets(tall);
  const room = tall
    ? {
        width: frameWidth - SHAPE_TALL.padX * 2 - insets.left - insets.right,
        height: frameHeight - SHAPE_TALL.roomTop - SHAPE_TALL.padY - insets.top - insets.bottom,
      }
    : {
        width: frameWidth - PAD.x * 2 - COLUMN - gap - insets.left - insets.right,
        height: frameHeight - PAD.y * 2 - insets.top - insets.bottom,
      };
  const aspect = hallAspect(hall);
  const drawWidth = Math.min(room.width, room.height * aspect);
  // Portrait keeps the whole planner area and centres the room in it, which
  // leaves the shape-edit pill clear of the room's top wall.
  const box = {
    width: drawWidth + insets.left + insets.right,
    height: tall ? room.height + insets.top + insets.bottom : drawWidth / aspect + insets.top + insets.bottom,
  };
  const drawTop = tall ? (room.height - drawWidth / aspect) / 2 : 0;

  // Hall units -> viewport pixels.
  const unit = drawWidth / (hall.canvas.width + HALL_PAD.left + HALL_PAD.right);
  const toBox = (p: Point): Point => ({
    x: insets.left + (p.x + HALL_PAD.left) * unit,
    y: insets.top + drawTop + (p.y + HALL_PAD.top) * unit,
  });

  // Portrait places the room itself; landscape leaves it to the row.
  const boxAt = { x: (frameWidth - box.width) / 2, y: SHAPE_TALL.roomTop };
  const appPx = tall ? SHAPE_TALL.appPx : APP_PX;
  const sheetWidth = frameWidth / SHAPE_TALL.appPx;

  // The dialog is centred on the planner, as `DialogContent` centres itself on
  // the window, and re-centres when the hint and *Edytuj obrys* make it taller.
  // The sheet stands on the frame's bottom edge and grows upward instead.
  const dialogAt = (lShape: boolean, p: Point): Point =>
    tall
      ? {
          x: p.x * SHAPE_TALL.appPx - boxAt.x,
          y: frameHeight - hallPanelHeight(lShape, true) * SHAPE_TALL.appPx + p.y * SHAPE_TALL.appPx - boxAt.y,
        }
      : {
          x: box.width / 2 + (p.x - HALL_PANEL.width / 2) * APP_PX,
          y: box.height / 2 + (p.y - hallPanelHeight(lShape) / 2) * APP_PX,
        };
  const targets = (lShape: boolean) =>
    tall ? hallPanelTargets(lShape, sheetWidth, true) : hallPanelTargets(lShape);

  // The pointer's stops, each reached just before its press lands.
  const grab = toBox(grabPoint(hall));
  const entry = { x: box.width * 0.8, y: box.height * 0.62 };
  const stops: { at: Point; press: Press }[] = [
    { at: toBox(CHIP_AIM), press: PRESS_CHIP },
    { at: dialogAt(false, targets(false).lShape), press: PRESS_L },
    { at: dialogAt(true, targets(true).editOutline), press: PRESS_EDIT },
    { at: grab, press: GRAB },
  ];
  const exitTo = { x: box.width * 0.92, y: box.height * 0.95 };

  let pointer = entry;
  for (let i = 0; i < stops.length; i++) {
    const arrive = stops[i].press.at - 2;
    const depart = arrive - stops[i].press.travel;
    if (frame < depart) break;
    const from = i === 0 ? entry : stops[i - 1].at;
    const t = interpolate(frame, [depart, arrive], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
    pointer = { x: from.x + (stops[i].at.x - from.x) * t, y: from.y + (stops[i].at.y - from.y) * t };
  }

  // The drag: the pointer carries the corner a metre up, in hall units.
  const pull = interpolate(frame, DRAG, [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const pulled = { x: DRAG_BY.x * pull, y: DRAG_BY.y * pull };
  if (frame >= DRAG[0]) pointer = { x: grab.x + pulled.x * unit, y: grab.y + pulled.y * unit };

  const leave = interpolate(frame, POINTER_OUT, [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  pointer = {
    x: pointer.x + (exitTo.x - pointer.x) * leave,
    y: pointer.y + (exitTo.y - pointer.y) * leave,
  };
  const pointerOpacity =
    interpolate(frame, POINTER_IN, [0, 1], clamp) * interpolate(frame, POINTER_OUT, [1, 0], clamp);
  const holding = frame >= GRAB.at - 3 && frame < RELEASE;
  const pressed = holding || stops.some((stop) => isPressed(frame, stop.press));

  const shape = shapeAt(frame, hall, pulled);

  // The dialog opens on the chip's click and closes on *Edytuj obrys*: the
  // shape editor is a canvas-only panel view, which `EntityEditDialog` does
  // not host.
  const dialogIn =
    interpolate(frame, [released(PRESS_CHIP), released(PRESS_CHIP) + DIALOG_FADE], [0, 1], clamp) *
    interpolate(frame, [released(PRESS_EDIT), released(PRESS_EDIT) + DIALOG_FADE], [1, 0], clamp);
  const editing = frame >= released(PRESS_EDIT);

  const hookIn = interpolate(frame, HOOK_IN, [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const payoffIn = interpolate(frame, PAYOFF_IN, [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });

  const scale = chromeScale(tall);

  const planner = (
    <PlannerCanvas hall={hall} tall={tall}>
      <HallCanvas
        hall={hall}
        outline={1}
        floor={1}
        tableIn={hall.tables.map(() => 1)}
        seatFill={hall.tables.map(() => 1)}
        walls={shape.walls}
      >
        {editing ? <VertexHandles vertices={shape.preview} px={appPx / unit} opacity={1} /> : null}
      </HallCanvas>
    </PlannerCanvas>
  );

  const pill = editing ? (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        // One row under the canvas toolbar: at the video's chrome scale
        // the app's `top-3` would put the pill on top of it.
        top: (10 + 26 + 6) * scale,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ transform: `scale(${appPx})`, transformOrigin: "top center" }}>
        <ShapeEditPill maxWidth={(box.width - 16 * appPx) / appPx} />
      </div>
    </div>
  ) : null;

  const panel = (drawer: boolean) => (
    <HallPanel
      hallName={hall.name}
      meters={hall.meters}
      lShape={shape.lShape}
      floor={hall.floor === undefined ? undefined : String(hall.floor)}
      position={hall.position}
      drawer={drawer}
      width={drawer ? sheetWidth : undefined}
    />
  );

  if (tall) {
    return (
      <Backdrop>
        <AbsoluteFill style={{ padding: `${SHAPE_TALL.padY}px ${SHAPE_TALL.padX}px 0`, alignItems: "center" }}>
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: SHAPE_TALL.hookSize,
              fontWeight: 600,
              letterSpacing: -2,
              lineHeight: 1.05,
              color: colors.ink,
              textAlign: "center",
              opacity: hookIn,
              transform: `translateY(${interpolate(hookIn, [0, 1], [24, 0])}px)`,
            }}
          >
            {tl.shape.hook}
          </div>
          <div
            style={{
              marginTop: 28,
              fontFamily: fonts.sans,
              fontSize: SHAPE_TALL.payoffSize,
              fontWeight: 500,
              lineHeight: 1.3,
              color: colors.terracotta,
              textAlign: "center",
              opacity: payoffIn,
              transform: `translateY(${interpolate(payoffIn, [0, 1], [18, 0])}px)`,
            }}
          >
            {tl.shape.payoff}
          </div>
        </AbsoluteFill>

        <div
          style={{
            position: "absolute",
            left: boxAt.x,
            top: boxAt.y,
            width: box.width,
            height: box.height,
            display: "flex",
          }}
        >
          {planner}
          {pill}
        </div>

        {/* The sheet covers the whole screen's width, its scrim the whole screen. */}
        {dialogIn > 0 ? (
          <AbsoluteFill style={{ justifyContent: "flex-end", overflow: "hidden" }}>
            <AbsoluteFill
              style={{
                backgroundColor: colors.scrim,
                backdropFilter: `blur(${SCRIM_BLUR * SHAPE_TALL.appPx}px)`,
                opacity: dialogIn,
              }}
            />
            {/* `DrawerContent` slides up from the bottom edge rather than fading in. */}
            <div
              style={{
                transform: `translateY(${(1 - dialogIn) * hallPanelHeight(shape.lShape, true) * SHAPE_TALL.appPx}px) scale(${SHAPE_TALL.appPx})`,
                transformOrigin: "bottom left",
                width: sheetWidth,
              }}
            >
              {panel(true)}
            </div>
          </AbsoluteFill>
        ) : null}

        <svg
          width={box.width}
          height={box.height}
          style={{ position: "absolute", left: boxAt.x, top: boxAt.y, overflow: "visible" }}
        >
          <g transform={`translate(${pointer.x} ${pointer.y}) scale(${SHAPE_TALL.pointer})`}>
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
              opacity: hookIn,
              transform: `translateY(${interpolate(hookIn, [0, 1], [24, 0])}px)`,
            }}
          >
            {tl.shape.hook}
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
            {tl.shape.payoff}
          </div>
        </div>

        <div style={{ position: "relative", width: box.width, height: box.height, display: "flex", flexShrink: 0 }}>
          {planner}
          {pill}

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
                {panel(false)}
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
