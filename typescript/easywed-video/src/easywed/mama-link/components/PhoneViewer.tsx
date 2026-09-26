import React from "react";
import { BrandMark } from "../../components/BrandMark";
import { GuestList, matchingGuests, READ_ONLY_LIST_TOP, rowBottom } from "../../components/GuestList";
import { DRAWER_HANDLE, DrawerHandle } from "../../components/HallPanel";
import { HallCanvas, hallAspect } from "../../components/HallCanvas";
import { Icon, type IconName } from "../../components/Icon";
import { WEDDING, type RosterGuest } from "../../data";
import { tl } from "../../i18n";
import type { HallLayout } from "../../layouts";
import { colors, fonts } from "../../theme";
import { PHONE } from "./PhoneFrame";
import { BrowserBar, PAGE_TOP } from "./WebScreens";

/**
 * The planner on mum's phone, as a viewer gets it at easywed/v1 - the website
 * under her browser's address bar, laid out in the phone's CSS pixels:
 *
 * - `Header`: the mark (the wordmark drops below `sm`), the wedding name, the
 *   member stack - the owner, the couple's unnamed partner and mum, with no
 *   dashed invite circle, which is the owner's (`MemberAvatars`) - then
 *   *Skonfiguruj salę* as an icon, export (import is `canEdit`-only) and the menu.
 * - `Canvas` on a phone: the seated room with `MobileZoomControl` over it, and
 *   no `AddFab` (`canEdit && <AddFab />`). No read-only badge: v1 says so only
 *   in the wedding name's hover title, which a phone never shows.
 * - `MobileTabBar`: four tabs, not five - the assistant is `canEdit`-only.
 * - The tab's sheet: the four tab pills, then `GuestListContent` read-only.
 */

const HEADER = 48;
/** `MobileTabBar`: `py-3` round the 36px icon, `gap-1`, the 11px label, then `pb-[env(safe-area-inset-bottom)]`. */
const TAB_BAR = 12 + 36 + 4 + 15 + 12 + PHONE.safeBottom;
/** The app's viewport, under the browser's own bar. */
const VIEWPORT = PHONE.height - PAGE_TOP;
/** `max-h-[88dvh]` on the sheet. */
const SHEET_MAX = VIEWPORT * 0.88;
/** The sheet's tab pills: `pt-4 pb-4` round a `py-2` pill, then the list's `border-t` and `pt-4`. */
const PILLS = 16 + 36 + 16 + 1 + 16;
/** `SeatingProgress`: `p-3.5` round the 13px line, `mb-2.5` and the `h-2` bar, with its border; then `gap-3`. */
const PROGRESS = 14 + 18 + 10 + 8 + 14 + 2 + 12;
const SHEET_PAD_X = 16;
/** `pb-[max(1rem,env(safe-area-inset-bottom))]`. */
const SHEET_PAD_BOTTOM = Math.max(16, PHONE.safeBottom);

