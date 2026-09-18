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
  caretOn,
  HOOK_IN,
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
  RESEATED,
  SEAT_POP,
  TYPE_A,
  TYPE_B,
  typedAt,
  typedBy,
  type Typing,
} from "../cutScript";
import { isPressed, type Press, released } from "../script";
import {
  DISPLACED,
  FROM_TABLE,
  MOVER,
  seatFillsAt,
  seatIndexOf,
  seatingAt,
  type SeatSection,
  sectionsFor,
  TO_TABLE,
} from "../seating";
import { POPOVER, popoverHeight, rowTop, SeatPopover } from "./SeatPopover";

/**
 * Landscape frames the room as the loop does, the copy in a column beside it.
 * Portrait stacks the question and the payoff over the room, clear of the
 * caption a Reel lays over the bottom of the frame, and draws the room as wide
 * as the frame allows.
 */
const LAYOUT = {
  wide: { padX: 56, padY: 56, column: 560, hookSize: 87, payoffSize: 38, pointer: 1.5 },
  tall: { padX: 48, padY: 150, column: 0, hookSize: 92, payoffSize: 60, pointer: 2.2 },
};

/**
 * The popover's scale against its CSS spec. Landscape draws it at the chrome's
 * own scale, as the loop does; on a phone that leaves a 19px name, so portrait
 * draws it larger - as the kids cut draws its list - but no larger than lets
 * Stół 4's full list still hang above its chair inside the room.
 */
const POPOVER_SCALE = { wide: chromeScale(false), tall: 2.2 };

/** How close the popover may come to the viewport's edge before Radix flips or shifts it. */
const EDGE = 16;

/** Portrait: the room sits this far below the top of the frame, under the two lines. */
const TALL_ROOM_TOP = 500;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** A row the pointer is resting on, from just before the press until just after it. */
const hovering = (frame: number, press: Press) => frame >= press.at - 3 && frame < released(press) + 3;

/** The field is focused from the moment it opens: the caret blinks, and holds steady while keys land. */
const caretAt = (frame: number, typing: Typing, text: string) =>
  (frame >= typing.from && frame <= typedBy(typing, text) + typing.step) || caretOn(frame);

/** The first name - what a user types to find a guest. */
const firstName = (name: string) => name.split(" ")[0];

/**
 * The planner as the social cut shows it: a seated room and the question, a
 * chair at a full table pressed, the mover found by typing her name and picked,
 * then the chair she left pressed and the guest she turned out found the same
 * way. Every planner scene renders this from the cut's clock; `copy` is off for
 * the call to action, which draws the room behind its own lines.
 */
