import React from "react";
import { BrandMark } from "./BrandMark";
import { GuestList, LIST_TOP, matchingGuests, READ_ONLY_LIST_TOP, rowBottom, rowTop, ROW_HEIGHT } from "./GuestList";
import { DRAWER_HANDLE, DrawerHandle } from "./HallPanel";
import { HallCanvas, hallAspect } from "./HallCanvas";
import { Icon, type IconName } from "./Icon";
import { BrowserBar, PAGE_TOP, PHONE } from "./PhoneFrame";
import { WEDDING, type RosterGuest } from "../data";
import { tl } from "../i18n";
import type { HallLayout } from "../layouts";
import { colors, fonts } from "../theme";

/**
 * The planner on a phone at easywed/v1 - the website under the browser's
 * address bar, laid out in the phone's CSS pixels. Two people hold it:
 *
 * - **`viewer`** - mum in the mama-link cut, signed in with a viewer's role:
 *   the member stack is the owner, the couple's unnamed partner and mum, with
 *   no dashed invite circle, which is the owner's (`MemberAvatars`); no import
 *   in the header, no `AddFab` (`canEdit && <AddFab />`), four tabs (the
 *   assistant is `canEdit`-only), and the list without its buttons. No
 *   read-only badge: v1 says so only in the wedding name's hover title, which
 *   a phone never shows.
 * - **`guest`** - the couple planning signed out, the owner of a wedding kept
 *   in this browser: `GuestModeBanner` over the header; the member stack
 *   collapsed to the owner's invite chip, since a local wedding has no members;
 *   import and export as one button group; `AddFab` on the canvas; a fifth
 *   tab for the assistant; and the list with its add and import buttons and
 *   each row's seat, edit and delete buttons.
 * - **`owner`** - the couple planning signed in, their own wedding: all of
 *   `guest`'s editing, without `GuestModeBanner`, and the member stack is the
 *   owner's own avatar ahead of the invite chip (`MemberAvatars` always shows
 *   an owner the stack, even alone in the wedding).
 *
 * Both get the same `Header` (the mark - the wordmark drops below `sm` - the
 * wedding name, *Skonfiguruj salę* as an icon, export and the menu), the room
 * with `MobileZoomControl` over it, `MobileTabBar`, and its sheet: the four
 * tab pills, then `GuestListContent`.
 */
export type PhoneMode = "viewer" | "guest" | "owner";

/** Whether the phone holder can edit - `selectCanEdit`: the owner, signed in or not. */
const canEditIn = (mode: PhoneMode) => mode !== "viewer";
/** `GuestModeBanner` is for a wedding kept only in this browser. */
const bannerIn = (mode: PhoneMode) => mode === "guest";

const HEADER = 48;
/**
 * `GuestModeBanner`: `py-2` round the `text-xs` line, which a phone's width
 * wraps to four lines, and its `border-b`.
 */
const GUEST_BANNER = 8 + 4 * 16 + 8 + 1;
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
/** Where `GuestList` puts its first row: under the add and import buttons, which a viewer doesn't get. */
const listTopFor = (mode: PhoneMode) => (canEditIn(mode) ? LIST_TOP : READ_ONLY_LIST_TOP);

