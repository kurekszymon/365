import { tl } from "../../i18n";
import { TAP_CHECK, TAP_SAVE } from "./script";

/**
 * The couple's list, as the reminders store holds it (`Reminder`): text, a due
 * date and a status, in the order they were added - `ReminderList` does not
 * sort. The dates fall after the day the couple opens it, bar the deposit's.
 */
export type FilmReminder = { text: string; due: Date; completedAt?: number; addedAt?: number };

/**
 * The evening the couple opens the list. `ReminderPreview` reads a row as
 * overdue from `isPast(due)` on the device's clock, so red is computed from
 * this, never set by hand.
 */
export const SEEN_ON = new Date(2026, 9, 1, 20, 0);

export const REMINDERS: FilmReminder[] = [
  { text: tl.todoList.items.deposit, due: new Date(2026, 8, 20, 18, 0), completedAt: TAP_CHECK },
  { text: tl.todoList.items.plan, due: new Date(2026, 9, 30, 12, 0) },
  { text: tl.todoList.items.fitting, due: new Date(2026, 10, 7, 17, 30) },
  { text: tl.todoList.items.rings, due: new Date(2026, 10, 21, 11, 0) },
  { text: tl.todoList.items.kidsMenu, due: new Date(2026, 9, 15, 12, 0), addedAt: TAP_SAVE },
];

/** The one typed into the popover. */
export const ADDED = REMINDERS[REMINDERS.length - 1];

/** `completeReminder` sets the status; the row stays, struck through. */
export const doneAt = (reminder: FilmReminder, frame: number) =>
  reminder.completedAt !== undefined && frame >= reminder.completedAt;

/** `isOverdue`: a due date, still open, in the past. */
export const overdueAt = (reminder: FilmReminder, frame: number) =>
  !doneAt(reminder, frame) && reminder.due.getTime() < SEEN_ON.getTime();

/** The rows on the list at `frame`. */
export const listedAt = (frame: number) =>
  REMINDERS.filter((reminder) => reminder.addedAt === undefined || frame >= reminder.addedAt);

/** `useTabBadgeCounts`: the reminders tab counts the open ones. */
export const openAt = (frame: number) => listedAt(frame).filter((reminder) => !doneAt(reminder, frame)).length;
