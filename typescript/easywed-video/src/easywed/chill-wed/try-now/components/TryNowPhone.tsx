import React from "react";
import { Easing, interpolate } from "remotion";
import { PAGE_TOP, PHONE, PhoneFrame, Touch } from "../../../components/PhoneFrame";
import { PhoneShell, tabAt } from "../../../components/PhoneShell";
import { tl } from "../../../i18n";
import { SEEDED_HALL } from "../../../layouts";
import { previewOf } from "../../table-shape/shape";
import {
  DRAWER_HEIGHT,
  FORM_PAD_X,
  PICKER_TRIGGER_HEIGHT,
  TableEditSheet,
  TAPS,
  formToScreen,
  pickerTriggerTop,
} from "../../table-shape/components/TableEditSheet";
import { CANVAS, MODE, PRESET, PRESET_INDEX, guestsAt, inPlanner, seatedAt, tableCentreAt, tablesAt } from "../plan";
import {
  ADD_DOWN,
  ADD_UP,
  FORM2_DOWN,
  FORM2_UP,
  FORM_DOWN,
  FORM_GROW,
  GUESTS_DOWN,
  GUESTS_UP,
  HUB_UP,
  PAN,
  PINCH,
  PRESS_HELD,
  SCROLL,
  TAP_ADD_GUEST,
  TAP_CARD,
  TAP_CLOSE_PICKER,
  TAP_DONE,
  TAP_DONE2,
  TAP_FAB,
  TAP_GUEST,
  TAP_GUESTS,
  TAP_OUTSIDE,
  TAP_PEN,
  TAP_PICK,
  TAP_SAVE,
  TAP_TABLE,
  TAP_TRY,
  TYPE_EVERY,
  TYPE_FROM,
} from "../script";
import { ADD_GUEST_AT, AddGuestSheet } from "./AddGuestSheet";
import { AddHubSheet, HUB_SHEET_HEIGHT, hubCardAt } from "./AddHubSheet";
import { ADD_GUEST_BUTTON, EMPTY_SHEET_TOP, EmptyGuestsSheet } from "./EmptyGuestsSheet";
import { GuestPickerPopover, pickerRowAt } from "./GuestPickerPopover";
import { LandingScreen, TRY_BUTTON } from "./LandingScreen";
import { SeededCanvas, penAt } from "./SeededCanvas";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const rise = { ...clamp, easing: Easing.out(Easing.cubic) };
const drop = { ...clamp, easing: Easing.in(Easing.cubic) };

/** How long a held finger shows before it presses, and after it lets go. */
const HOLD_LEAD = 5;
const HOLD_TAIL = 6;

/** `AddFab`'s centre as `PhoneShell` places it: `right-4`, `size-14`, 5.5rem above the safe area. */
const FAB = { x: PHONE.width - 16 - 28, y: PHONE.height - (88 + PHONE.safeBottom) - 28 };

/** The round preset as the table form holds it: no name, Ø 1.5 m, eight chairs. */
const FORM = {
  round: true,
  diameter: String(PRESET.size.width),
  width: String(PRESET.size.width),
  height: String(PRESET.size.height),
  focus: null,
};
const PREVIEW = previewOf({ round: true, width: PRESET.size.width, height: PRESET.size.height }, PRESET.capacity);
const FRESH = { namePlaceholder: tl.app.tableBatch.namePlaceholder, guestsPlaceholder: tl.app.tableForm.guestsPick };

/** The guest the couple types, and her initials as `getInitials` draws them on the chair. */
const GUEST = tl.tryNow.guest;
const INITIALS = GUEST.split(" ")
  .map((part) => part.charAt(0))
  .join("")
  .toUpperCase();

/** Every letter is in before *Zapisz* is tapped. */
if (TYPE_FROM + GUEST.length * TYPE_EVERY > TAP_SAVE) {
  throw new Error("The name would still be typing when Zapisz is tapped");
}
const typedAt = (frame: number) => GUEST.slice(0, Math.max(0, Math.floor((frame - TYPE_FROM) / TYPE_EVERY) + 1));

/**
 * The picker's trigger, scrolled to sit `PICKER_LANDS` px under the form's
 * header, with room for its popover under it.
 */
const TRIGGER_TOP = pickerTriggerTop(FORM.round, PREVIEW.boxH);
const PICKER_LANDS = 240;
const SCROLL_BY = TRIGGER_TOP - PICKER_LANDS;
const scrollAt = (frame: number) => interpolate(frame, SCROLL, [0, SCROLL_BY], { ...clamp, easing: Easing.inOut(Easing.quad) });
const CONTENT_WIDTH = PHONE.width - FORM_PAD_X * 2;
const POPOVER = { left: FORM_PAD_X, top: formToScreen(TRIGGER_TOP + PICKER_TRIGGER_HEIGHT + 4, SCROLL_BY), width: CONTENT_WIDTH };
/** What the thumb takes: the trigger, her row, and a spot on the form beside the popover to close it. */
const PICK_AT = { x: PHONE.width / 2, y: formToScreen(TRIGGER_TOP + PICKER_TRIGGER_HEIGHT / 2, SCROLL_BY) };
const ROW_AT = { x: POPOVER.left + pickerRowAt(POPOVER.width).x, y: POPOVER.top + pickerRowAt(POPOVER.width).y };
const CLOSE_AT = { x: PHONE.width - 60, y: formToScreen(TRIGGER_TOP - 60, SCROLL_BY) };
/** A tap on the plan above the guest drawer. */
const OUTSIDE_AT = { x: PHONE.width / 2, y: 300 };
/** Where the thumb swipes the form from: its empty right edge, low on the screen. */
const SWIPE_FROM = { x: PHONE.width - 40, y: PHONE.height - 140 };

