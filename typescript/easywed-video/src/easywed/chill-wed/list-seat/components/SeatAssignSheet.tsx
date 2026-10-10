import React from "react";
import { interpolate } from "remotion";
import { DRAWER_HANDLE, DrawerHandle } from "../../../components/HallPanel";
import { Icon } from "../../../components/Icon";
import { PHONE } from "../../../components/PhoneFrame";
import { tl } from "../../../i18n";
import { colors, fonts } from "../../../theme";

/**
 * `planner/Guests/SeatAssignSheet.tsx` at easywed/v1, as a phone shows it -
 * `ResponsiveDialog` is a bottom-sheet drawer below `md`. Opened from a guest
 * row, it runs in two steps inside one sheet:
 *
 * - the table list: *Posadź: {name}* over one outline button per table, its
 *   `count/capacity` on the right, **disabled** once the table is full
 *   (`count >= table.capacity`);
 * - the chosen table's seats: its name with a back arrow, a `grid-cols-4` of
 *   cards - a taken chair is muted initials over the occupant's name, a free
 *   one a dashed number over *Wolne miejsce*, the picked one
 *   `border-primary bg-primary/10` - and the footer button, *Wybierz miejsce*
 *   until a chair is picked, then *Posadź na miejscu {n}*.
 *
 * The drawer's header carries its close button on the right
 * (`ResponsiveDialogHeader`). Sizes are the app's CSS pixels.
 */

/** `DrawerHeader`'s `p-4` round the `text-lg` title's 28px line. */
const HEADER = 16 + 28 + 16;
/** `ResponsiveDialogBody`: `px-4`, `pb-[max(1rem,env(safe-area-inset-bottom))]`. */
const BODY_PAD_X = 16;
const BODY_PAD_BOTTOM = Math.max(16, PHONE.safeBottom);
/** A default-size `Button`: `h-8`, `rounded-lg`; the table list's `gap-2`. */
const BUTTON = 32;
const ROW_GAP = 8;
/** A seat card: `py-2` and its border round the `size-8` circle, `gap-1` and the 10px name. */
const CARD = 1 + 8 + 32 + 4 + 15 + 8 + 1;
const COLUMNS = 4;
/** `DrawerFooter`: its `border-t`, `p-4` over the button, and the safe-area bottom. */
const FOOTER = 1 + 16 + BUTTON + Math.max(16, PHONE.safeBottom);

export type SheetTable = { label: string; count: number; capacity: number };

const tableListHeight = (tables: number) => tables * BUTTON + (tables - 1) * ROW_GAP;
const gridHeight = (seats: number) => {
  const rows = Math.ceil(seats / COLUMNS);
  return rows * CARD + (rows - 1) * ROW_GAP;
};

/** The sheet hugs its content: the table list's height, then the seat grid's with its footer. */
export const sheetHeights = (tables: number, seats: number) => ({
  tables: DRAWER_HANDLE + HEADER + tableListHeight(tables) + BODY_PAD_BOTTOM,
  seats: DRAWER_HANDLE + HEADER + gridHeight(seats) + BODY_PAD_BOTTOM + FOOTER,
});

/** Table row `index`'s centre once the table list is up, in the phone's CSS px. */
export const tableRowAt = (tables: number, seats: number, index: number) => ({
  x: PHONE.width / 2,
  y: PHONE.height - sheetHeights(tables, seats).tables + DRAWER_HANDLE + HEADER + index * (BUTTON + ROW_GAP) + BUTTON / 2,
});

const cardWidth = (PHONE.width - BODY_PAD_X * 2 - (COLUMNS - 1) * ROW_GAP) / COLUMNS;

/** Seat card `index`'s centre once the grid is up, in the phone's CSS px. */
export const seatCardAt = (tables: number, seats: number, index: number) => ({
  x: BODY_PAD_X + (index % COLUMNS) * (cardWidth + ROW_GAP) + cardWidth / 2,
  y:
    PHONE.height -
    sheetHeights(tables, seats).seats +
    DRAWER_HANDLE +
    HEADER +
    Math.floor(index / COLUMNS) * (CARD + ROW_GAP) +
    CARD / 2,
});

/** The footer button's centre once the grid is up, in the phone's CSS px. */
export const confirmAt = () => ({ x: PHONE.width / 2, y: PHONE.height - Math.max(16, PHONE.safeBottom) - BUTTON / 2 });

/** `getInitials` in `Canvas/utils`: the first letters of the first two words, uppercased. */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

/** `bg-muted/40` behind a taken chair, and `bg-primary/10` behind the picked one. */
const MUTED_WASH = "rgba(234, 229, 217, 0.4)";
const PRIMARY_WASH = "rgba(43, 38, 33, 0.1)";

const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      flex: 1,
      minWidth: 0,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: "28px",
      fontWeight: 500,
      color: colors.ink,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }}
  >
    {children}
  </div>
);

