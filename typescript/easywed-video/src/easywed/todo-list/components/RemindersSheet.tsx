import React from "react";
import { interpolate } from "remotion";
import { DRAWER_HANDLE, DrawerHandle } from "../../components/HallPanel";
import { Icon } from "../../components/Icon";
import { PHONE } from "../../components/PhoneFrame";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";
import { type FilmReminder } from "../reminders";

/**
 * `MobileTabBar`'s drawer on *Przypomnienia* at easywed/v1.1.2: the four tab
 * pills with the reminders one pressed, then `RemindersPanelContent` - the
 * outline *Dodaj przypomnienie* trigger over `ReminderList`, one `bg-muted`
 * row per reminder (`ReminderPreview`: the text, the clock and its date under
 * it, red once overdue and struck through once done, the check and the bin
 * at its right end). The trigger's popover is `CreateReminderPopover`: its
 * title, the textarea, the date picker's button and the black add button, as
 * wide as the trigger. The drawer hugs its content, so a new row grows it
 * upwards. Sizes are the app's CSS pixels; the phone's page is `text-base`.
 */

/** `grid-cols-4 gap-2 px-4 pt-4 pb-4` round the `py-2` pills. */
const PILLS = 16 + 36 + 16;
/** The list's `border-t`, then `pt-4`. */
const LIST_TOP = 1 + 16;
const PAD_X = 16;
/** `pb-[max(1rem,env(safe-area-inset-bottom))]`. */
const PAD_BOTTOM = Math.max(16, PHONE.safeBottom);
const CONTENT_WIDTH = PHONE.width - PAD_X * 2;
/** The trigger: an outline `Button` at its default `h-8`, stretched by the column. Then `gap-4`. */
const TRIGGER = 32;
const GAP = 16;
/** A row: `py-2` round the `font-medium` line (16/24) and the `text-xs` date (12/16); `gap-2` between rows. */
const ROW = 8 + 24 + 16 + 8;
const ROW_GAP = 8;
/** `PopoverContent`'s default `sideOffset`. */
const POPOVER_OFFSET = 4;

/** The drawer's height for `rows` reminders. */
export const sheetHeight = (rows: number) =>
  DRAWER_HANDLE + PILLS + LIST_TOP + TRIGGER + GAP + rows * ROW + Math.max(0, rows - 1) * ROW_GAP + PAD_BOTTOM;

/** Where things sit once the drawer is up with `rows` reminders (fractional while it grows), in the phone's CSS px. */
export const sheetMarks = (rows: number) => {
  const top = PHONE.height - sheetHeight(rows);
  const trigger = top + DRAWER_HANDLE + PILLS + LIST_TOP;
  const rowTop = (i: number) => trigger + TRIGGER + GAP + i * (ROW + ROW_GAP);
  return {
    top,
    trigger: { x: PHONE.width / 2, y: trigger + TRIGGER / 2, top: trigger },
    rowTop,
    rowBottom: (i: number) => rowTop(i) + ROW,
    /** The row's check: `ml-2 gap-2` before the bin, both `h-4 w-4`, inside `px-3`. */
    check: (i: number) => ({ x: PHONE.width - PAD_X - 12 - 16 - 8 - 8, y: rowTop(i) + ROW / 2 }),
    popoverTop: trigger + TRIGGER + POPOVER_OFFSET,
  };
};

/** `PopoverContent`: `p-2.5 gap-2.5` round the title (`text-sm`), and `FieldGroup`'s `gap-4` round the textarea's `min-h-16` and two `h-8` buttons. */
const POPOVER_PAD = 10;
const TEXTAREA = 64;
const POPOVER_BUTTON = 32;
const POPOVER_HEIGHT = POPOVER_PAD * 2 + 20 + 10 + TEXTAREA + 16 + POPOVER_BUTTON + 16 + POPOVER_BUTTON;

/** The popover's add button, in the phone's CSS px, for a drawer holding `rows`. */
export const saveAt = (rows: number) => ({
  x: PHONE.width / 2,
  y: sheetMarks(rows).popoverTop + POPOVER_HEIGHT - POPOVER_PAD - POPOVER_BUTTON / 2,
});

/** The popover's bottom edge, for the camera. */
export const popoverBottom = (rows: number) => sheetMarks(rows).popoverTop + POPOVER_HEIGHT;

const PILL_TABS = [tl.app.mobileTabs.guests, tl.app.mobileTabs.tables, tl.app.mobileTabs.fixtures, tl.app.mobileTabs.reminders];
/** *Przypomnienia*, the pressed pill. */
const ACTIVE_PILL = 3;

