import React from "react";
import { DRAWER_HANDLE, DrawerHandle } from "../../components/HallPanel";
import { Icon, type IconName } from "../../components/Icon";
import { PAGE_TOP, PHONE } from "../../components/PhoneFrame";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";

/**
 * `MobileTabBar`'s drawer on *Goście* while nobody is on the list, at
 * easywed/v1.1.2: the four tab pills, then `GuestListContent`'s empty state -
 * *Brak gości.* and the add and import buttons, no progress, search or chips.
 * `PhoneShell` draws the same drawer once a guest is on the list. Sizes are the
 * app's CSS pixels.
 */

const VIEWPORT = PHONE.height - PAGE_TOP;
/** The pills: `pt-4 pb-4` round a `py-2` pill; then the list's `border-t` and `pt-4`. */
const PILLS = 16 + 36 + 16;
const LIST_PAD = 16;
/** `text-sm` line, `gap-3`, two outline `h-8` buttons. */
const NONE = 20;
const STACK_GAP = 12;
const BUTTON = 32;
const PAD_BOTTOM = Math.max(16, PHONE.safeBottom);

const HEIGHT = DRAWER_HANDLE + PILLS + 1 + LIST_PAD + NONE + (STACK_GAP + BUTTON) * 2 + PAD_BOTTOM;

/** *Dodaj gościa*'s centre once the drawer is up, in the phone screen's CSS px. */
export const ADD_GUEST_BUTTON = {
  x: PHONE.width / 2,
  y: PHONE.height - HEIGHT + DRAWER_HANDLE + PILLS + 1 + LIST_PAD + NONE + STACK_GAP + BUTTON / 2,
};
/** The drawer's top edge once it is up - a tap above it lands on `DrawerOverlay`. */
export const EMPTY_SHEET_TOP = PHONE.height - HEIGHT;

const TABS = [tl.app.mobileTabs.guests, tl.app.mobileTabs.tables, tl.app.mobileTabs.fixtures, tl.app.mobileTabs.reminders];

const OutlineButton: React.FC<{ icon: IconName; label: string }> = ({ icon, label }) => (
  <div
    style={{
      height: BUTTON,
      boxSizing: "border-box",
      borderRadius: 8,
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.bg,
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      fontSize: 14,
      fontWeight: 500,
      color: colors.ink,
    }}
  >
    <Icon name={icon} color={colors.ink} size={16} />
    {label}
  </div>
);

export const EmptyGuestsSheet: React.FC<{ enter: number }> = ({ enter }) => {
  if (enter <= 0) return null;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, backgroundColor: colors.drawerScrim, opacity: Math.min(1, enter) }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: VIEWPORT - HEIGHT,
          height: HEIGHT,
          transform: `translateY(${(1 - enter) * (HEIGHT + 20)}px)`,
          boxSizing: "border-box",
          paddingTop: DRAWER_HANDLE,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          backgroundColor: colors.bg,
          boxShadow: "0 -1px 0 0 rgba(36, 31, 26, 0.1), 0 -24px 60px rgba(60, 50, 40, 0.18)",
          fontFamily: fonts.sans,
          overflow: "hidden",
        }}
      >
        <DrawerHandle />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, padding: 16 }}>
          {TABS.map((label, i) => (
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
                backgroundColor: i === 0 ? colors.primary : colors.bgDeep,
                color: i === 0 ? colors.primaryInk : colors.inkSoft,
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
            padding: `${LIST_PAD}px 16px 0`,
            display: "flex",
            flexDirection: "column",
            gap: STACK_GAP,
          }}
        >
          <div style={{ height: NONE, fontSize: 14, lineHeight: `${NONE}px`, color: colors.inkSoft }}>{tl.guests.none}</div>
          <OutlineButton icon="plus" label={tl.guests.add} />
          <OutlineButton icon="fileSpreadsheet" label={tl.guests.import} />
        </div>
      </div>
    </>
  );
};
