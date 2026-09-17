import React from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { Cursor } from "../../components/Cursor";
import { HallCanvas, hallAspect, PAD as HALL_PAD } from "../../components/HallCanvas";
import { canvasInsets, chromeScale, PlannerCanvas } from "../../components/PlannerCanvas";
import { useFormat } from "../../format";
import type { Point } from "../../geometry";
import { SEAT_RADIUS, seatPositions } from "../../geometry";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";
import {
  DISPLACED,
  FROM_TABLE,
  MOVER,
  seatFillsAt,
  seatIndexOf,
  seatingAt,
  sectionsFor,
  TO_TABLE,
} from "../seating";
import {
  HOOK_IN,
  isPressed,
  MOVED_IN,
  PAYOFF_IN,
  POINTER_IN,
  POINTER_OUT,
  POPOVER_A,
  POPOVER_B,
  POPOVER_IN,
  PRESS_DISPLACED,
  PRESS_MOVER,
  PRESS_SEAT_A,
  PRESS_SEAT_B,
  type Press,
  released,
  RESEATED,
  SCROLL_A_HEADER,
  SCROLL_A_ROW,
  SCROLL_B,
  SEAT_POP,
} from "../script";
import { POPOVER, popoverHeight, rowTop, scrollTo, scrollToHeader, SeatPopover } from "./SeatPopover";

/** Frame padding, and the width of the text column beside the planner - as the to-scale loop sets them. */
const PAD = { x: 56, y: 56 };
const COLUMN = 560;

/** The pointer is drawn at this multiple of `Cursor`'s own size. */
const POINTER_SCALE = 1.5;

/** How close the popover may come to the frame's edge before Radix flips it. */
const EDGE = 16;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** A row the pointer is resting on, from just before the press until just after it. */
const hovering = (frame: number, press: Press) => frame >= press.at - 3 && frame < released(press) + 3;

/**
 * The planner as the loop shows it: a seated room and the question, one chair
 * picked from a full table, a guest brought over from another one, and the guest
 * she turned out given the chair she left. Every scene renders this from the
 * loop's clock.
 */