/**
 * A finger held on the glass and moved - a swipe, a pan or half a pinch: the
 * same soft dot as `Touch`, riding with `at` from a little before `grab` until
 * just after `release`, darker while it presses.
 */
const Hold: React.FC<{ frame: number; grab: number; release: number; at: { x: number; y: number } }> = ({ frame, grab, release, at }) => {
  if (frame < grab - HOLD_LEAD || frame > release + HOLD_TAIL) return null;
  const opacity =
    interpolate(frame, [grab - HOLD_LEAD, grab], [0, 1], clamp) * interpolate(frame, [release, release + HOLD_TAIL], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: at.x - 22,
        top: at.y - 22,
        width: 44,
        height: 44,
        borderRadius: 999,
        backgroundColor: frame >= grab && frame < release ? "rgba(36, 31, 26, 0.3)" : "rgba(36, 31, 26, 0.22)",
        opacity,
      }}
    />
  );
};

/**
 * The couple's phone at `frame` on the cut's clock: the landing page until
 * *Wypróbujcie bez konta* is tapped, then the planner in guest mode on the hall
 * `/wedding/local` seeds - no name on the wedding, the first-run card up. The
 * first table in from the add hub, the plan pinched in on it, the first guest
 * typed in, and seated from the table's form. Drawn at the phone's own size -
 * the stage places and scales it.
 */