export const SwapCutPlanner: React.FC<{ frame: number; copy?: boolean }> = ({ frame, copy = true }) => {
  const { width: frameWidth, height: frameHeight } = useVideoConfig();
  const { hall, tall, gap } = useFormat();
  const layout = tall ? LAYOUT.tall : LAYOUT.wide;

  // The viewport is sized to the room, as `PlanScene` sizes it, so the chrome
  // floats against the walls rather than in the corners of a letterbox.
  const insets = canvasInsets(tall);
  const room = tall
    ? {
        width: frameWidth - layout.padX * 2 - insets.left - insets.right,
        height: frameHeight - TALL_ROOM_TOP - layout.padY - insets.top - insets.bottom,
      }
    : {
        width: frameWidth - layout.padX * 2 - layout.column - gap - insets.left - insets.right,
        height: frameHeight - layout.padY * 2 - insets.top - insets.bottom,
      };
  const aspect = hallAspect(hall);
  const drawWidth = Math.min(room.width, room.height * aspect);
  const box = {
    width: drawWidth + insets.left + insets.right,
    height: drawWidth / aspect + insets.top + insets.bottom,
  };
  const boxLeft = tall ? (frameWidth - box.width) / 2 : frameWidth - layout.padX - box.width;
  const boxTop = tall ? TALL_ROOM_TOP : (frameHeight - box.height) / 2;

  // Hall units -> viewport pixels.
  const unit = drawWidth / (hall.canvas.width + HALL_PAD.left + HALL_PAD.right);
  const toBox = (p: Point): Point => ({
    x: insets.left + (p.x + HALL_PAD.left) * unit,
    y: insets.top + (p.y + HALL_PAD.top) * unit,
  });

  const scale = tall ? POPOVER_SCALE.tall : POPOVER_SCALE.wide;
  const seating = seatingAt(hall, frame, MOVED_IN, RESEATED);
  // The chair she leaves behind changes colour over a few frames rather than
  // snapping, so the marker's own pop reads as someone getting up and sitting.
  const fromSeat = seatIndexOf(hall, FROM_TABLE, MOVER);
  const toSeat = seatIndexOf(hall, TO_TABLE, DISPLACED);
  const fills = seatFillsAt(hall, seating);
  fills[hall.tables.findIndex((table) => table.id === FROM_TABLE)][fromSeat] = Math.max(
    interpolate(frame, [MOVED_IN, MOVED_IN + SEAT_POP], [1, 0], clamp),
    interpolate(frame, [RESEATED, RESEATED + SEAT_POP], [0, 1], clamp),
  );

  const markerAt = (tableId: string, index: number): Point => {
    const table = hall.tables.find((t) => t.id === tableId);
    if (!table) throw new Error(`No table ${tableId} in ${hall.name}`);
    return toBox(seatPositions(table)[index]);
  };
  const markerA = markerAt(TO_TABLE, toSeat);
  const markerB = markerAt(FROM_TABLE, fromSeat);

  // What each popover lists is the room as it stood when that popover opened,
  // narrowed by whatever has been typed into its search so far.
  const queryA = firstName(MOVER);
  const queryB = firstName(DISPLACED);
  const seatingA = seatingAt(hall, POPOVER_A[0], MOVED_IN, RESEATED);
  const seatingB = seatingAt(hall, POPOVER_B[0], MOVED_IN, RESEATED);
  const typedA = typedAt(frame, TYPE_A, queryA);
  const typedB = typedAt(frame, TYPE_B, queryB);
  const sectionsA = sectionsFor(seatingA, TO_TABLE, toSeat, typedA);
  const sectionsB = sectionsFor(seatingB, FROM_TABLE, fromSeat, typedB);
  // Once the whole name is in, one row is left - the pointer's target.
  const foundA = sectionsFor(seatingA, TO_TABLE, toSeat, queryA);
  const foundB = sectionsFor(seatingB, FROM_TABLE, fromSeat, queryB);
  const only = (sections: SeatSection[], name: string, key: string) => {
    if (sections.length !== 1 || sections[0].key !== key || sections[0].items.join() !== name) {
      throw new Error(`Typing "${firstName(name)}" should leave ${name} alone under ${key}`);
    }
  };
  only(foundA, MOVER, "elsewhere");
  only(foundB, DISPLACED, "unassigned");

  /**
   * Radix hangs the menu above the marker (`side="top"`, `sideOffset={4}`),
   * flips it below when the viewport has no room, and shifts it sideways to
   * keep it inside. The viewport here is the planner's box - the app's window.
   * Its height follows the list as it narrows, so its bottom edge stays on the
   * marker while its top comes down.
   */
  const place = (marker: Point, unscaledHeight: number) => {
    const width = POPOVER.width * scale;
    const height = unscaledHeight * scale;
    const clearance = SEAT_RADIUS * unit + POPOVER.offset * scale;
    const above = marker.y - clearance - height;
    const below = marker.y + clearance;
    const left = Math.min(Math.max(marker.x - width / 2, EDGE), box.width - EDGE - width);
    return { left, top: above >= EDGE ? above : below };
  };

  // Where each popover sits is decided the moment it opens, from its full list,
  // and kept - floating-ui does not flip a menu that shrinks under the pointer.
  const fullA = popoverHeight(sectionsFor(seatingA, TO_TABLE, toSeat), true);
  const fullB = popoverHeight(sectionsFor(seatingB, FROM_TABLE, fromSeat), false);
  const openedA = place(markerA, fullA);
  const openedB = place(markerB, fullB);
  const anchored = (opened: { left: number; top: number }, marker: Point, fullHeight: number, height: number) =>
    opened.top < marker.y ? { left: opened.left, top: opened.top + (fullHeight - height) * scale } : opened;
  const placedA = anchored(openedA, markerA, fullA, popoverHeight(sectionsA, true));
  const placedB = anchored(openedB, markerB, fullB, popoverHeight(sectionsB, false));
  const pickedA = anchored(openedA, markerA, fullA, popoverHeight(foundA, true));
  const pickedB = anchored(openedB, markerB, fullB, popoverHeight(foundB, false));

  // A popover is on screen from its own click until the pick that closes it,
  // plus the moment Radix takes to fade it away.
  const fade = (span: readonly [number, number]) =>
    interpolate(frame, [span[0], span[0] + POPOVER_IN], [0, 1], clamp) *
    interpolate(frame, [span[1], span[1] + POPOVER_IN], [1, 0], clamp);
  const showA = frame >= POPOVER_A[0] && frame < POPOVER_A[1] + POPOVER_IN;
  const showB = frame >= POPOVER_B[0] && frame < POPOVER_B[1] + POPOVER_IN;
  // After the pick the app clears the search and closes; the closing frames
  // keep the one row that was picked rather than flashing the full list back.
  const open = showA
    ? {
        sections: frame < POPOVER_A[1] ? sectionsA : foundA,
        hasClear: true,
        placed: frame < POPOVER_A[1] ? placedA : pickedA,
        in: fade(POPOVER_A),
        search: { text: frame < POPOVER_A[1] ? typedA : queryA, caret: caretAt(frame, TYPE_A, queryA) },
      }
    : showB
      ? {
          sections: frame < POPOVER_B[1] ? sectionsB : foundB,
          hasClear: false,
          placed: frame < POPOVER_B[1] ? placedB : pickedB,
          in: fade(POPOVER_B),
          search: { text: frame < POPOVER_B[1] ? typedB : queryB, caret: caretAt(frame, TYPE_B, queryB) },
        }
      : null;

  /** The centre of the one row left, on screen, so the pointer can land on it. */
  const rowCentre = (placed: { left: number; top: number }, sections: SeatSection[], hasClear: boolean): Point => ({
    x: placed.left + (POPOVER.width * scale) / 2,
    y:
      placed.top +
      (POPOVER.pad + POPOVER.input + POPOVER.gap + (hasClear ? POPOVER.clear + POPOVER.gap : 0)) * scale +
      (rowTop(sections, sections[0].key, 0) + POPOVER.row / 2) * scale,
  });

  // The pointer's stops, each reached just before its press lands. It comes in
  // from below the room, clear of the minimap card in the corner.
  const entry = { x: box.width * 0.6, y: box.height * 0.96 };
  const stops: { at: Point; press: Press }[] = [
    { at: markerA, press: PRESS_SEAT_A },
    { at: rowCentre(pickedA, foundA, true), press: PRESS_MOVER },
    { at: markerB, press: PRESS_SEAT_B },
    { at: rowCentre(pickedB, foundB, false), press: PRESS_DISPLACED },
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
      ? { key: "elsewhere", index: 0 }
      : undefined
    : hovering(frame, PRESS_DISPLACED)
      ? { key: "unassigned", index: 0 }
      : undefined;

  const hookIn = interpolate(frame, HOOK_IN, [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const payoffIn = interpolate(frame, PAYOFF_IN, [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });

  const hook = (
    <div
      style={{
        fontFamily: fonts.heading,
        fontSize: layout.hookSize,
        fontWeight: 600,
        letterSpacing: -2,
        lineHeight: 1.05,
        color: colors.ink,
        textAlign: tall ? "center" : "left",
        opacity: hookIn,
        transform: `translateY(${interpolate(hookIn, [0, 1], [24, 0])}px)`,
      }}
    >
      {tl.swapCut.hook}
    </div>
  );
  const payoff = (
    <div
      style={{
        fontFamily: fonts.sans,
        fontSize: layout.payoffSize,
        fontWeight: 500,
        lineHeight: 1.3,
        color: colors.terracotta,
        textAlign: tall ? "center" : "left",
        opacity: payoffIn,
        transform: `translateY(${interpolate(payoffIn, [0, 1], [18, 0])}px)`,
      }}
    >
      {tl.swapCut.payoff}
    </div>
  );

  return (
    <Backdrop>
      {copy ? (
        <AbsoluteFill
          style={
            tall
              ? { padding: `${layout.padY}px ${layout.padX}px 0` }
              : { left: layout.padX, width: layout.column, padding: `${layout.padY + insets.top}px 0 0` }
          }
        >
          {hook}
          <div style={{ marginTop: tall ? 28 : 36 }}>{payoff}</div>
        </AbsoluteFill>
      ) : null}

      <div
        style={{
          position: "absolute",
          left: boxLeft,
          top: boxTop,
          width: box.width,
          height: box.height,
          display: "flex",
        }}
      >
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
              scroll={0}
              hasClear={open.hasClear}
              hover={hover}
              scale={scale}
              open={open.in}
              search={open.search}
            />
          </div>
        ) : null}

        <svg
          width={box.width}
          height={box.height}
          style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
        >
          <g transform={`translate(${pointer.x} ${pointer.y}) scale(${layout.pointer})`}>
            <Cursor x={0} y={0} opacity={pointerOpacity} pressed={pressed} />
          </g>
        </svg>
      </div>
    </Backdrop>
  );
};
