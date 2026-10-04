import React from "react";
import { Easing, interpolate } from "remotion";
import { NAV_ITEMS } from "../../components/Icon";
import { PhoneFrame, Touch } from "../../components/PhoneFrame";
import { guestRowAt, PhoneShell, scrollToEnd } from "../../components/PhoneShell";
import { tl } from "../../i18n";
import type { HallLayout } from "../../layouts";
import { FAMILY_TABLE, familySeats, FREE_SEAT, guestListFor, LATE_GUEST } from "../guests";
import {
  PRESS_HELD,
  SHEET_DOWN,
  SHEET_UP,
  STEP_TO_SEATS,
  TAP_CONFIRM,
  TAP_ROW,
  TAP_SEAT,
  TAP_TABLE,
} from "../script";
import { confirmAt, SeatAssignSheet, seatCardAt, tableRowAt, type SheetTable } from "./SeatAssignSheet";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** What the phone's layout needs to know, worked out once per hall rather than per frame. */
export const phonePlan = (hall: HallLayout) => {
  const before = guestListFor(hall, false);
  const after = guestListFor(hall, true);
  const late = before.findIndex((guest) => guest.name === LATE_GUEST);
  const scroll = scrollToEnd(before, "guest");
  const seats = familySeats(hall);
  const family = hall.tables.findIndex((table) => table.label === tl.hall.table(FAMILY_TABLE));
  // `guestCountByTable`, which leaves out the guest being seated - he has no table yet anyway.
  const tables: SheetTable[] = hall.tables.map((table) => ({
    label: table.label,
    count: before.filter((guest) => guest.table === table.label).length,
    capacity: table.seats,
  }));
  return {
    before,
    after,
    scroll,
    seats,
    tables,
    family,
    row: guestRowAt(before, late, scroll, "guest"),
    tableRow: tableRowAt(tables.length, seats.length, family),
    seatCard: seatCardAt(tables.length, seats.length, FREE_SEAT - 1),
    confirm: confirmAt(),
  };
};

/**
 * The couple's phone at `frame` on the cut's clock: the planner in guest mode
 * with the guest list open and scrolled to its end, where Tomek was just
 * written in. His seat button opens the sheet; Stół 5, the one table with a
 * chair left, opens its seats; the free one is picked and confirmed, and the
 * sheet drops onto his row, now at Stół 5. Drawn at the phone's own size -
 * the scene places and scales it.
 */
export const ListSeatPhone: React.FC<{ frame: number; hall: HallLayout }> = ({ frame, hall }) => {
  const plan = phonePlan(hall);
  const seatedNow = frame >= SHEET_DOWN[0];
  const guests = seatedNow ? plan.after : plan.before;

  const rise = interpolate(frame, SHEET_UP, [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const drop = interpolate(frame, SHEET_DOWN, [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const step = interpolate(frame, STEP_TO_SEATS, [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });

  // `useTabBadgeCounts`: unseated guests, tables, fixtures - the dance floor is
  // one - and open reminders, the films' one; the assistant carries none.
  const reminders = NAV_ITEMS.find((item) => item.kind === "reminders")?.badge ?? 0;
  const badges = [guests.filter((guest) => !guest.table).length, hall.tables.length, hall.fixtures.length + 1, reminders, 0];

  const held = (at: number) => frame >= at && frame < at + PRESS_HELD;

  return (
    <PhoneFrame>
      <PhoneShell hall={hall} guests={guests} badges={badges} sheet={1} mode="guest" scroll={plan.scroll}>
        <SeatAssignSheet
          guestName={LATE_GUEST}
          tables={plan.tables}
          table={plan.family}
          seats={plan.seats}
          enter={rise * (1 - drop)}
          step={step}
          selected={frame >= TAP_SEAT ? FREE_SEAT - 1 : null}
          tablePressed={held(TAP_TABLE)}
          confirmPressed={held(TAP_CONFIRM)}
        />
      </PhoneShell>

      {/* The thumb, in the same CSS px as the screen it touches. */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Touch frame={frame} at={TAP_ROW} x={plan.row.seatButtonX} y={plan.row.y} />
        <Touch frame={frame} at={TAP_TABLE} x={plan.tableRow.x} y={plan.tableRow.y} />
        <Touch frame={frame} at={TAP_SEAT} x={plan.seatCard.x} y={plan.seatCard.y} />
        <Touch frame={frame} at={TAP_CONFIRM} x={plan.confirm.x} y={plan.confirm.y} />
      </div>
    </PhoneFrame>
  );
};