export const TryNowPhone: React.FC<{ frame: number }> = ({ frame }) => {
  const held = (at: number) => frame >= at && frame < at + PRESS_HELD;

  if (!inPlanner(frame)) {
    return (
      <PhoneFrame>
        <LandingScreen tryPressed={held(TAP_TRY)} />
        <div style={{ position: "absolute", inset: 0 }}>
          <Touch frame={frame} at={TAP_TRY} x={TRY_BUTTON.x} y={TRY_BUTTON.y} />
        </div>
      </PhoneFrame>
    );
  }

  const tables = tablesAt(frame);
  const listed = guestsAt(frame);
  const seated = seatedAt(frame);
  const guests = listed ? [{ name: GUEST, table: seated ? tl.hall.table(1) : "" }] : [];
  // `useTabBadgeCounts`: unseated guests, tables, no fixtures, no reminders; the assistant carries none.
  const badges = [listed - seated, tables, 0, 0, 0];

  const hubIn = interpolate(frame, HUB_UP, [0, 1], rise);
  const grow = interpolate(frame, FORM_GROW, [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const showHub = frame >= HUB_UP[0] && frame < FORM_GROW[1];
  const form1 = frame >= FORM_GROW[1] && frame < FORM_DOWN[1] ? 1 - interpolate(frame, FORM_DOWN, [0, 1], drop) : 0;
  const form2 = interpolate(frame, FORM2_UP, [0, 1], rise) - interpolate(frame, FORM2_DOWN, [0, 1], drop);

  // The guest drawer: its empty state until she is saved, then `PhoneShell`'s list with her row, until a tap outside closes it.
  const emptySheet = frame < TAP_SAVE ? interpolate(frame, GUESTS_UP, [0, 1], rise) : 0;
  const listSheet = frame >= TAP_SAVE ? 1 - interpolate(frame, GUESTS_DOWN, [0, 1], drop) : 0;
  const addGuest = interpolate(frame, ADD_UP, [0, 1], rise) - interpolate(frame, ADD_DOWN, [0, 1], drop);

  const selected = interpolate(frame, [TAP_TABLE, TAP_TABLE + 4], [0, 1], clamp);
  const pickerOpen =
    interpolate(frame, [TAP_PICK + 1, TAP_PICK + 5], [0, 1], clamp) * (1 - interpolate(frame, [TAP_CLOSE_PICKER, TAP_CLOSE_PICKER + 4], [0, 1], clamp));
  const scroll = scrollAt(frame);

  const table = tableCentreAt(frame);
  const pen = penAt(frame);
  const spread = 16 + 40 * interpolate(frame, PINCH, [0, 1], clamp);
  const panBy = interpolate(frame, PAN, [0, 1], clamp) * (tableCentreAt(PAN[1]).y - tableCentreAt(PAN[0]).y);
  const swipe = interpolate(frame, SCROLL, [0, SCROLL_BY], { ...clamp, easing: Easing.inOut(Easing.quad) });

  return (
    <PhoneFrame>
      <PhoneShell
        hall={SEEDED_HALL}
        guests={guests}
        badges={badges}
        sheet={listSheet}
        mode={MODE}
        weddingName=""
        canvas={<SeededCanvas frame={frame} selected={selected} penPressed={held(TAP_PEN)} />}
      >
        {showHub ? (
          <AddHubSheet
            enter={hubIn}
            height={HUB_SHEET_HEIGHT + (DRAWER_HEIGHT - HUB_SHEET_HEIGHT) * grow}
            body={1 - Math.min(1, grow * 2)}
            pressed={frame >= TAP_CARD ? PRESET.key : undefined}
          />
        ) : null}
        <TableEditSheet
          name=""
          capacity={PRESET.capacity}
          form={FORM}
          preview={PREVIEW}
          initials={[]}
          guests={[]}
          enter={form1}
          scroll={0}
          pressed={{ rectangular: false, rotate: false, done: held(TAP_DONE) }}
          fresh={FRESH}
        />
        <EmptyGuestsSheet enter={emptySheet} />
        <AddGuestSheet enter={addGuest} name={typedAt(frame)} focused={frame >= ADD_UP[1] && frame < TAP_SAVE} savePressed={held(TAP_SAVE)} />
        <TableEditSheet
          name=""
          capacity={PRESET.capacity}
          form={FORM}
          preview={PREVIEW}
          initials={seated ? [INITIALS] : []}
          guests={seated ? [GUEST] : []}
          enter={form2}
          scroll={scroll}
          pressed={{ rectangular: false, rotate: false, done: held(TAP_DONE2) }}
          fresh={FRESH}
          below={{
            count: tl.app.tableForm.selectedOf(seated, PRESET.capacity),
            seatListTitle: tl.app.tableForm.seatList,
            seatLabel: tl.app.tableForm.seatNumbered,
            assign: tl.app.tableForm.seatAssign,
            occupants: Array.from({ length: PRESET.capacity }, (_, i) => (seated && i === 0 ? { initials: INITIALS, name: GUEST } : null)),
          }}
        />
        {/* `PhoneShell` draws its children under the browser bar; the popover is placed in screen px. */}
        <div style={{ position: "absolute", left: 0, right: 0, top: -PAGE_TOP, height: PHONE.height }}>
          <GuestPickerPopover left={POPOVER.left} top={POPOVER.top} width={POPOVER.width} enter={pickerOpen} name={GUEST} selected={seated > 0} />
        </div>
      </PhoneShell>

      {/* The thumb, in the same CSS px as the screen it touches. */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Touch frame={frame} at={TAP_FAB} x={FAB.x} y={FAB.y} />
        <Touch frame={frame} at={TAP_CARD} x={hubCardAt(PRESET_INDEX).x} y={hubCardAt(PRESET_INDEX).y} />
        <Touch frame={frame} at={TAP_DONE} x={TAPS.done.x} y={TAPS.done.y} />
        {/* The pinch: two fingers either side of the table, spreading apart as the plan zooms. */}
        {[-1, 1].map((side) => (
          <Hold
            key={side}
            frame={frame}
            grab={PINCH[0]}
            release={PINCH[1]}
            at={{ x: table.x + side * spread * 0.8, y: table.y + side * spread * 0.6 }}
          />
        ))}
        {/* One finger on the floor, dragging the plan down clear of the card. */}
        <Hold frame={frame} grab={PAN[0]} release={PAN[1]} at={{ x: 110, y: tableCentreAt(PAN[0]).y + 40 + panBy }} />
        <Touch frame={frame} at={TAP_GUESTS} x={tabAt(0, MODE).x} y={tabAt(0, MODE).y} />
        <Touch frame={frame} at={TAP_ADD_GUEST} x={ADD_GUEST_BUTTON.x} y={ADD_GUEST_BUTTON.y} />
        <Touch frame={frame} at={ADD_UP[1]} x={ADD_GUEST_AT.name.x} y={ADD_GUEST_AT.name.y} />
        <Touch frame={frame} at={TAP_SAVE} x={ADD_GUEST_AT.save.x} y={ADD_GUEST_AT.save.y} />
        <Touch frame={frame} at={TAP_OUTSIDE} x={OUTSIDE_AT.x} y={Math.min(OUTSIDE_AT.y, EMPTY_SHEET_TOP - 40)} />
        <Touch frame={frame} at={TAP_TABLE} x={table.x} y={table.y} />
        <Touch frame={frame} at={TAP_PEN} x={pen.x} y={CANVAS.top + pen.y} />
        <Hold frame={frame} grab={SCROLL[0]} release={SCROLL[1]} at={{ x: SWIPE_FROM.x, y: SWIPE_FROM.y - swipe }} />
        <Touch frame={frame} at={TAP_PICK} x={PICK_AT.x} y={PICK_AT.y} />
        <Touch frame={frame} at={TAP_GUEST} x={ROW_AT.x} y={ROW_AT.y} />
        <Touch frame={frame} at={TAP_CLOSE_PICKER} x={CLOSE_AT.x} y={CLOSE_AT.y} />
        <Touch frame={frame} at={TAP_DONE2} x={TAPS.done.x} y={TAPS.done.y} />
      </div>
    </PhoneFrame>
  );
};