/** The header's outline buttons: `h-8`, an icon between `px-2.5`. */
const HeaderButton: React.FC<{ icon: IconName }> = ({ icon }) => (
  <div
    style={{
      width: 36,
      height: 32,
      boxSizing: "border-box",
      borderRadius: 8,
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.card,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Icon name={icon} color={colors.ink} size={16} />
  </div>
);

/** One circle of `MemberAvatars`: initials for a named member, the person glyph for one without a name. */
const Avatar: React.FC<{ initials?: string }> = ({ initials }) => (
  <div
    style={{
      width: 28,
      height: 28,
      marginLeft: -8,
      borderRadius: 999,
      boxShadow: `0 0 0 2px ${colors.bg}`,
      backgroundColor: initials ? "#4f46e5" : colors.bgDeep,
      color: "#ffffff",
      fontSize: 11,
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {initials ?? <Icon name="user" color={colors.inkSoft} size={14} />}
  </div>
);

const TABS: { kind: IconName; label: string }[] = [
  { kind: "guests", label: tl.app.mobileTabs.guests },
  { kind: "tables", label: tl.app.mobileTabs.tables },
  { kind: "fixtures", label: tl.app.mobileTabs.fixtures },
  { kind: "reminders", label: tl.app.mobileTabs.reminders },
];

/** Where each tab's icon sits, in the phone's CSS px - for mum's thumb. */
export const tabAt = (index: number) => ({
  x: (PHONE.width / TABS.length) * (index + 0.5),
  y: PHONE.height - TAB_BAR + 12 + 18,
});

/** The sheet's height for the rows a search leaves: it hugs its content up to `max-h-[88dvh]`. */
const sheetHeight = (rows: RosterGuest[]) =>
  Math.min(
    SHEET_MAX,
    DRAWER_HANDLE + PILLS + PROGRESS + READ_ONLY_LIST_TOP + (rows.length ? rowBottom(rows, rows.length - 1) : 0) + SHEET_PAD_BOTTOM,
  );

/** Where the search field's centre sits once the sheet is up, in the phone's CSS px - for the thumb. */
export const searchAt = (guests: RosterGuest[], query: string) => {
  const top = PHONE.height - sheetHeight(matchingGuests(guests, query));
  return { x: PHONE.width / 2, y: top + DRAWER_HANDLE + PILLS + PROGRESS + 18 };
};

export const PhoneViewer: React.FC<{
  hall: HallLayout;
  guests: RosterGuest[];
  /** Per-table badge counts, as `useTabBadgeCounts` reads them: unseated guests, tables, fixtures, open reminders. */
  badges: number[];
  /** The guests sheet, 0..1: it slides up from the bottom edge. */
  sheet: number;
  query: string;
}> = ({ hall, guests, badges, sheet, query }) => {
  const seated = guests.filter((guest) => guest.table).length;
  const height = sheetHeight(matchingGuests(guests, query));
  const listHeight = height - DRAWER_HANDLE - PILLS - PROGRESS - READ_ONLY_LIST_TOP - SHEET_PAD_BOTTOM;

  // The room fitted into what the header and the tab bar leave of the screen.
  const room = { width: PHONE.width - 16, height: VIEWPORT - HEADER - TAB_BAR - 24 };
  const aspect = hallAspect(hall);
  const drawWidth = Math.min(room.width, room.height * aspect);

  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: colors.bg, fontFamily: fonts.sans, color: colors.ink }}>
      <BrowserBar />

      <div style={{ position: "absolute", left: 0, right: 0, top: PAGE_TOP, height: VIEWPORT }}>
        <div
          style={{
            height: HEADER,
            boxSizing: "border-box",
            padding: "0 12px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: colors.bg,
          }}
        >
          <BrandMark size={24} seatProgress={1} fillProgress={1} />
          <div style={{ width: 1, height: 20, backgroundColor: colors.border, flexShrink: 0 }} />
          <Icon name="arrowLeft" color={colors.inkSoft} size={16} />
          <div
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: fonts.heading,
              fontSize: 16,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {WEDDING.couple}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ display: "flex", paddingLeft: 8 }}>
              <Avatar initials="AK" />
              <Avatar />
              <Avatar />
            </div>
            <HeaderButton icon="landmark" />
            <HeaderButton icon="download" />
            <HeaderButton icon="menu" />
          </div>
        </div>

        {/* The canvas, washed as `Canvas.tsx` washes it, the room fitted inside. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: HEADER,
            bottom: 0,
            backgroundImage: `linear-gradient(135deg, rgba(239, 233, 221, 0.6) 0%, ${colors.bg} 46%, rgba(246, 232, 242, 0.5) 100%)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: (PHONE.width - drawWidth) / 2,
              top: 12,
              width: drawWidth,
              height: drawWidth / aspect,
              display: "flex",
            }}
          >
            <HallCanvas
              hall={hall}
              outline={1}
              floor={1}
              tableIn={hall.tables.map(() => 1)}
              seatFill={hall.tables.map(() => 1)}
            />
          </div>

          {/* `MobileZoomControl`: `left-4`, 5.5rem above the bottom safe area. */}
          <div
            style={{
              position: "absolute",
              left: 16,
              bottom: 88 + PHONE.safeBottom,
              width: 36,
              borderRadius: 999,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.card,
              boxShadow: "0 8px 20px -12px rgba(40, 60, 45, 0.4)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {(["plus", "minus"] as const).map((icon) => (
              <div key={icon} style={{ height: 36, display: "flex", alignItems: "center" }}>
                <Icon name={icon} color={colors.ink} size={16} />
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: TAB_BAR,
            display: "grid",
            gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))`,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTop: `1px solid ${colors.border}`,
            backgroundColor: colors.bg,
            boxShadow: "0 -14px 30px -22px rgba(40, 60, 45, 0.4)",
          }}
        >
          {TABS.map((tab, i) => (
            <div key={tab.kind} style={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingTop: 12 }}>
              {/* `TabBadgeIcon`: `bg-primary/10` round the icon, the count in the accent badge. */}
              <div
                style={{
                  position: "relative",
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  backgroundColor: "rgba(43, 38, 33, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={tab.kind} color={colors.primary} size={19} />
                {badges[i] > 0 ? (
                  <div
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -6,
                      minWidth: 16,
                      height: 16,
                      padding: "0 4px",
                      boxSizing: "border-box",
                      borderRadius: 999,
                      backgroundColor: colors.accentSoft,
                      color: colors.accent,
                      fontSize: 10,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {badges[i]}
                  </div>
                ) : null}
              </div>
              <div
                style={{
                  width: "100%",
                  textAlign: "center",
                  padding: "0 2px",
                  boxSizing: "border-box",
                  fontSize: 11,
                  fontWeight: 600,
                  color: colors.inkSoft,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {tab.label}
              </div>
            </div>
          ))}
        </div>

        {sheet > 0 ? (
          <>
            {/* `DrawerOverlay`: the scrim and a light blur over the plan. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: colors.scrim,
                backdropFilter: "blur(4px)",
                opacity: Math.min(1, sheet),
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height,
                transform: `translateY(${(1 - sheet) * (height + 20)}px)`,
                boxSizing: "border-box",
                paddingTop: DRAWER_HANDLE,
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                backgroundColor: colors.bg,
                boxShadow: "0 -1px 0 0 rgba(36, 31, 26, 0.1), 0 -24px 60px rgba(60, 50, 40, 0.18)",
                overflow: "hidden",
              }}
            >
              <DrawerHandle />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, padding: 16 }}>
                {TABS.map((tab, i) => (
                  <div
                    key={tab.kind}
                    style={{
                      height: 36,
                      padding: "0 8px",
                      boxSizing: "border-box",
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: i === 0 ? colors.primary : colors.bgDeep,
                      color: i === 0 ? colors.primaryInk : colors.inkSoft,
                      fontSize: 14,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{tab.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: `1px solid ${colors.border}`, padding: `16px ${SHEET_PAD_X}px 0` }}>
                {/* `SeatingProgress`, which leads the sticky block. */}
                <div
                  style={{
                    boxSizing: "border-box",
                    padding: 14,
                    borderRadius: 16,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.card,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      fontSize: 13,
                      lineHeight: "18px",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{tl.guests.progress}</span>
                    <span style={{ color: colors.inkSoft }}>{tl.guests.seatedRatio(seated, guests.length)}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, backgroundColor: colors.bgDeep, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.round((seated / guests.length) * 100)}%`,
                        height: "100%",
                        borderRadius: 999,
                        backgroundColor: colors.primary,
                      }}
                    />
                  </div>
                </div>
                <GuestList
                  guests={guests}
                  width={PHONE.width - SHEET_PAD_X * 2}
                  tagged={guests.map(() => 1)}
                  scroll={0}
                  listHeight={listHeight}
                  query={query}
                  readOnly
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
