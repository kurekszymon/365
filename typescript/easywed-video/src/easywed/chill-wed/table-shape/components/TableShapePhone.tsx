import React from "react";
import { Easing, interpolate } from "remotion";
import { HallCanvas, PAD } from "../../../components/HallCanvas";
import { Icon, NAV_ITEMS, type IconName } from "../../../components/Icon";
import { PhoneFrame, PHONE, Touch } from "../../../components/PhoneFrame";
import { canvasBox, PhoneShell } from "../../../components/PhoneShell";
import { PlannerTable } from "../../../components/PlannerTable";
import { TABLE_SHAPE_HALL } from "../../../layouts";
import { colors } from "../../../theme";
import {
  PRESS_HELD,
  SCROLL,
  SCROLL_BY,
  SHEET_DOWN,
  SHEET_UP,
  TAP_DONE,
  TAP_EDIT,
  TAP_HEIGHT,
  TAP_ROTATE,
  TAP_SHAPE,
  TAP_TABLE,
  TAP_WIDTH,
  TOOLBAR_IN,
} from "../script";
import { canvasTableAt, CORNER, formAt, GUEST_LIST, guestsAt, initialsOf, previewAt, SEATS, TABLE_LABEL } from "../shape";
import { TableEditSheet, TAPS } from "./TableEditSheet";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const HALL = TABLE_SHAPE_HALL;
const BOX = canvasBox("owner");

/**
 * The couple's view of the canvas: zoomed in to 60 px a metre - 1 px a
 * canvas unit - where the app draws a seat at `seatSizePx` = 20 px, over the
 * 14 px at which `TableSeats` starts writing initials. Framed so the long
 * table Stół 3 becomes stands whole with Stół 1 above it and the dance floor
 * beside it, its chairs clear of the zoom control in the corner.
 */
const ZOOM = 1;
const CENTRE = { x: 150, y: 435 };
/** A canvas point in the canvas box's own CSS px. */
const toBox = (x: number, y: number) => ({
  x: PHONE.width / 2 + (x - CENTRE.x) * ZOOM,
  y: BOX.height / 2 + (y - CENTRE.y) * ZOOM,
});
/** The same point in the phone's CSS px, for a thumb. */
const toPhone = (x: number, y: number) => {
  const p = toBox(x, y);
  return { x: p.x, y: BOX.top + p.y };
};

/** `TableVisual`'s name (`text-xs`) and occupancy (`text-[10px]`), which stay that size at any zoom. */
const LABEL_SIZE = 12 / ZOOM;
const COUNT_SIZE = 10 / ZOOM;

/** The other tables' initials, and Stół 3's - its guests never change. */
const INITIALS = HALL.tables.map((table) => guestsAt(table.label).map(initialsOf));
const TABLE_GUESTS = guestsAt(TABLE_LABEL);
const TABLE_INITIALS = TABLE_GUESTS.map(initialsOf);
const OTHERS = { ...HALL, tables: HALL.tables.filter((table) => table.label !== TABLE_LABEL) };
const OTHER_INITIALS = INITIALS.filter((_, i) => HALL.tables[i].label !== TABLE_LABEL);

/**
 * `DraggableTable`'s toolbar over a selected table: 2rem above its edge, lifted
 * past the seat ring by `SEAT_OFFSET_M` and half a marker. `p-1` round a
 * `size-3.5` icon, `gap-1`; the pen is the phone's own (`isMobile`), then copy,
 * duplicate and a red delete.
 */
const TOOL = 4 + 14 + 4 + 2;
const TOOLS: { icon: IconName; danger?: boolean }[] = [
  { icon: "squarePen" },
  { icon: "clipboardCopy" },
  { icon: "copy" },
  { icon: "trash", danger: true },
];
const SEAT_PX = 60 * ZOOM * 0.34;
const toolbarAt = () => {
  const round = canvasTableAt(0).spec;
  const top = toBox(round.x, CORNER.y).y - 32 - (0.3 * 60 * ZOOM + SEAT_PX / 2);
  const width = TOOLS.length * TOOL + (TOOLS.length - 1) * 4;
  return { left: toBox(round.x, 0).x - width / 2, top };
};
const TOOLBAR = toolbarAt();
const EDIT_BUTTON = { x: TOOLBAR.left + TOOL / 2, y: BOX.top + TOOLBAR.top + TOOL / 2 };

const Toolbar: React.FC<{ enter: number; pressed: boolean }> = ({ enter, pressed }) => (
  <div
    style={{
      position: "absolute",
      left: TOOLBAR.left,
      top: TOOLBAR.top,
      display: "flex",
      gap: 4,
      opacity: enter,
      transform: `translateY(${interpolate(enter, [0, 1], [4, 0])}px)`,
    }}
  >
    {TOOLS.map((tool, i) => (
      <div
        key={tool.icon}
        style={{
          width: TOOL,
          height: TOOL,
          boxSizing: "border-box",
          borderRadius: 8,
          border: `1px solid ${tool.danger ? "#ffc9c9" : colors.tableBorder}`,
          backgroundColor: colors.bg,
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: pressed && i === 0 ? "translateY(1px)" : undefined,
        }}
      >
        <Icon name={tool.icon} color={tool.danger ? colors.destructive : colors.tableInk} size={14} />
      </div>
    ))}
  </div>
);

/** Where the thumb lands to scroll the form: on its empty right side, low on the screen. */
const SWIPE_X = PHONE.width - 70;
const SWIPE_FROM = PHONE.height - 150;

/**
 * The thumb scrolling the form: `Touch`'s soft dot, settling onto the glass
 * before `SCROLL` and travelling up with the content, then lifting off.
 */
