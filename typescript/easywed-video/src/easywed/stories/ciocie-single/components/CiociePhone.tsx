import React from "react";
import { Easing, interpolate } from "remotion";
import { TableEditSheet, TAPS } from "../../../chill-wed/table-shape/components/TableEditSheet";
import { HallCanvas, PAD } from "../../../components/HallCanvas";
import { Icon, NAV_ITEMS, type IconName } from "../../../components/Icon";
import { PhoneFrame, PHONE, Touch } from "../../../components/PhoneFrame";
import { canvasBox, PhoneShell } from "../../../components/PhoneShell";
import { tl } from "../../../i18n";
import type { TableSpec } from "../../../layouts";
import { colors } from "../../../theme";
import {
  canvasNamesAt,
  FORM,
  GUEST_LIST,
  guestsAt,
  HALL,
  INITIALS,
  passAt,
  PREVIEW,
  RENAMES,
  seatPxAt,
  selectedAt,
  showsInitials,
  viewAt,
  fieldAt,
} from "../rename";
import { JUMP, PINCH, PRESS_HELD, TOOLBAR_IN } from "../script";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const BOX = canvasBox("owner");

/** A canvas point in the canvas box's own CSS px, under the view at `frame`. */
const toBox = (frame: number, x: number, y: number) => {
  const { zoom, centre } = viewAt(frame);
  return { x: PHONE.width / 2 + (x - centre.x) * zoom, y: BOX.height / 2 + (y - centre.y) * zoom };
};
/** The same point in the phone's CSS px, for a thumb or the camera. */
const toPhone = (frame: number, x: number, y: number) => {
  const p = toBox(frame, x, y);
  return { x: p.x, y: BOX.top + p.y };
};

/**
 * `DraggableTable`'s toolbar over a selected table: 2rem above its edge, lifted
 * past the seat ring by `SEAT_OFFSET_M` and half a marker. `p-1` round a
 * `size-3.5` icon, `gap-1`; the pen is the phone's own (`isMobile`), then copy,
 * duplicate and a red delete - the table-shape cut's toolbar.
 */
const TOOL = 4 + 14 + 4 + 2;
const TOOLS: { icon: IconName; danger?: boolean }[] = [
  { icon: "squarePen" },
  { icon: "clipboardCopy" },
  { icon: "copy" },
  { icon: "trash", danger: true },
];
const TOOLBAR_WIDTH = TOOLS.length * TOOL + (TOOLS.length - 1) * 4;
const toolbarAt = (frame: number, table: TableSpec) => {
  const { zoom } = viewAt(frame);
  const ppm = 60 * zoom;
  const top = toBox(frame, table.x, table.y - table.height / 2).y - 32 - (0.3 * ppm + seatPxAt(zoom) / 2);
  return { left: toBox(frame, table.x, 0).x - TOOLBAR_WIDTH / 2, top };
};
const penAt = (frame: number, table: TableSpec) => {
  const bar = toolbarAt(frame, table);
  return { x: bar.left + TOOL / 2, y: BOX.top + bar.top + TOOL / 2 };
};

const Toolbar: React.FC<{ left: number; top: number; enter: number; pressed: boolean }> = ({ left, top, enter, pressed }) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
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

/** The room at `frame`: every table full, the two renamed ones carrying whatever their field holds. */
const Canvas: React.FC<{ frame: number }> = ({ frame }) => {
  const { zoom } = viewAt(frame);
  const origin = toBox(frame, -PAD.left, -PAD.top);
  const names = canvasNamesAt(frame);
  const hall = { ...HALL, tables: HALL.tables.map((table, i) => ({ ...table, label: names[i] })) };
  const selected = selectedAt(frame);
  const { pass } = passAt(frame);
  // The first pass taps its table in; the jump lands on the second already selected.
  const toolbarIn = frame < JUMP ? interpolate(frame, TOOLBAR_IN, [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) : 1;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: origin.x,
          top: origin.y,
          width: (HALL.canvas.width + PAD.left + PAD.right) * zoom,
          height: (HALL.canvas.height + PAD.top + PAD.bottom) * zoom,
          display: "flex",
        }}
      >
        <HallCanvas
          hall={hall}
          outline={1}
          floor={1}
          tableIn={HALL.tables.map(() => 1)}
          seatFill={HALL.tables.map(() => 1)}
          seatInitials={showsInitials(zoom) ? INITIALS : undefined}
          selectedTableId={selected?.id}
          labelSize={12 / zoom}
          countSize={10 / zoom}
        />
      </div>
      {selected ? (
        <Toolbar
          {...toolbarAt(frame, selected)}
          enter={toolbarIn}
          pressed={frame >= pass.tapEdit && frame < pass.tapEdit + PRESS_HELD}
        />
      ) : null}
    </>
  );
};