export const SwapPlanner: React.FC<{ frame: number }> = ({ frame }) => {
  const { width: frameWidth, height: frameHeight } = useVideoConfig();
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
  // Where the box lands in the frame, so a portalled popover can be clipped
  // against the frame rather than against the canvas - as Radix clips it.
  const boxTop = PAD.y + (frameHeight - PAD.y * 2 - box.height) / 2;

  // Hall units -> viewport pixels.
  const unit = drawWidth / (hall.canvas.width + HALL_PAD.left + HALL_PAD.right);
  const toBox = (p: Point): Point => ({
    x: insets.left + (p.x + HALL_PAD.left) * unit,
    y: insets.top + (p.y + HALL_PAD.top) * unit,
  });

  const scale = chromeScale(tall);
  const seating = seatingAt(hall, frame, MOVED_IN, RESEATED);
  // The chair she leaves behind changes colour over a few frames rather than
  // snapping, so the marker's own pop reads as someone getting up and sitting.
  const fills = seatFillsAt(hall, seating);
  fills[hall.tables.findIndex((table) => table.id === FROM_TABLE)][
    seatIndexOf(hall, FROM_TABLE, MOVER)
  ] = Math.max(
    interpolate(frame, [MOVED_IN, MOVED_IN + SEAT_POP], [1, 0], clamp),
    interpolate(frame, [RESEATED, RESEATED + SEAT_POP], [0, 1], clamp),
  );

  // The two chairs the loop touches, and where their markers sit on screen.
  const fromSeat = seatIndexOf(hall, FROM_TABLE, MOVER);
  const toSeat = seatIndexOf(hall, TO_TABLE, DISPLACED);
  const markerAt = (tableId: string, index: number): Point => {
    const table = hall.tables.find((t) => t.id === tableId);
    if (!table) throw new Error(`No table ${tableId} in ${hall.name}`);
    return toBox(seatPositions(table)[index]);
  };
  const markerA = markerAt(TO_TABLE, toSeat);
  const markerB = markerAt(FROM_TABLE, fromSeat);

  // What each popover lists is a snapshot of the room as it stood when that
  // popover opened - the first one before anyone has moved, the second after.
  const sectionsA = sectionsFor(seatingAt(hall, POPOVER_A[0], MOVED_IN, RESEATED), TO_TABLE, toSeat);
  const sectionsB = sectionsFor(seatingAt(hall, POPOVER_B[0], MOVED_IN, RESEATED), FROM_TABLE, fromSeat);
  const moverRow = (sectionsA.find((s) => s.key === "elsewhere")?.items ?? []).indexOf(MOVER);

  /**
   * Radix hangs the menu above the marker (`side="top"`, `sideOffset={4}`) and
   * flips it below when the frame has no room - which is why Stół 4's opens
   * upwards and Stół 1's, higher in the room, opens downwards.
   */
  const place = (marker: Point, unscaledHeight: number) => {
    const height = unscaledHeight * scale;
    const clearance = SEAT_RADIUS * unit + POPOVER.offset * scale;
    const above = marker.y - clearance - height;
    const below = marker.y + clearance;
    return {
      left: marker.x - (POPOVER.width * scale) / 2,
      top: boxTop + above >= EDGE ? above : below,
    };
  };

  const placedA = place(markerA, popoverHeight(sectionsA, true));
  const placedB = place(markerB, popoverHeight(sectionsB, false));

  // Each list is flicked just far enough to bring its target row into view.
  const headerA = scrollToHeader(sectionsA, "elsewhere");
  const restA = scrollTo(sectionsA, "elsewhere", moverRow);
  const restB = scrollTo(sectionsB, "unassigned", 0);
  const scrollA = interpolate(
    frame,
    [SCROLL_A_HEADER[0], SCROLL_A_HEADER[1], SCROLL_A_ROW[0], SCROLL_A_ROW[1]],
    [0, headerA, headerA, restA],
    { ...clamp, easing: Easing.inOut(Easing.cubic) },
  );
  const scrollB = interpolate(frame, SCROLL_B, [0, restB], { ...clamp, easing: Easing.inOut(Easing.cubic) });

  // A popover is on screen from its own click until the pick that closes it,
  // plus the moment Radix takes to fade it away.
  const fade = (span: readonly [number, number]) =>
    interpolate(frame, [span[0], span[0] + POPOVER_IN], [0, 1], clamp) *
    interpolate(frame, [span[1], span[1] + POPOVER_IN], [1, 0], clamp);
  const showA = frame >= POPOVER_A[0] && frame < POPOVER_A[1] + POPOVER_IN;
  const showB = frame >= POPOVER_B[0] && frame < POPOVER_B[1] + POPOVER_IN;
  const open = showA
    ? { sections: sectionsA, hasClear: true, placed: placedA, scroll: scrollA, in: fade(POPOVER_A) }
    : showB
      ? { sections: sectionsB, hasClear: false, placed: placedB, scroll: scrollB, in: fade(POPOVER_B) }
      : null;

  /** The centre of one row on screen, so the pointer can land on it. */
  const rowCentre = (
    placed: { left: number; top: number },
    sections: typeof sectionsA,
    hasClear: boolean,
    key: string,
    index: number,
    scroll: number,
  ): Point => ({
    x: placed.left + (POPOVER.width * scale) / 2,
    y:
      placed.top +
      (POPOVER.pad + POPOVER.input + POPOVER.gap + (hasClear ? POPOVER.clear + POPOVER.gap : 0)) * scale +
      (rowTop(sections, key, index) - scroll + POPOVER.row / 2) * scale,
  });

  // The pointer's stops, each reached just before its press lands.
  // In from below the room, clear of the minimap card in the corner.
  const entry = { x: box.width * 0.6, y: box.height * 0.96 };
  const stops: { at: Point; press: Press }[] = [
    { at: markerA, press: PRESS_SEAT_A },
    { at: rowCentre(placedA, sectionsA, true, "elsewhere", moverRow, restA), press: PRESS_MOVER },
    { at: markerB, press: PRESS_SEAT_B },
    { at: rowCentre(placedB, sectionsB, false, "unassigned", 0, restB), press: PRESS_DISPLACED },
  ];
  const exitTo = { x: box.width * 0.6, y: box.height * 1.04 };

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

  const hover = showA
    ? hovering(frame, PRESS_MOVER)
      ? { key: "elsewhere", index: moverRow }
      : undefined
    : hovering(frame, PRESS_DISPLACED)
      ? { key: "unassigned", index: 0 }
      : undefined;

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
            {tl.swap.hook}
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
            {tl.swap.payoff}
          </div>
        </div>

        <div style={{ position: "relative", width: box.width, height: box.height, display: "flex", flexShrink: 0 }}>
          <PlannerCanvas hall={hall} tall={tall}>
            <HallCanvas
              hall={hall}
              outline={1}
              floor={1}
              tableIn={hall.tables.map(() => 1)}
              seatFill={hall.tables.map(() => 1)}
              seatFills={fills}
            />
          </PlannerCanvas>

          {open ? (
            <div style={{ position: "absolute", left: open.placed.left, top: open.placed.top }}>
              <SeatPopover
                sections={open.sections}
                scroll={open.scroll}
                hasClear={open.hasClear}
                hover={hover}
                scale={scale}
                open={open.in}
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