const Swipe: React.FC<{ frame: number; x: number; y: number }> = ({ frame, x, y }) => {
  const [start, end] = SCROLL;
  if (frame < start - 5 || frame > end + 6) return null;
  const opacity =
    interpolate(frame, [start - 5, start - 1], [0, 1], clamp) * interpolate(frame, [end, end + 6], [1, 0], clamp);
  const travel = interpolate(frame, SCROLL, [0, SCROLL_BY], { ...clamp, easing: Easing.inOut(Easing.quad) });
  return (
    <div
      style={{
        position: "absolute",
        left: x - 22,
        top: y - 22 - travel,
        width: 44,
        height: 44,
        borderRadius: 999,
        backgroundColor: "rgba(36, 31, 26, 0.22)",
        opacity,
      }}
    />
  );
};

/** The room as the couple has zoomed in on it, Stół 3 at `frame`'s shape. */
const Canvas: React.FC<{ frame: number }> = ({ frame }) => {
  const table = canvasTableAt(frame);
  const origin = toBox(-PAD.left, -PAD.top);
  const selected = frame >= TAP_TABLE && frame < TAP_DONE;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: origin.x,
          top: origin.y,
          width: (HALL.canvas.width + PAD.left + PAD.right) * ZOOM,
          height: (HALL.canvas.height + PAD.top + PAD.bottom) * ZOOM,
          display: "flex",
        }}
      >
        <HallCanvas
          hall={OTHERS}
          outline={1}
          floor={1}
          tableIn={OTHERS.tables.map(() => 1)}
          seatFill={OTHERS.tables.map(() => 1)}
          seatInitials={OTHER_INITIALS}
          labelSize={LABEL_SIZE}
          countSize={COUNT_SIZE}
        >
          <PlannerTable
            table={table.spec}
            enter={1}
            fill={1}
            initials={TABLE_INITIALS}
            seatsAt={table.seats}
            corner={table.corner}
            selected={selected}
            labelSize={LABEL_SIZE}
            countSize={COUNT_SIZE}
          />
        </HallCanvas>
      </div>
      {selected ? (
        <Toolbar
          enter={interpolate(frame, TOOLBAR_IN, [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })}
          pressed={frame >= TAP_EDIT && frame < TAP_EDIT + PRESS_HELD}
        />
      ) : null}
    </>
  );
};

/**
 * The couple's phone at `frame` on the cut's clock: the planner signed in,
 * zoomed in on Stół 3. A tap selects it, the toolbar's pen opens its form, and
 * the table changes shape as the form does - under the drawer, which covers
 * the canvas, so the form's own diagram is where it shows. The check closes
 * it onto the plan. Drawn at the phone's own size - the scene places and
 * scales it.
 */
export const TableShapePhone: React.FC<{ frame: number }> = ({ frame }) => {
  const rise = interpolate(frame, SHEET_UP, [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const drop = interpolate(frame, SHEET_DOWN, [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const held = (at: number) => frame >= at && frame < at + PRESS_HELD;
  const scroll = interpolate(frame, SCROLL, [0, SCROLL_BY], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const scrolled = (tap: { x: number; y: number }) => ({ x: tap.x, y: tap.y - SCROLL_BY });

  // `useTabBadgeCounts`: unseated guests, tables, fixtures - the dance floor is
  // one - and open reminders, the films' one; the assistant carries none.
  const reminders = NAV_ITEMS.find((item) => item.kind === "reminders")?.badge ?? 0;
  const badges = [GUEST_LIST.filter((guest) => !guest.table).length, HALL.tables.length, HALL.fixtures.length + 1, reminders, 0];

  const round = canvasTableAt(0).spec;
  const tableTap = toPhone(round.x, round.y);

  return (
    <PhoneFrame>
      <PhoneShell
        hall={HALL}
        guests={GUEST_LIST}
        badges={badges}
        sheet={0}
        mode="owner"
        canvas={<Canvas frame={frame} />}
      >
        <TableEditSheet
          name={TABLE_LABEL}
          capacity={SEATS}
          form={formAt(frame)}
          preview={previewAt(frame)}
          initials={TABLE_INITIALS}
          guests={TABLE_GUESTS}
          enter={rise * (1 - drop)}
          scroll={scroll}
          pressed={{ rectangular: held(TAP_SHAPE), rotate: held(TAP_ROTATE), done: held(TAP_DONE) }}
        />
      </PhoneShell>

      {/* The thumb, in the same CSS px as the screen it touches. */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Touch frame={frame} at={TAP_TABLE} x={tableTap.x} y={tableTap.y} />
        <Touch frame={frame} at={TAP_EDIT} x={EDIT_BUTTON.x} y={EDIT_BUTTON.y} />
        <Touch frame={frame} at={TAP_SHAPE} x={TAPS.rectangular.x} y={TAPS.rectangular.y} />
        <Swipe frame={frame} x={SWIPE_X} y={SWIPE_FROM} />
        <Touch frame={frame} at={TAP_WIDTH} {...scrolled(TAPS.width)} />
        <Touch frame={frame} at={TAP_HEIGHT} {...scrolled(TAPS.height)} />
        <Touch frame={frame} at={TAP_ROTATE} {...scrolled(TAPS.rotate)} />
        <Touch frame={frame} at={TAP_DONE} x={TAPS.done.x} y={TAPS.done.y} />
      </div>
    </PhoneFrame>
  );
};

/** Points the camera aims at, in the phone's CSS px. */
export const PHONE_MARKS = {
  table: toPhone(canvasTableAt(0).spec.x, canvasTableAt(0).spec.y),
  /** The middle of the view the payoff lands on: the long table, the dance floor beside it. */
  canvas: { x: PHONE.width / 2, y: BOX.top + BOX.height / 2 },
};