/** The header's outline buttons: `h-8`, an icon between `px-2.5`. `ButtonGroup` joins two at a shared edge. */
const HeaderButton: React.FC<{ icon: IconName; group?: "first" | "last" }> = ({ icon, group }) => (
  <div
    style={{
      width: 36,
      height: 32,
      boxSizing: "border-box",
      borderRadius: group === "first" ? "8px 0 0 8px" : group === "last" ? "0 8px 8px 0" : 8,
      border: `1px solid ${colors.border}`,
      borderLeftWidth: group === "last" ? 0 : 1,
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

/** The owner's dashed invite chip (`members.invite`) - all that is left of the stack in guest mode, and the end of it signed in. */
const InviteChip: React.FC = () => (
  <div
    style={{
      width: 28,
      height: 28,
      boxSizing: "border-box",
      borderRadius: 999,
      border: `1px dashed ${colors.inkSoft}80`,
      backgroundColor: colors.bg,
      boxShadow: `0 0 0 2px ${colors.bg}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Icon name="userPlus" color={colors.inkSoft} size={14} />
  </div>
);

/**
 * `GuestModeBanner`: the standing notice that the plan lives only in this
 * browser, in the planner's selection tones (`bg-planner-soft`,
 * `text-planner-selected`, `border-planner-table-border`).
 */
const GuestBanner: React.FC = () => (
  <div
    style={{
      height: GUEST_BANNER,
      boxSizing: "border-box",
      padding: "8px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      borderBottom: `1px solid ${colors.tableBorder}`,
      backgroundColor: colors.selectedSoft,
      color: colors.selected,
      fontSize: 12,
      lineHeight: "16px",
      textAlign: "center",
    }}
  >
    <Icon name="info" color={colors.selected} size={14} />
    <span>{tl.app.guestBanner}</span>
    <span style={{ flexShrink: 0, fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 2 }}>
      {tl.app.auth.signIn}
    </span>
  </div>
);

type Tab = { kind: IconName; label: string };

const TABS: Tab[] = [
  { kind: "guests", label: tl.app.mobileTabs.guests },
  { kind: "tables", label: tl.app.mobileTabs.tables },
  { kind: "fixtures", label: tl.app.mobileTabs.fixtures },
  { kind: "reminders", label: tl.app.mobileTabs.reminders },
];

/** The bar's tabs: an editor gets the assistant as a fifth (`grid-cols-5`); the sheet's pills stay four. */
const barTabs = (mode: PhoneMode): Tab[] =>
  canEditIn(mode) ? [...TABS, { kind: "assistant", label: tl.app.mobileTabs.assistant }] : TABS;

/**
 * The canvas's own box, in the phone's CSS px: from under the header down to
 * the tab bar's top edge, which covers the rest of it. For a film that draws
 * its own view of the room into `canvas`.
 */
export const canvasBox = (mode: PhoneMode, banner: boolean = bannerIn(mode)) => {
  const top = PAGE_TOP + (banner ? GUEST_BANNER + HEADER : HEADER);
  return { top, height: PHONE.height - TAB_BAR - top };
};

/** Where each tab's icon sits, in the phone's CSS px - for a thumb. */
export const tabAt = (index: number, mode: PhoneMode = "viewer") => ({
  x: (PHONE.width / barTabs(mode).length) * (index + 0.5),
  y: PHONE.height - TAB_BAR + 12 + 18,
});

/** The sheet's height for the rows a search leaves: it hugs its content up to `max-h-[88dvh]`. */
const sheetHeight = (rows: RosterGuest[], mode: PhoneMode = "viewer") =>
  Math.min(
    SHEET_MAX,
    DRAWER_HANDLE + PILLS + PROGRESS + listTopFor(mode) + (rows.length ? rowBottom(rows, rows.length - 1) : 0) + SHEET_PAD_BOTTOM,
  );

/** The height of the list's own viewport, under the sheet's sticky block. */
const listHeightFor = (rows: RosterGuest[], mode: PhoneMode) =>
  sheetHeight(rows, mode) - DRAWER_HANDLE - PILLS - PROGRESS - listTopFor(mode) - SHEET_PAD_BOTTOM;

/** Where the search field's centre sits once the sheet is up, in the phone's CSS px - for the thumb. */
export const searchAt = (guests: RosterGuest[], query: string) => {
  const top = PHONE.height - sheetHeight(matchingGuests(guests, query));
  return { x: PHONE.width / 2, y: top + DRAWER_HANDLE + PILLS + PROGRESS + 18 };
};

/** How far the list scrolls to bring its last row to the bottom of the sheet. */
export const scrollToEnd = (guests: RosterGuest[], mode: PhoneMode) =>
  Math.max(0, rowBottom(guests, guests.length - 1) - listHeightFor(guests, mode));

/** Where the sheet's top edge sits once it is up, in the phone's CSS px. */
export const guestSheetTop = (guests: RosterGuest[], mode: PhoneMode) => PHONE.height - sheetHeight(guests, mode);

/**
 * Row `index` of the unfiltered list once the sheet is up and scrolled by
 * `scroll`, in the phone's CSS px: its vertical centre, and the centre of its
 * seat button - the first of the three at the row's right end (`size-9`,
 * `gap-1`, `pr-2`): the utensils, `guests.assign.action`.
 */
export const guestRowAt = (guests: RosterGuest[], index: number, scroll: number, mode: PhoneMode) => {
  const top =
    guestSheetTop(guests, mode) + DRAWER_HANDLE + PILLS + PROGRESS + listTopFor(mode) + rowTop(guests, index) - scroll;
  return {
    y: top + ROW_HEIGHT / 2,
    seatButtonX: PHONE.width - SHEET_PAD_X - 8 - 36 * 2.5 - 4 * 2,
  };
};

export const PhoneShell: React.FC<{
  hall: HallLayout;
  guests: RosterGuest[];
  /** Per-tab badge counts, as `useTabBadgeCounts` reads them: unseated guests, tables, fixtures, open reminders. */
  badges: number[];
  /** The guests sheet, 0..1: it slides up from the bottom edge. */
  sheet: number;
  query?: string;
  /** Who is holding the phone. Left out, it is mum's view-only one, as the mama-link cut drew it. */
  mode?: PhoneMode;
  /** How far the list has scrolled under the sheet's sticky block, in CSS px. */
  scroll?: number;
  /**
   * The canvas's content in place of the whole room fitted to the screen - for
   * a couple zoomed in on one table. Drawn in the canvas's own CSS px, from
   * `canvasBox`'s top edge, under the floating controls.
   */
  canvas?: React.ReactNode;
  /** Drawn over everything else in the app's viewport - a second sheet opened from the list. */
  children?: React.ReactNode;
  /**
   * The header's wedding name. A guest plan opened for the first time has none
   * (`name: undefined`, which `InlineEdit` draws as an empty button), so pass
   * `""`. Left out, it is the couple every published film names.
   */
  weddingName?: string;
  /**
   * Whether `GuestModeBanner` is drawn. Left out, it follows `mode`, as every
   * published film draws it; a film may leave it out of guest mode by choice,
   * keeping the rest of guest mode's header.
   */
  banner?: boolean;
}> = ({ hall, guests, badges, sheet, query = "", mode = "viewer", scroll = 0, canvas, children, weddingName = WEDDING.couple, banner: showBanner }) => {
  const canEdit = canEditIn(mode);
  const banner = showBanner ?? bannerIn(mode);
  const tabs = barTabs(mode);
  const seated = guests.filter((g) => g.table).length;
  const rows = matchingGuests(guests, query);
  const height = sheetHeight(rows, mode);
  const listHeight = listHeightFor(rows, mode);
  const canvasTop = banner ? GUEST_BANNER + HEADER : HEADER;

  // The room fitted into what the header and the tab bar leave of the screen.
  const room = { width: PHONE.width - 16, height: VIEWPORT - canvasTop - TAB_BAR - 24 };
  const aspect = hallAspect(hall);
  const drawWidth = Math.min(room.width, room.height * aspect);

  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: colors.bg, fontFamily: fonts.sans, color: colors.ink }}>
      <BrowserBar />

      <div style={{ position: "absolute", left: 0, right: 0, top: PAGE_TOP, height: VIEWPORT }}>
        {banner ? <GuestBanner /> : null}
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
            {weddingName}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {mode === "guest" ? (
              <InviteChip />
            ) : mode === "owner" ? (
              <div style={{ display: "flex", paddingLeft: 8 }}>
                <Avatar initials="AK" />
                <div style={{ marginLeft: -8 }}>
                  <InviteChip />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", paddingLeft: 8 }}>
                <Avatar initials="AK" />
                <Avatar />
                <Avatar />
              </div>
            )}
            <HeaderButton icon="landmark" />
            {canEdit ? (
              <div style={{ display: "flex" }}>
                <HeaderButton icon="upload" group="first" />
                <HeaderButton icon="download" group="last" />
              </div>
            ) : (
              <HeaderButton icon="download" />
            )}
            <HeaderButton icon="menu" />
          </div>
        </div>

        {/* The canvas, washed as `Canvas.tsx` washes it, the room fitted inside. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: canvasTop,
            bottom: 0,
            backgroundImage: `linear-gradient(135deg, rgba(239, 233, 221, 0.6) 0%, ${colors.bg} 46%, rgba(246, 232, 242, 0.5) 100%)`,
            overflow: canvas ? "hidden" : undefined,
          }}
        >
          {canvas ?? (
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
          )}

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

          {/* `AddFab`: `right-4` at the zoom control's height, `size-14`, opening the add hub. */}
          {canEdit ? (
            <div
              style={{
                position: "absolute",
                right: 16,
                bottom: 88 + PHONE.safeBottom,
                width: 56,
                height: 56,
                borderRadius: 999,
                backgroundColor: colors.primary,
                boxShadow: `0 14px 28px -10px ${colors.primary}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="plus" color={colors.primaryInk} size={28} />
            </div>
          ) : null}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: TAB_BAR,
            display: "grid",
            gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTop: `1px solid ${colors.border}`,
            backgroundColor: colors.bg,
            boxShadow: "0 -14px 30px -22px rgba(40, 60, 45, 0.4)",
          }}
        >
          {tabs.map((tab, i) => (
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
                {(badges[i] ?? 0) > 0 ? (
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
            {/* `DrawerOverlay` over the plan. The mama-link cut drew it as a
                light scrim and a blur, and keeps that; the app's is `bg-black/40`. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: canEdit ? colors.drawerScrim : colors.scrim,
                backdropFilter: canEdit ? undefined : "blur(4px)",
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
                  scroll={scroll}
                  listHeight={listHeight}
                  query={query}
                  readOnly={!canEdit}
                />
              </div>
            </div>
          </>
        ) : null}

        {children}
      </div>
    </div>
  );
};
