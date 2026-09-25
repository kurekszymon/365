import React from "react";
import { Easing, interpolate, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { CaptionLine } from "../../components/CaptionLine";
import { Cursor } from "../../components/Cursor";
import {
  HallCanvas,
  hallAspect,
  PAD as HALL_PAD,
} from "../../components/HallCanvas";
import { canvasInsets, PlannerCanvas } from "../../components/PlannerCanvas";
import { rosterFor } from "../../data";
import { useFormat } from "../../format";
import type { Point } from "../../geometry";
import { tl } from "../../i18n";
import { KEEP_APART_HALL } from "../../layouts";
import { colors, fonts } from "../../theme";
import {
  CAMERA_BACK,
  CAMERA_IN,
  CAMERA_ROOM,
  DAD_MOVE,
  DRAG_LINE_IN,
  DRAG_LINE_OUT,
  GRAB_AT,
  GUESTS_LINE_IN,
  HOOK_OUT,
  type Move,
  PARENTS_LINE_IN,
  PARENTS_LINE_OUT,
  POINTER_DAD,
  POINTER_SIX,
  type PointerTiming,
  SHOT_BOTH,
  SHOT_DJ,
  SHOT_PARENTS,
  SHOT_ROOM,
  type Shot,
  SIX_MOVE,
  SNAP,
} from "../script";

/**
 * Portrait only: the lines stack over the room, clear of the caption a Reel
 * lays over the bottom of the frame, and the room is drawn as wide as the
 * frame allows - the seat-swap cut's frame.
 */
const LAYOUT = {
  padX: 48,
  padY: 150,
  hookSize: 84,
  captionSize: 60,
  pointer: 2.2,
};

/** The room sits this far below the top of the frame, under the lines. */
const ROOM_TOP = 500;

/** `Canvas.tsx`'s zoom pill at the fitted view - the chrome every planner shot carries. */
const BASE_ZOOM = 92;

/** The couple's names run longer than *Stół 1*; the app writes them at `text-xs`, well inside the table. */
const LABEL_SIZE = 18;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** `getInitials` in the app's `Canvas/utils.ts`: the first letters of the first two words. */
const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

/** Every chair taken: the whole list, each guest at the table their row names. */
const ROSTER = rosterFor(KEEP_APART_HALL.tables);
const INITIALS = KEEP_APART_HALL.tables.map((table) =>
  ROSTER.filter((guest) => guest.table === table.label).map((guest) =>
    getInitials(guest.name),
  ),
);

const MOVES = [DAD_MOVE, SIX_MOVE];

/** A quadratic curve through `via` - the arc a hand draws across the room. */
const arc = (from: Point, via: Point, to: Point, t: number): Point => ({
  x: (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * via.x + t * t * to.x,
  y: (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * via.y + t * t * to.y,
});

const mix = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

/** Where a moved table's centre stands at `frame`. */
const positionAt = (move: Move, from: Point, frame: number): Point => {
  if (frame < move.drag[0]) return from;
  if (frame < move.drop) {
    const t = interpolate(frame, move.drag, [0, 1], {
      ...clamp,
      easing: Easing.inOut(Easing.cubic),
    });
    return arc(from, move.via, move.release, t);
  }
  const t = interpolate(frame, [move.drop, move.drop + SNAP], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.quad),
  });
  return mix(move.release, move.to, t);
};

/**
 * The planner as the keep-apart cut shows it: close on Stół 6 beside the DJ
 * booth, taken to the far corner with its eight guests, then the couple's two
 * family tables one behind the other, and Rodzina taty dragged across the
 * dance floor into the gap Stół 6 left. Every planner scene renders this from the cut's clock;
 * `copy` is off for the call to action, which draws the room behind its own lines.
 */
export const ApartPlanner: React.FC<{ frame: number; copy?: boolean }> = ({
  frame,
  copy = true,
}) => {
  const { width: frameWidth, height: frameHeight } = useVideoConfig();
  const { tall } = useFormat();
  const start = KEEP_APART_HALL;

  // The tables as they stand this frame - the minimap reads the same room.
  const hall = {
    ...start,
    tables: start.tables.map((table) => {
      const move = MOVES.find((m) => m.table === table.id);
      return move ? { ...table, ...positionAt(move, table, frame) } : table;
    }),
  };

  // The viewport is sized to the room, as `PlanScene` sizes it.
  const insets = canvasInsets(tall);
  const room = {
    width: frameWidth - LAYOUT.padX * 2 - insets.left - insets.right,
    height: frameHeight - ROOM_TOP - LAYOUT.padY - insets.top - insets.bottom,
  };
  const aspect = hallAspect(hall);
  const drawWidth = Math.min(room.width, room.height * aspect);
  const draw = { width: drawWidth, height: drawWidth / aspect };
  const box = {
    width: draw.width + insets.left + insets.right,
    height: draw.height + insets.top + insets.bottom,
  };
  const boxLeft = (frameWidth - box.width) / 2;

  // Hall units -> pixels of the drawing at its fitted size.
  const unit = drawWidth / (hall.canvas.width + HALL_PAD.left + HALL_PAD.right);
  const toDraw = (p: Point): Point => ({
    x: (p.x + HALL_PAD.left) * unit,
    y: (p.y + HALL_PAD.top) * unit,
  });

  /** A shot held inside the drawing: the camera never shows past the hall's own margin. */
  const framed = (shot: Shot): Shot => {
    const half = {
      x: draw.width / (2 * unit * shot.zoom),
      y: draw.height / (2 * unit * shot.zoom),
    };
    const within = (value: number, min: number, max: number) =>
      min > max ? (min + max) / 2 : Math.min(Math.max(value, min), max);
    return {
      zoom: shot.zoom,
      focus: {
        x: within(
          shot.focus.x,
          -HALL_PAD.left + half.x,
          hall.canvas.width + HALL_PAD.right - half.x,
        ),
        y: within(
          shot.focus.y,
          -HALL_PAD.top + half.y,
          hall.canvas.height + HALL_PAD.bottom - half.y,
        ),
      },
    };
  };
  const between = (
    a: Shot,
    b: Shot,
    range: readonly [number, number],
  ): Shot => {
    const t = interpolate(frame, range, [0, 1], {
      ...clamp,
      easing: Easing.inOut(Easing.cubic),
    });
    const from = framed(a);
    const to = framed(b);
    return {
      focus: mix(from.focus, to.focus, t),
      zoom: from.zoom + (to.zoom - from.zoom) * t,
    };
  };
  const camera =
    frame < CAMERA_IN[0]
      ? between(SHOT_DJ, SHOT_ROOM, CAMERA_ROOM)
      : frame < CAMERA_BACK[0]
        ? between(SHOT_ROOM, SHOT_PARENTS, CAMERA_IN)
        : between(SHOT_PARENTS, SHOT_BOTH, CAMERA_BACK);
  const focus = toDraw(camera.focus);
  const pan = {
    x: draw.width / 2 - camera.zoom * focus.x,
    y: draw.height / 2 - camera.zoom * focus.y,
  };

  /** A hall point on screen, relative to the planner's box. */
  const toBox = (p: Point): Point => {
    const d = toDraw(p);
    return {
      x: insets.left + pan.x + camera.zoom * d.x,
      y: insets.top + pan.y + camera.zoom * d.y,
    };
  };

  // The pointer: in from below the room, onto the table, along with it, then away.
  const pointerFor = (move: Move, timing: PointerTiming) => {
    const table = hall.tables.find((t) => t.id === move.table);
    if (!table) throw new Error(`No table ${move.table} in ${hall.name}`);
    const grip =
      frame < move.drop
        ? { x: table.x + GRAB_AT.x, y: table.y + GRAB_AT.y }
        : null;
    const held = grip ?? {
      x: move.release.x + GRAB_AT.x,
      y: move.release.y + GRAB_AT.y,
    };
    const target = toBox(held);
    const entry = { x: box.width * 0.62, y: box.height * 1.02 };
    const glide = interpolate(frame, timing.travel, [0, 1], {
      ...clamp,
      easing: Easing.inOut(Easing.cubic),
    });
    const leave = interpolate(frame, timing.out, [0, 1], {
      ...clamp,
      easing: Easing.in(Easing.quad),
    });
    const at = mix(
      mix(entry, target, glide),
      { x: target.x + box.width * 0.12, y: box.height * 1.04 },
      leave,
    );
    const opacity =
      interpolate(frame, timing.in, [0, 1], clamp) *
      interpolate(frame, timing.out, [1, 0], clamp);
    return { at, opacity, pressed: frame >= move.grab && frame < move.drop };
  };
  const pointer =
    frame < POINTER_DAD.in[0]
      ? pointerFor(SIX_MOVE, POINTER_SIX)
      : pointerFor(DAD_MOVE, POINTER_DAD);
  const dragging = MOVES.find(
    (move) => frame >= move.grab && frame < move.drop,
  );

  const fade = (range: readonly [number, number]) =>
    interpolate(frame, range, [0, 1], {
      ...clamp,
      easing: Easing.out(Easing.quad),
    });
  const hookOut = fade(HOOK_OUT);

  const hook = (
    <div
      style={{
        fontFamily: fonts.heading,
        fontSize: LAYOUT.hookSize,
        fontWeight: 600,
        letterSpacing: -2,
        lineHeight: 1.05,
        color: colors.ink,
        textAlign: "center",
        opacity: 1 - hookOut,
      }}
    >
      {tl.keepApart.hook}
    </div>
  );

  // Every line takes the same band above the room, one replacing the next.
  const lines = [
    hook,
    <CaptionLine
      key="parents"
      text={tl.keepApart.parentsLine}
      enter={fade(PARENTS_LINE_IN)}
      exit={fade(PARENTS_LINE_OUT)}
      size={LAYOUT.captionSize}
    />,
    <CaptionLine
      key="drag"
      text={tl.keepApart.dragLine}
      enter={fade(DRAG_LINE_IN)}
      exit={fade(DRAG_LINE_OUT)}
      size={LAYOUT.captionSize}
    />,
    <CaptionLine
      key="guests"
      text={tl.keepApart.guestsLine}
      enter={fade(GUESTS_LINE_IN)}
      size={LAYOUT.captionSize}
    />,
  ];

  return (
    <Backdrop>
      {copy ? (
        <div
          style={{
            position: "absolute",
            left: LAYOUT.padX,
            right: LAYOUT.padX,
            top: LAYOUT.padY,
            height: ROOM_TOP - LAYOUT.padY - 30,
            display: "grid",
          }}
        >
          {lines.map((line, i) => (
            <div key={i} style={{ gridArea: "1 / 1", alignSelf: "center" }}>
              {line}
            </div>
          ))}
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          left: boxLeft,
          top: ROOM_TOP,
          width: box.width,
          height: box.height,
          display: "flex",
        }}
      >
        <PlannerCanvas
          hall={hall}
          tall={tall}
          zoom={`${Math.round(BASE_ZOOM * camera.zoom)}%`}
        >
          <div
            style={{
              width: draw.width,
              height: draw.height,
              transformOrigin: "0 0",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${camera.zoom})`,
            }}
          >
            <HallCanvas
              hall={hall}
              outline={1}
              floor={1}
              tableIn={hall.tables.map(() => 1)}
              seatFill={hall.tables.map(() => 1)}
              seatInitials={INITIALS}
              labelSize={LABEL_SIZE}
              selectedTableId={dragging?.table}
            />
          </div>
        </PlannerCanvas>

        <svg
          width={box.width}
          height={box.height}
          style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
        >
          <g
            transform={`translate(${pointer.at.x} ${pointer.at.y}) scale(${LAYOUT.pointer})`}
          >
            <Cursor
              x={0}
              y={0}
              opacity={pointer.opacity}
              pressed={pointer.pressed}
            />
          </g>
        </svg>
      </div>
    </Backdrop>
  );
};