/** Two fingers drawing together as the plan zooms out: `Touch`'s soft dot, held. */
const Pinch: React.FC<{ frame: number }> = ({ frame }) => {
  const [start, end] = PINCH;
  if (frame < start - 5 || frame > end + 6) return null;
  const opacity = interpolate(frame, [start - 5, start - 1], [0, 1], clamp) * interpolate(frame, [end, end + 6], [1, 0], clamp);
  const spread = interpolate(frame, PINCH, [1, 0.35], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const centre = { x: PHONE.width / 2, y: BOX.top + BOX.height / 2 };
  return (
    <>
      {[-1, 1].map((side) => (
        <div
          key={side}
          style={{
            position: "absolute",
            left: centre.x + side * 110 * spread - 22,
            top: centre.y + side * 150 * spread - 22,
            width: 44,
            height: 44,
            borderRadius: 999,
            backgroundColor: "rgba(36, 31, 26, 0.3)",
            opacity,
          }}
        />
      ))}
    </>
  );
};

/**
 * The couple's phone at `frame` on the cut's clock: the planner signed in,
 * pinched in on the room. A table is tapped, its toolbar's pen opens *Edytuj
 * stół*, and the name is retyped - Stół 2 to *Single*, then, past the jump
 * cut, Stół 5 to *Ciocie* - the check closing the drawer onto the plan each
 * time. Last, two fingers pinch out over the whole room. Drawn at the phone's
 * own size - the stage places and scales it.
 */
export const CiociePhone: React.FC<{ frame: number }> = ({ frame }) => {
  const { table, to, pass } = passAt(frame);
  const rise = interpolate(frame, pass.sheetUp, [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const drop = interpolate(frame, pass.sheetDown, [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const field = fieldAt(frame, table.label, to, pass);

  // `useTabBadgeCounts`: unseated guests, tables, fixtures - the dance floor is
  // one - and open reminders, the films' one; the assistant carries none.
  const reminders = NAV_ITEMS.find((item) => item.kind === "reminders")?.badge ?? 0;
  const badges = [GUEST_LIST.filter((guest) => !guest.table).length, HALL.tables.length, HALL.fixtures.length + 1, reminders, 0];

  const tableTap = RENAMES[0].pass.tapTable;
  const first = RENAMES[0].table;

  return (
    <PhoneFrame>
      <PhoneShell hall={HALL} guests={GUEST_LIST} badges={badges} sheet={0} mode="owner" canvas={<Canvas frame={frame} />}>
        <TableEditSheet
          name={field}
          capacity={table.seats}
          form={FORM}
          preview={PREVIEW}
          initials={INITIALS[HALL.tables.indexOf(table)]}
          guests={guestsAt(table.label)}
          enter={rise * (1 - drop)}
          scroll={0}
          pressed={{ rectangular: false, rotate: false, done: frame >= pass.tapDone && frame < pass.tapDone + PRESS_HELD }}
          nameField={{
            focused: frame >= pass.tapName && frame < pass.tapDone,
            placeholder: tl.app.tableBatch.namePlaceholder,
          }}
        />
      </PhoneShell>

      {/* The thumb, in the same CSS px as the screen it touches. */}
      <div style={{ position: "absolute", inset: 0 }}>
        {tableTap !== undefined ? <Touch frame={frame} at={tableTap} {...toPhone(tableTap, first.x, first.y)} /> : null}
        {RENAMES.map(({ table: t, pass: p }) => (
          <React.Fragment key={t.id}>
            <Touch frame={frame} at={p.tapEdit} {...penAt(p.tapEdit, t)} />
            <Touch frame={frame} at={p.tapName} x={TAPS.name.x} y={TAPS.name.y} />
            <Touch frame={frame} at={p.tapDone} x={TAPS.done.x} y={TAPS.done.y} />
          </React.Fragment>
        ))}
        <Pinch frame={frame} />
      </div>
    </PhoneFrame>
  );
};

/** Points the camera aims at, in the phone's CSS px. */
export const PHONE_MARKS = {
  /** Each renamed table where the view leaves it once its drawer has closed. */
  singles: toPhone(0, RENAMES[0].table.x, RENAMES[0].table.y),
  aunts: toPhone(JUMP, RENAMES[1].table.x, RENAMES[1].table.y),
  /** The middle of the canvas box, where the whole room sits once pinched out. */
  canvas: { x: PHONE.width / 2, y: BOX.top + BOX.height / 2 },
};
