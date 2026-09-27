import React from "react";
import { Easing, interpolate, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { Cursor } from "../../components/Cursor";
import { seatPositions, type Point } from "../../geometry";
import { tl } from "../../i18n";
import { COUCH_HALL } from "../../layouts";
import { colors, shadow } from "../../theme";
import { CAMERA, type LineKey, LINES, POINTER_RUNS, PRESS, type Shot, type Stop } from "../script";
import { CouchDesk, DESK, hallToDesk, layoutAt } from "./CouchDesk";
import { SpeechLine } from "./SpeechLine";
import { TimeChip } from "./TimeChip";

/**
 * Portrait only: the clock and the two voices take the top of the frame, the
 * laptop the rest, clear of the caption a Reel lays over the bottom.
 */
const LAYOUT = {
  padX: 48,
  chipTop: 140,
  chipSize: 38,
  linesTop: 262,
  lineSize: 62,
  /** Between the asking line and the answer. */
  lineGap: 34,
  /** The laptop is seen through a window from here to the bottom of the frame. */
  viewTop: 700,
  /** The window's top edge fades rather than cuts, where a close-up runs under the lines. */
  viewFade: 36,
  pointer: 2,
};

/** The laptop around its screen, in desk pixels: a dark bezel, and the base under it, a little wider. */
const LAPTOP = { bezel: 26, bezelRadius: 40, screenRadius: 14, baseOver: 90, baseHeight: 46, notchWidth: 320, notchHeight: 12 };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Every line's text, the table count read off the room rather than typed. */
const TEXT: Record<LineKey, string> = {
  hook: tl.couch.hook,
  tea: tl.couch.tea,
  floor: tl.couch.floor,
  headTable: tl.couch.headTable,
  howMany: tl.couch.howMany,
  tableCount: tl.couch.tableCount(COUCH_HALL.tables.length),
  grandma: tl.couch.grandma,
  cousins: tl.couch.cousins,
  work: tl.couch.work,
  whereElse: tl.couch.whereElse,
  everyone: tl.couch.everyone,
  seated: tl.couch.seated,
};

const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

type Camera = { focus: Point; zoom: number; atY: number };

/**
 * The camera at `frame`, in desk pixels. A hall shot is placed through the
 * layout on screen at that frame, so it follows the room when the panel opens.
 */
const cameraAt = (frame: number, frameWidth: number): Camera => {
  const layout = layoutAt(frame);
  const resolve = (shot: Shot): Camera =>
    shot.kind === "desk"
      ? { focus: shot.focus, zoom: shot.zoom, atY: shot.atY }
      : { focus: hallToDesk(shot.focus, layout), zoom: frameWidth / (shot.span * layout.unit), atY: shot.atY };

  let move = CAMERA[0];
  for (const next of CAMERA) {
    if (frame >= next.range[0]) move = next;
  }
  if (frame < move.range[0]) return resolve(move.from);
  const t = interpolate(frame, move.range, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const from = resolve(move.from);
  const to = resolve(move.to);
  return {
    focus: mix(from.focus, to.focus, t),
    // Geometric, so the push reads as a steady move at every scale.
    zoom: from.zoom * Math.pow(to.zoom / from.zoom, t),
    atY: from.atY + (to.atY - from.atY) * t,
  };
};

const stopPoint = (stop: Stop): Point => {
  if ("at" in stop) return stop.at;
  const table = COUCH_HALL.tables.find((t) => t.id === stop.table);
  if (!table) throw new Error(`No table ${stop.table} in the couch hall`);
  return seatPositions(table)[stop.seat];
};

/** Where the one pointer is at `frame`, in hall units, and whether it is shown and pressed. */
const pointerAt = (frame: number) => {
  const run = POINTER_RUNS.find((r) => frame >= r.in[0] && frame <= r.out[1]);
  if (!run) return null;
  const points = run.stops.map(stopPoint);
  // It comes in from below and to the right of its first stop, and drifts off the same way.
  const aside = (p: Point): Point => ({ x: p.x + 60, y: p.y + 90 });
  const ease = (range: [number, number]) =>
    interpolate(frame, range, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

  let at = mix(aside(points[0]), points[0], ease([run.in[0], run.stops[0].frame - 1]));
  for (let i = 1; i < run.stops.length; i++) {
    if (frame > run.stops[i - 1].frame) {
      at = mix(points[i - 1], points[i], ease([run.stops[i - 1].frame + PRESS, run.stops[i].frame - 1]));
    }
  }
  const last = points[points.length - 1];
  if (frame > run.stops[run.stops.length - 1].frame) {
    at = mix(last, aside(last), ease([run.out[0], run.out[1]]));
  }
  const opacity = interpolate(frame, run.in, [0, 1], clamp) * interpolate(frame, run.out, [1, 0], clamp);
  const pressed = run.stops.some((stop) => stop.press && frame >= stop.frame && frame < stop.frame + PRESS);
  return { at, opacity, pressed };
};

/**
 * The sunday-couch cut as every scene draws it, from the cut's clock: the time
 * chip and the couple's lines over the laptop, and the laptop under one
 * continuous camera. `copy` is off for the call to action, which draws the
 * laptop behind its own lines.
 */
export const CouchPlanner: React.FC<{ frame: number; copy?: boolean }> = ({ frame, copy = true }) => {
  const { width: frameWidth, height: frameHeight, fps } = useVideoConfig();
  const camera = cameraAt(frame, frameWidth);
  const at = { x: frameWidth / 2, y: camera.atY - LAYOUT.viewTop };
  const toView = (p: Point): Point => ({
    x: at.x + (p.x - camera.focus.x) * camera.zoom,
    y: at.y + (p.y - camera.focus.y) * camera.zoom,
  });

  const pointer = pointerAt(frame);
  const pointerOnView = pointer ? toView(hallToDesk(pointer.at, layoutAt(frame))) : null;

  const fade = (range: readonly [number, number]) =>
    interpolate(frame, range, [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const side = (which: "left" | "right") => (
    <div style={{ display: "grid" }}>
      {LINES.filter((line) => line.side === which).map((line) => (
        <div key={line.key} style={{ gridArea: "1 / 1" }}>
          <SpeechLine
            text={TEXT[line.key]}
            side={line.side}
            enter={line.enter ? fade(line.enter) : 1}
            exit={fade(line.exit)}
            size={LAYOUT.lineSize}
          />
        </div>
      ))}
    </div>
  );

  return (
    <Backdrop>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: LAYOUT.viewTop,
          width: frameWidth,
          height: frameHeight - LAYOUT.viewTop,
          overflow: "hidden",
          maskImage: `linear-gradient(to bottom, transparent 0, black ${LAYOUT.viewFade}px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: DESK.width,
            height: DESK.height,
            transformOrigin: "0 0",
            transform: `translate(${at.x - camera.focus.x * camera.zoom}px, ${at.y - camera.focus.y * camera.zoom}px) scale(${camera.zoom})`,
          }}
        >
          {/* The base, and the dark lid round the screen. */}
          <div
            style={{
              position: "absolute",
              left: -LAPTOP.baseOver,
              top: DESK.height + LAPTOP.bezel,
              width: DESK.width + LAPTOP.baseOver * 2,
              height: LAPTOP.baseHeight,
              borderRadius: `6px 6px ${LAPTOP.baseHeight}px ${LAPTOP.baseHeight}px`,
              backgroundColor: colors.tableBorder,
              boxShadow: shadow.card,
            }}
          >
            <div
              style={{
                margin: "0 auto",
                width: LAPTOP.notchWidth,
                height: LAPTOP.notchHeight,
                borderRadius: `0 0 ${LAPTOP.notchHeight}px ${LAPTOP.notchHeight}px`,
                backgroundColor: colors.inkSoft,
                opacity: 0.45,
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              left: -LAPTOP.bezel,
              top: -LAPTOP.bezel,
              width: DESK.width + LAPTOP.bezel * 2,
              height: DESK.height + LAPTOP.bezel * 2,
              borderRadius: LAPTOP.bezelRadius,
              backgroundColor: colors.primary,
              boxShadow: shadow.card,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: LAPTOP.screenRadius,
              overflow: "hidden",
              backgroundColor: colors.bg,
            }}
          >
            <CouchDesk frame={frame} fps={fps} />
          </div>
        </div>

        {pointer && pointerOnView ? (
          <svg
            width={frameWidth}
            height={frameHeight - LAYOUT.viewTop}
            style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
          >
            <g transform={`translate(${pointerOnView.x} ${pointerOnView.y}) scale(${LAYOUT.pointer})`}>
              <Cursor x={0} y={0} opacity={pointer.opacity} pressed={pointer.pressed} />
            </g>
          </svg>
        ) : null}
      </div>

      {copy ? (
        <>
          <div style={{ position: "absolute", left: LAYOUT.padX, top: LAYOUT.chipTop }}>
            <TimeChip frame={frame} size={LAYOUT.chipSize} />
          </div>
          <div
            style={{
              position: "absolute",
              left: LAYOUT.padX,
              right: LAYOUT.padX,
              top: LAYOUT.linesTop,
              display: "flex",
              flexDirection: "column",
              gap: LAYOUT.lineGap,
            }}
          >
            {side("left")}
            {side("right")}
          </div>
        </>
      ) : null}
    </Backdrop>
  );
};
