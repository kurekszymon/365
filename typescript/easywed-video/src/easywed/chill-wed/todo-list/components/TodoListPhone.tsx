import React from "react";
import { Easing, interpolate } from "remotion";
import { PhoneFrame, Touch } from "../../../components/PhoneFrame";
import { PhoneShell, tabAt } from "../../../components/PhoneShell";
import { rosterFor } from "../../../data";
import { TALL_HALL } from "../../../layouts";
import { ADDED, doneAt, listedAt, openAt, overdueAt, REMINDERS } from "../reminders";
import { GROW, POPOVER_OUT, PRESS_HELD, ROW_IN, SHEET_UP, TAP_ADD, TAP_CHECK, TAP_SAVE, TAP_TAB } from "../script";
import { RemindersSheet, saveAt, sheetMarks } from "./RemindersSheet";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const HALL = TALL_HALL;
const GUESTS = rosterFor(HALL.tables);
/** *Przypomnienia* is the fourth of an editor's five tabs - the assistant comes after it. */
const REMINDERS_TAB = 3;
const DEPOSIT = REMINDERS[0];
const BEFORE = REMINDERS.length - 1;

/** The drawer's rows at `frame`: four, then five as the new one grows it. */
export const rowsAt = (frame: number) =>
  BEFORE + interpolate(frame, GROW, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

/**
 * The couple's phone at `frame` on the cut's clock: the planner signed in,
 * the room fitted to the screen. *Przypomnienia* opens its drawer on four
 * reminders, the overdue deposit red at the top; its check strikes it
 * through. With `jumped`, the popover is already open and filled in - the
 * add scene's side of the jump cut - and its button adds the fifth row.
 * Drawn at the phone's own size; the stage places and scales it.
 */
export const TodoListPhone: React.FC<{ frame: number; jumped: boolean }> = ({ frame, jumped }) => {
  const rise = interpolate(frame, SHEET_UP, [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const popover = jumped ? 1 - interpolate(frame, POPOVER_OUT, [0, 1], clamp) : 0;
  const held = (at: number) => frame >= at && frame < at + PRESS_HELD;
  const rows = rowsAt(frame);

  // `useTabBadgeCounts`: unseated guests, tables, fixtures - the dance floor
  // is one - open reminders; the assistant carries none.
  const badges = [GUESTS.filter((guest) => !guest.table).length, HALL.tables.length, HALL.fixtures.length + 1, openAt(frame), 0];

  const tab = tabAt(REMINDERS_TAB, "owner");
  const check = sheetMarks(BEFORE).check(0);
  const trigger = sheetMarks(BEFORE).trigger;
  const save = saveAt(BEFORE);

  return (
    <PhoneFrame>
      <PhoneShell hall={HALL} guests={GUESTS} badges={badges} sheet={0} mode="owner">
        {rise > 0 ? (
          <RemindersSheet
            reminders={listedAt(frame)}
            rows={rows}
            done={(reminder) => doneAt(reminder, frame)}
            overdue={(reminder) => overdueAt(reminder, frame)}
            rowIn={(reminder) =>
              reminder.addedAt === undefined ? 1 : interpolate(frame, ROW_IN, [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
            }
            enter={rise}
            popover={popover}
            draft={ADDED}
            pressed={{
              check: held(TAP_CHECK) ? DEPOSIT : undefined,
              trigger: held(TAP_ADD),
              save: jumped && held(TAP_SAVE),
            }}
          />
        ) : null}
      </PhoneShell>

      {/* The thumb, in the same CSS px as the screen it touches. */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Touch frame={frame} at={TAP_TAB} x={tab.x} y={tab.y} />
        <Touch frame={frame} at={TAP_CHECK} x={check.x} y={check.y} />
        <Touch frame={frame} at={TAP_ADD} x={trigger.x} y={trigger.y} />
        {jumped ? <Touch frame={frame} at={TAP_SAVE} x={save.x} y={save.y} /> : null}
      </div>
    </PhoneFrame>
  );
};
