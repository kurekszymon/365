import React from "react";
import { Icon } from "../../components/Icon";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";
import type { SeatSection } from "../seating";

/**
 * Redraws `planner/Canvas/SeatAssignPopover.tsx`, the menu that opens on a seat
 * marker: the search field, *Zwolnij miejsce* when the chair is taken, then the
 * guest list in the app's own section order - the chair's occupant, everyone at
 * that table, everyone with no table, and everyone seated elsewhere in amber.
 * Empty sections are dropped there and here alike (`sectionsFor`).
 *
 * Sizes are `PopoverContent`'s own classes at `--radius: 0.625rem`: `w-64`,
 * `p-2.5`, `gap-2.5`, an `h-8` input, `h-7` rows and a `max-h-52` scroller.
 */
export const POPOVER = {
  width: 256,
  pad: 10,
  gap: 10,
  input: 32,
  clear: 28,
  /** `max-h-52` on the scrolling list. */
  list: 208,
  header: 20,
  row: 28,
  rowGap: 4,
  sectionGap: 8,
  /** Radix's `sideOffset`, between the seat marker and the popover. */
  offset: 4,
};

const sectionHeight = (count: number) =>
  POPOVER.header + POPOVER.rowGap + count * POPOVER.row + (count - 1) * POPOVER.rowGap;

/** The list's full content height, before `max-h-52` clips it. */
export const listHeight = (sections: SeatSection[]): number =>
  sections.reduce((sum, section) => sum + sectionHeight(section.items.length) + POPOVER.sectionGap, 0) -
  POPOVER.sectionGap;

/** How far the list can be scrolled before it hits its end. */
export const maxScroll = (sections: SeatSection[]): number =>
  Math.max(0, listHeight(sections) - POPOVER.list);

/** The top of one section, in the list's own coordinates - where its header sits. */
export const sectionTop = (sections: SeatSection[], key: string): number => {
  let top = 0;
  for (const section of sections) {
    if (section.key === key) return top;
    top += sectionHeight(section.items.length) + POPOVER.sectionGap;
  }
  throw new Error(`No section ${key}`);
};

/** The top of one row, in the list's own coordinates - what the pointer aims at. */
export const rowTop = (sections: SeatSection[], key: string, index: number): number =>
  sectionTop(sections, key) + POPOVER.header + POPOVER.rowGap + index * (POPOVER.row + POPOVER.rowGap);

/** Scrolled to here, a section's header sits at the top of the window. */
export const scrollToHeader = (sections: SeatSection[], key: string): number =>
  Math.min(maxScroll(sections), sectionTop(sections, key));

/** The whole popover's height, so it can be hung off the seat marker. */
export const popoverHeight = (sections: SeatSection[], hasClear: boolean): number =>
  POPOVER.pad * 2 +
  POPOVER.input +
  POPOVER.gap +
  (hasClear ? POPOVER.clear + POPOVER.gap : 0) +
  Math.min(listHeight(sections), POPOVER.list);

/** Where in the list the pointer should be looking, so the target row lands in view. */
export const scrollTo = (sections: SeatSection[], key: string, index: number): number =>
  Math.min(maxScroll(sections), Math.max(0, rowTop(sections, key, index) - POPOVER.list / 2 + POPOVER.row / 2));

type Props = {
  sections: SeatSection[];
  /** The list's scroll position, in unscaled list pixels. */
  scroll: number;
  /** `seats.clear` only shows when the chair has an occupant to turn out. */
  hasClear: boolean;
  /** The row the pointer is over, drawn in the app's hover tone. */
  hover?: { key: string; index: number };
  scale: number;
  /** 0..1 - the `zoom-in-95` entrance, and the fade out as the popover closes. */
  open: number;
  /**
   * The focused search field: what has been typed, and whether the caret is
   * in its on phase. Left out, the field shows its placeholder, as the loop
   * draws it.
   */
  search?: { text: string; caret: boolean };
};