const Row: React.FC<{ reminder: FilmReminder; done: boolean; overdue: boolean; enter: number; pressed: boolean }> = ({
  reminder,
  done,
  overdue,
  enter,
  pressed,
}) => (
  <div
    style={{
      height: ROW,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 12px",
      borderRadius: 8,
      backgroundColor: colors.muted,
      opacity: enter,
      transform: `translateY(${interpolate(enter, [0, 1], [6, 0])}px)`,
    }}
  >
    <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
      <span
        style={{
          fontSize: 16,
          lineHeight: "24px",
          fontWeight: 500,
          color: colors.ink,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          textDecoration: done ? "line-through" : undefined,
        }}
      >
        {reminder.text}
      </span>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          lineHeight: "16px",
          color: overdue ? colors.destructive : colors.inkSoft,
        }}
      >
        <Icon name="clock" color={overdue ? colors.destructive : colors.inkSoft} size={12} />
        {tl.app.reminders.due(reminder.due)}
      </span>
    </div>
    <div style={{ marginLeft: 8, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <div style={{ display: "flex", transform: pressed ? "translateY(1px)" : undefined }}>
        <Icon name="check" color={pressed ? colors.ink : colors.inkSoft} size={16} />
      </div>
      <Icon name="trash" color={colors.inkSoft} size={16} />
    </div>
  </div>
);

/** `CreateReminderPopover`, filled in: the text typed, the date and hour picked. */
const Popover: React.FC<{ reminder: FilmReminder; open: number; savePressed: boolean }> = ({ reminder, open, savePressed }) => (
  <div
    style={{
      position: "absolute",
      left: PAD_X,
      width: CONTENT_WIDTH,
      height: POPOVER_HEIGHT,
      boxSizing: "border-box",
      padding: POPOVER_PAD,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      borderRadius: 10,
      // `bg-popover`, `ring-1 ring-foreground/10`, `shadow-md`.
      backgroundColor: colors.card,
      boxShadow: "0 0 0 1px rgba(36, 31, 26, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
      opacity: open,
      // `zoom-in-95` from its top edge, the side it opens from.
      transformOrigin: "50% 0",
      transform: `scale(${interpolate(open, [0, 1], [0.95, 1])})`,
    }}
  >
    <div style={{ fontFamily: fonts.heading, fontSize: 14, lineHeight: "20px", fontWeight: 500, color: colors.ink }}>
      {tl.app.reminders.createTitle}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          height: TEXTAREA,
          boxSizing: "border-box",
          padding: "8px 10px",
          borderRadius: 10,
          border: `1px solid ${colors.border}`,
          fontSize: 16,
          lineHeight: "24px",
          color: colors.ink,
        }}
      >
        {reminder.text}
      </div>
      <div
        style={{
          height: POPOVER_BUTTON,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          borderRadius: 10,
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.secondary,
          fontSize: 14,
          color: colors.ink,
          whiteSpace: "nowrap",
        }}
      >
        {tl.app.reminders.picked(reminder.due)}
      </div>
      <div
        style={{
          height: POPOVER_BUTTON,
          borderRadius: 10,
          backgroundColor: colors.primary,
          color: colors.primaryInk,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 500,
          transform: savePressed ? "translateY(1px)" : undefined,
        }}
      >
        {tl.app.reminders.add}
      </div>
    </div>
  </div>
);

export const RemindersSheet: React.FC<{
  /** The rows on the list, in the order they were added. */
  reminders: FilmReminder[];
  /** How many rows the drawer is sized for - fractional while a new one grows it. */
  rows: number;
  done: (reminder: FilmReminder) => boolean;
  overdue: (reminder: FilmReminder) => boolean;
  /** Each row's entrance, 0..1. */
  rowIn: (reminder: FilmReminder) => number;
  /** The drawer rising, 0..1. */
  enter: number;
  /** The popover, 0..1, and the reminder filled into it. */
  popover: number;
  draft: FilmReminder;
  pressed: { check?: FilmReminder; trigger: boolean; save: boolean };
}> = ({ reminders, rows, done, overdue, rowIn, enter, popover, draft, pressed }) => {
  const height = sheetHeight(rows);
  const marks = sheetMarks(rows);
  // The sheet is drawn in the app's viewport, whose bottom is the phone's.
  const toSheet = (y: number) => y - marks.top;

  return (
    <>
      {/* `DrawerOverlay`'s `bg-black/40` over the plan. */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: colors.drawerScrim, opacity: enter }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height,
          transform: `translateY(${(1 - enter) * (height + 20)}px)`,
          boxSizing: "border-box",
          paddingTop: DRAWER_HANDLE,
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          backgroundColor: colors.bg,
          boxShadow: "0 -1px 0 0 rgba(36, 31, 26, 0.1), 0 -24px 60px rgba(60, 50, 40, 0.18)",
          fontFamily: fonts.sans,
          color: colors.ink,
        }}
      >
        <DrawerHandle />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, padding: 16 }}>
          {PILL_TABS.map((label, i) => (
            <div
              key={label}
              style={{
                height: 36,
                padding: "0 8px",
                boxSizing: "border-box",
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: i === ACTIVE_PILL ? colors.primary : colors.bgDeep,
                color: i === ACTIVE_PILL ? colors.primaryInk : colors.inkSoft,
                fontSize: 14,
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
            </div>
          ))}
        </div>
        <div
          style={{
            borderTop: `1px solid ${colors.border}`,
            padding: `16px ${PAD_X}px 0`,
            display: "flex",
            flexDirection: "column",
            gap: GAP,
          }}
        >
          <div
            style={{
              height: TRIGGER,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.secondary,
              // `aria-expanded:brightness-95` while its popover is open.
              filter: popover > 0 ? `brightness(${1 - 0.05 * popover})` : undefined,
              fontSize: 14,
              fontWeight: 500,
              transform: pressed.trigger ? "translateY(1px)" : undefined,
            }}
          >
            <Icon name="plus" color={colors.ink} size={16} />
            {tl.app.reminders.add}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: ROW_GAP }}>
            {reminders.map((reminder) => (
              <Row
                key={reminder.text}
                reminder={reminder}
                done={done(reminder)}
                overdue={overdue(reminder)}
                enter={rowIn(reminder)}
                pressed={pressed.check === reminder}
              />
            ))}
          </div>
        </div>

        {popover > 0 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: toSheet(marks.popoverTop) }}>
            <Popover reminder={draft} open={popover} savePressed={pressed.save} />
          </div>
        ) : null}
      </div>
    </>
  );
};
