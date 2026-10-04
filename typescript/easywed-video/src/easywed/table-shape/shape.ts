import { interpolate } from "remotion";
import { rosterFor } from "../data";
import { seatPositions, type Point } from "../geometry";
import { tl } from "../i18n";
import { PX_PER_M, TABLE_SHAPE_HALL, type TableSpec } from "../layouts";
import {
  CLEARED_FOR,
  MORPH_LONG,
  MORPH_NARROW,
  MORPH_SQUARE,
  MORPH_TURN,
  TAP_HEIGHT,
  TAP_ROTATE,
  TAP_SHAPE,
  TAP_WIDTH,
  TYPE_HEIGHT,
  TYPE_WIDTH,
} from "./script";

/**
 * Stół 3 through the cut, as `TablePanelContent` holds it. Its form keeps
 * `width`/`height` as the *visible* rectangle, and a round table is stored
 * `width = height = Ø` (`getSizeForShape`), so *Prostokątny* turns it into a
 * square of the same size; *Obróć o 90°* swaps the two values. The app keeps
 * the table's `position` - its top-left corner - through every edit, so each
 * shape grows out of the same corner. Its eight guests stay throughout:
 * `applyToStore` passes them on at the unchanged capacity, and a rotation
 * drops only the seats' position overrides (`updateTable`).
 */
export const TABLE_LABEL = tl.hall.table(3);
const TABLE = TABLE_SHAPE_HALL.tables.find((table) => table.label === TABLE_LABEL);
if (!TABLE || TABLE.shape !== "round") throw new Error(`${TABLE_LABEL} must start round`);

/** The table's top-left corner on the canvas, which every edit keeps. */
export const CORNER = { x: TABLE.x - TABLE.width / 2, y: TABLE.y - TABLE.height / 2 };
export const SEATS = TABLE.seats;

/** The two values typed into the form, in metres. */
export const TYPED = { width: 3, height: 1 };

export type Pose = { round: boolean; width: number; height: number };

const DIAMETER = TABLE.width / PX_PER_M;
/** Round; square at the same size; stretched to the typed width; the typed depth; turned. */
const POSES: Pose[] = [
  { round: true, width: DIAMETER, height: DIAMETER },
  { round: false, width: DIAMETER, height: DIAMETER },
  { round: false, width: TYPED.width, height: DIAMETER },
  { round: false, width: TYPED.width, height: TYPED.height },
  { round: false, width: TYPED.height, height: TYPED.width },
];
const MORPHS = [MORPH_SQUARE, MORPH_LONG, MORPH_NARROW, MORPH_TURN];

/** Which two poses the table is between at `frame`, and how far along, eased. */
const poseAt = (frame: number): { from: Pose; to: Pose; t: number } => {
  let index = 0;
  while (index < MORPHS.length && frame >= MORPHS[index][1]) index++;
  if (index === MORPHS.length) return { from: POSES[index], to: POSES[index], t: 0 };
  const [start, end] = MORPHS[index];
  const t = interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });
  return { from: POSES[index], to: POSES[index + 1], t };
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPoints = (a: Point[], b: Point[], t: number) =>
  a.map((p, i) => ({ x: lerp(p.x, b[i].x, t), y: lerp(p.y, b[i].y, t) }));

/** A pose as a canvas table, grown out of `CORNER`. */
const specOf = (pose: Pose): TableSpec => {
  const width = pose.width * PX_PER_M;
  const height = pose.height * PX_PER_M;
  return {
    ...TABLE,
    shape: pose.round ? "round" : "rect",
    x: CORNER.x + width / 2,
    y: CORNER.y + height / 2,
    width,
    height,
  };
};

/**
 * Stół 3 on the canvas at `frame`: drawn as a rectangle whose corners start at
 * half its side - a circle - once it has left round, its chairs travelling
 * from one layout to the next.
 */
export const canvasTableAt = (frame: number) => {
  const { from, to, t } = poseAt(frame);
  const a = specOf(from);
  const b = specOf(to);
  const spec: TableSpec = {
    ...b,
    shape: from.round && t === 0 ? "round" : "rect",
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    width: lerp(a.width, b.width, t),
    height: lerp(a.height, b.height, t),
  };
  const corner = lerp(from.round ? a.width / 2 : 10, to.round ? b.width / 2 : 10, t);
  return { spec, corner, seats: lerpPoints(seatPositions(a), seatPositions(b), t) };
};

/** `TableSeatMap`'s own constants: the diagram's bounds, its markers, and the tighter preview gap. */
const MAX_W = 280;
const MAX_H = 168;
export const PREVIEW_SEAT = 24;
const PAD = PREVIEW_SEAT / 2 + 4;
const PREVIEW_SEAT_OFFSET_M = 0.14;

