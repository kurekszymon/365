import React from "react";
import { AddHub, addHubCardCenter, addHubHeight } from "../../components/AddHub";
import { DRAWER_HANDLE, DrawerHandle } from "../../components/HallPanel";
import { Icon } from "../../components/Icon";
import { PAGE_TOP, PHONE } from "../../components/PhoneFrame";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";

/**
 * `EntityForms/MobilePanelDrawer.tsx` at easywed/v1 holding the `add_hub`
 * view - what `AddFab` opens on a phone: the drawer titled *Dodaj do sali*
 * (`usePanelTitle`) with the neutral X, since a picker is not a form, over
 * `AddHubContent` on its default *Stoły* tab. It hugs its content. A card tap
 * swaps the same drawer to *Edytuj stół* (`openTableEdit`), so the drawer can
 * grow toward that form's height while its picker fades - `height` and
 * `body` say how far. Sizes are the app's CSS pixels.
 */

const VIEWPORT = PHONE.height - PAGE_TOP;
/** `DrawerHeader`'s `p-4` round the `text-lg` title's 28 px line. */
const HEADER = 16 + 28 + 16;
const PAD_X = 16;
/** `pb-[max(1rem,env(safe-area-inset-bottom))]`. */
const PAD_BOTTOM = Math.max(16, PHONE.safeBottom);
const BODY_WIDTH = PHONE.width - PAD_X * 2;

/** The drawer's height on the *Stoły* tab. */
export const HUB_SHEET_HEIGHT = DRAWER_HANDLE + HEADER + addHubHeight("tables") + PAD_BOTTOM;

/** A table card's centre in the phone screen's CSS px, once the drawer is up. */
export const hubCardAt = (index: number) => {
  const card = addHubCardCenter(BODY_WIDTH, index);
  return { x: PAD_X + card.x, y: PHONE.height - HUB_SHEET_HEIGHT + DRAWER_HANDLE + HEADER + card.y };
};

export const AddHubSheet: React.FC<{
  /** The drawer rising, 0..1. */
  enter: number;
  /** Its height, CSS px - `HUB_SHEET_HEIGHT` unless it is growing into the form. */
  height?: number;
  /** The picker's opacity, 0..1, as the form takes the drawer over. */
  body?: number;
  /** The card under the thumb, by preset key. */
  pressed?: string;
}> = ({ enter, height = HUB_SHEET_HEIGHT, body = 1, pressed }) => {
  if (enter <= 0) return null;
  return (
    <>
      {/* `DrawerOverlay`'s `bg-black/40`, no blur. */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: colors.drawerScrim, opacity: Math.min(1, enter) }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: VIEWPORT - height,
          height,
          transform: `translateY(${(1 - enter) * (height + 20)}px)`,
          boxSizing: "border-box",
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          backgroundColor: colors.bg,
          boxShadow: "0 -1px 0 0 rgba(36, 31, 26, 0.1), 0 -24px 60px rgba(60, 50, 40, 0.18)",
          fontFamily: fonts.sans,
          overflow: "hidden",
        }}
      >
        <DrawerHandle />
        <div style={{ opacity: body }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: DRAWER_HANDLE,
              height: HEADER,
              padding: `0 ${PAD_X}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontFamily: fonts.heading, fontSize: 18, lineHeight: "28px", fontWeight: 500, color: colors.ink }}>
              {tl.app.addHub.title}
            </div>
            <Icon name="x" color={colors.inkSoft} size={20} />
          </div>
          <div style={{ position: "absolute", left: PAD_X, top: DRAWER_HANDLE + HEADER }}>
            <AddHub category="tables" width={BODY_WIDTH} scale={1} hovered={pressed} />
          </div>
        </div>
      </div>
    </>
  );
};
