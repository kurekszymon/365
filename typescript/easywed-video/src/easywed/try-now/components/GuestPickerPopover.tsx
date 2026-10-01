import React from "react";
import { interpolate } from "remotion";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";

/**
 * `GuestAssignmentPicker`'s `PopoverContent` at easywed/v1.1.2, dropped from
 * its trigger at the trigger's width: the search field (`tables.
 * guests_search_placeholder`), then one `sm` button per guest - `outline`
 * while free, `default` once chosen. With one guest on the list, one row.
 * Placed by the caller, in the phone screen's CSS px.
 */

/** `p-2.5 gap-2.5`, an `h-8` input, `sm` rows at `h-7`. */
const PAD = 10;
const GAP = 10;
const INPUT = 32;
const ROW = 28;

/** A row's centre from the popover's top-left - what the thumb aims at. */
export const pickerRowAt = (width: number) => ({ x: width / 2, y: PAD + INPUT + GAP + ROW / 2 });
export const PICKER_HEIGHT = PAD + INPUT + GAP + ROW + PAD;

export const GuestPickerPopover: React.FC<{
  left: number;
  top: number;
  width: number;
  /** Opening, 0..1: `fade-in-0 zoom-in-95 slide-in-from-top-2`. */
  enter: number;
  name: string;
  selected: boolean;
}> = ({ left, top, width, enter, name, selected }) => {
  if (enter <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        boxSizing: "border-box",
        padding: PAD,
        display: "flex",
        flexDirection: "column",
        gap: GAP,
        borderRadius: 10,
        backgroundColor: colors.card,
        boxShadow: "0 0 0 1px rgba(36, 31, 26, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
        fontFamily: fonts.sans,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [-8, 0])}px) scale(${interpolate(enter, [0, 1], [0.95, 1])})`,
        transformOrigin: "top center",
      }}
    >
      <div
        style={{
          height: INPUT,
          boxSizing: "border-box",
          padding: "0 10px",
          borderRadius: 8,
          border: `1px solid ${colors.border}`,
          display: "flex",
          alignItems: "center",
          fontSize: 16,
          color: colors.inkSoft,
        }}
      >
        {tl.app.seatSearch}
      </div>
      <div
        style={{
          height: ROW,
          boxSizing: "border-box",
          padding: "0 10px",
          borderRadius: 8,
          border: `1px solid ${selected ? colors.primary : colors.border}`,
          backgroundColor: selected ? colors.primary : colors.bg,
          color: selected ? colors.primaryInk : colors.ink,
          fontSize: 13,
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {name}
      </div>
    </div>
  );
};