export const SeatAssignSheet: React.FC<{
  guestName: string;
  tables: SheetTable[];
  /** Which table is picked, as an index into `tables`. */
  table: number;
  /** The picked table's chairs in order, each with its occupant's name or `null`. */
  seats: (string | null)[];
  /** The sheet rising, 0..1, and falling again once he is seated. */
  enter: number;
  /** The table list giving way to the seat grid, 0..1. */
  step: number;
  /** The chair picked in the grid, as an index into `seats`, or `null` before one is. */
  selected: number | null;
  /** The picked table's row reading as held, as it is tapped. */
  tablePressed: boolean;
  /** The footer button reading as held. */
  confirmPressed: boolean;
}> = ({ guestName, tables, table, seats, enter, step, selected, tablePressed, confirmPressed }) => {
  if (enter <= 0) return null;

  const heights = sheetHeights(tables.length, seats.length);
  const height = interpolate(step, [0, 1], [heights.tables, heights.seats]);
  // The app swaps the two steps in one render, so the content does too, halfway
  // through; only the sheet's height eases from one to the other.
  const listShown = step < 0.5 ? 1 : 0;
  const gridShown = 1 - listShown;

  return (
    <>
      {/* A second `DrawerOverlay`, over the guest list's sheet. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: colors.drawerScrim,
          opacity: Math.min(1, enter),
        }}
      />
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
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          backgroundColor: colors.bg,
          boxShadow: "0 -1px 0 0 rgba(36, 31, 26, 0.1), 0 -24px 60px rgba(60, 50, 40, 0.18)",
          overflow: "hidden",
          fontFamily: fonts.sans,
          color: colors.ink,
        }}
      >
        <DrawerHandle />

        <div style={{ position: "relative", height: HEADER, padding: 16, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 8 }}>
          {/* The back button only exists once a table is picked; the title follows it. */}
          <div style={{ position: "absolute", left: 16, right: 44, top: 16, display: "flex", alignItems: "center", opacity: listShown }}>
            <Title>{tl.app.seatAssign.title(guestName)}</Title>
          </div>
          <div style={{ position: "absolute", left: 16, right: 44, top: 16, display: "flex", alignItems: "center", gap: 8, opacity: gridShown }}>
            <div style={{ width: 28, height: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="arrowLeft" color={colors.ink} size={16} />
            </div>
            <Title>{tables[table].label}</Title>
          </div>
          <div style={{ position: "absolute", right: 16, top: 20 }}>
            <Icon name="x" color={colors.inkSoft} size={20} />
          </div>
        </div>

        <div style={{ position: "relative", padding: `0 ${BODY_PAD_X}px` }}>
          {listShown > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: ROW_GAP, opacity: listShown }}>
              {tables.map((row, i) => {
                const full = row.count >= row.capacity;
                const held = i === table && tablePressed;
                return (
                  <div
                    key={row.label}
                    style={{
                      height: BUTTON,
                      boxSizing: "border-box",
                      padding: "0 10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                      borderRadius: 8,
                      border: `1px solid ${colors.border}`,
                      backgroundColor: held ? colors.bgDeep : colors.secondary,
                      opacity: full ? 0.5 : 1,
                      transform: held ? "translateY(1px)" : undefined,
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.label}</span>
                    <span style={{ fontSize: 12, color: colors.inkSoft, fontVariantNumeric: "tabular-nums" }}>
                      {row.count}/{row.capacity}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}

          {gridShown > 0 ? (
            <div
              style={{
                position: "absolute",
                left: BODY_PAD_X,
                right: BODY_PAD_X,
                top: 0,
                display: "grid",
                gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))`,
                gap: ROW_GAP,
                opacity: gridShown,
              }}
            >
              {seats.map((occupant, i) => {
                const picked = selected === i;
                return (
                  <div
                    key={i}
                    style={{
                      height: CARD,
                      boxSizing: "border-box",
                      padding: "8px 4px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      borderRadius: 8,
                      border: `1px ${occupant || picked ? "solid" : "dashed"} ${picked ? colors.primary : colors.border}`,
                      backgroundColor: occupant ? MUTED_WASH : picked ? PRIMARY_WASH : "transparent",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        boxSizing: "border-box",
                        borderRadius: 999,
                        border: occupant ? undefined : `1px dashed ${colors.border}`,
                        backgroundColor: occupant ? colors.bgDeep : undefined,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: occupant ? 700 : 400,
                        color: colors.inkSoft,
                      }}
                    >
                      {occupant ? initials(occupant) : i + 1}
                    </div>
                    <div
                      style={{
                        width: "100%",
                        fontSize: 10,
                        lineHeight: "15px",
                        color: colors.inkSoft,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {occupant ?? tl.app.seatAssign.empty}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {gridShown > 0 ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: FOOTER,
              boxSizing: "border-box",
              padding: 16,
              paddingBottom: Math.max(16, PHONE.safeBottom),
              borderTop: `1px solid ${colors.border}`,
              opacity: gridShown,
            }}
          >
            {/* Disabled - `opacity-50` - until a chair is picked. */}
            <div
              style={{
                height: BUTTON,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.primary,
                color: colors.primaryInk,
                fontSize: 14,
                fontWeight: 500,
                opacity: selected === null ? 0.5 : confirmPressed ? 0.85 : 1,
                transform: confirmPressed ? "translateY(1px)" : undefined,
              }}
            >
              {selected === null ? tl.app.seatAssign.pickSeat : tl.app.seatAssign.assignAt(selected + 1)}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
};