/** `computeSeatPositions` at easywed/v1, in table-local metres. */
const seatSlots = (pose: Pose, offset: number, seats: number): Point[] => {
  if (pose.round) {
    const r = pose.width / 2;
    return Array.from({ length: seats }, (_, i) => {
      const angle = -Math.PI / 2 + (i / seats) * 2 * Math.PI;
      return { x: r + (r + offset) * Math.cos(angle), y: r + (r + offset) * Math.sin(angle) };
    });
  }
  const horizontal = pose.width >= pose.height;
  const edge = horizontal ? pose.width : pose.height;
  const first = Math.ceil(seats / 2);
  return Array.from({ length: seats }, (_, i) => {
    const onFirst = i < first;
    const count = onFirst ? first : seats - first;
    const d = (((onFirst ? i : i - first) + 1) / (count + 1)) * edge;
    if (horizontal) return { x: d, y: onFirst ? -offset : pose.height + offset };
    return { x: onFirst ? -offset : pose.width + offset, y: d };
  });
};

type Preview = { boxW: number; boxH: number; table: { x: number; y: number; w: number; h: number; radius: number }; seats: Point[] };

/**
 * `TableSeatMap`'s diagram for a pose, in px: the box, the footprint in it, and
 * each marker's centre. `seats` is Stół 3's unless another table is drawn.
 */
export const previewOf = (pose: Pose, seats: number = SEATS): Preview => {
  const placed = seatSlots(pose, PREVIEW_SEAT_OFFSET_M, seats);
  const minX = Math.min(0, ...placed.map((p) => p.x));
  const maxX = Math.max(pose.width, ...placed.map((p) => p.x));
  const minY = Math.min(0, ...placed.map((p) => p.y));
  const maxY = Math.max(pose.height, ...placed.map((p) => p.y));
  const scale = Math.min((MAX_W - 2 * PAD) / (maxX - minX), (MAX_H - 2 * PAD) / (maxY - minY));
  const px = (m: number) => PAD + (m - minX) * scale;
  const py = (m: number) => PAD + (m - minY) * scale;
  const w = pose.width * scale;
  const h = pose.height * scale;
  return {
    boxW: (maxX - minX) * scale + 2 * PAD,
    boxH: (maxY - minY) * scale + 2 * PAD,
    // `rounded-full` round, `rounded-md` otherwise.
    table: { x: px(0), y: py(0), w, h, radius: pose.round ? Math.min(w, h) / 2 : 8 },
    seats: placed.map((p) => ({ x: px(p.x), y: py(p.y) })),
  };
};

/** The form's seat diagram at `frame`, between the same two poses as the canvas. */
export const previewAt = (frame: number): Preview => {
  const { from, to, t } = poseAt(frame);
  const a = previewOf(from);
  const b = previewOf(to);
  return {
    boxW: lerp(a.boxW, b.boxW, t),
    boxH: lerp(a.boxH, b.boxH, t),
    table: {
      x: lerp(a.table.x, b.table.x, t),
      y: lerp(a.table.y, b.table.y, t),
      w: lerp(a.table.w, b.table.w, t),
      h: lerp(a.table.h, b.table.h, t),
      radius: lerp(a.table.radius, b.table.radius, t),
    },
    seats: lerpPoints(a.seats, b.seats, t),
  };
};

/** A value as a number input shows it - JavaScript's own, with its decimal point. */
const shown = (metres: number) => String(metres);

export type FormState = {
  round: boolean;
  /** What each field reads; while one is being retyped it shows empty for a beat. */
  diameter: string;
  width: string;
  height: string;
  focus: "width" | "height" | null;
};

/** The form's fields at `frame`, which change on the tap or the keystroke - no tween. */
export const formAt = (frame: number): FormState => {
  const turned = frame >= TAP_ROTATE;
  const width = frame >= TYPE_WIDTH ? TYPED.width : frame >= TYPE_WIDTH - CLEARED_FOR ? null : DIAMETER;
  const height = frame >= TYPE_HEIGHT ? TYPED.height : frame >= TYPE_HEIGHT - CLEARED_FOR ? null : DIAMETER;
  const text = (value: number | null) => (value === null ? "" : shown(value));
  return {
    round: frame < TAP_SHAPE,
    diameter: shown(DIAMETER),
    // `onChange` of the rotation field: `width: form.height, height: form.width`.
    width: text(turned ? height : width),
    height: text(turned ? width : height),
    focus: turned ? null : frame >= TAP_HEIGHT ? "height" : frame >= TAP_WIDTH ? "width" : null,
  };
};

/** `getInitials`: the first letters of the first two words, uppercased. */
export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

/** The wedding's guest list on this room: `rosterFor`, 58 names, each at a table. */
export const GUEST_LIST = rosterFor(TABLE_SHAPE_HALL.tables);

/** Each table's guests in list order, which is the order `resolveSeatOccupants` fills its chairs. */
export const guestsAt = (label: string) => GUEST_LIST.filter((guest) => guest.table === label).map((guest) => guest.name);