const Row: React.FC<{ name: string; elsewhere: boolean; occupant: boolean; hover: boolean; scale: number }> = ({
  name,
  elsewhere,
  occupant,
  hover,
  scale,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      height: POPOVER.row * scale,
      padding: `0 ${10 * scale}px`,
      borderRadius: 8 * scale,
      border: `1px solid ${elsewhere ? "rgba(255, 210, 48, 0.8)" : occupant ? "transparent" : colors.border}`,
      backgroundColor: elsewhere
        ? hover
          ? "rgba(254, 243, 199, 0.7)"
          : "rgba(255, 251, 235, 0.7)"
        : occupant
          ? colors.primary
          : colors.secondary,
      filter: hover && !elsewhere && !occupant ? "brightness(0.97)" : undefined,
      fontFamily: fonts.sans,
      fontSize: 12.8 * scale,
      fontWeight: 500,
      color: elsewhere ? colors.amber900 : occupant ? colors.primaryInk : colors.ink,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }}
  >
    {name}
  </div>
);

export const SeatPopover: React.FC<Props> = ({ sections, scroll, hasClear, hover, scale, open, search }) => (
  <div
    style={{
      width: POPOVER.width * scale,
      display: "flex",
      flexDirection: "column",
      gap: POPOVER.gap * scale,
      padding: POPOVER.pad * scale,
      borderRadius: 10 * scale,
      backgroundColor: colors.card,
      boxShadow: `0 0 0 ${1 * scale}px rgba(36, 31, 26, 0.1), 0 10px 24px -8px rgba(60, 50, 40, 0.28)`,
      opacity: open,
      transform: `scale(${0.95 + 0.05 * open})`,
      transformOrigin: "center",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: POPOVER.input * scale,
        padding: `0 ${10 * scale}px`,
        borderRadius: 10 * scale,
        border: `1px solid ${colors.border}`,
        fontFamily: fonts.sans,
        fontSize: 14 * scale,
        color: colors.inkSoft,
      }}
    >
      {search?.text ? <span style={{ color: colors.ink }}>{search.text}</span> : null}
      {search ? (
        <span
          style={{
            width: 1.5 * scale,
            height: 16 * scale,
            marginLeft: search.text ? 1 * scale : 0,
            backgroundColor: colors.ink,
            opacity: search.caret ? 1 : 0,
          }}
        />
      ) : null}
      {search?.text ? null : tl.app.seatSearch}
    </div>

    {hasClear ? (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6 * scale,
          height: POPOVER.clear * scale,
          padding: `0 ${10 * scale}px`,
          borderRadius: 8 * scale,
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.secondary,
          fontFamily: fonts.sans,
          fontSize: 12.8 * scale,
          fontWeight: 500,
          color: colors.inkSoft,
        }}
      >
        <Icon name="x" color={colors.inkSoft} size={14 * scale} />
        {tl.app.seatClear}
      </div>
    ) : null}

    <div style={{ height: Math.min(listHeight(sections), POPOVER.list) * scale, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: POPOVER.sectionGap * scale,
          transform: `translateY(${-scroll * scale}px)`,
        }}
      >
        {sections.map((section) => (
          <div
            key={section.key}
            style={{ display: "flex", flexDirection: "column", gap: POPOVER.rowGap * scale }}
          >
            <div
              style={{
                height: POPOVER.header * scale,
                display: "flex",
                alignItems: "center",
                padding: `0 ${4 * scale}px`,
                fontFamily: fonts.sans,
                fontSize: 10 * scale,
                fontWeight: 500,
                letterSpacing: 0.4 * scale,
                textTransform: "uppercase",
                color: colors.inkSoft,
              }}
            >
              {section.label}
            </div>
            {section.items.map((name, i) => (
              <Row
                key={name}
                name={name}
                elsewhere={section.elsewhere}
                occupant={section.key === "selected"}
                hover={hover?.key === section.key && hover.index === i}
                scale={scale}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);
