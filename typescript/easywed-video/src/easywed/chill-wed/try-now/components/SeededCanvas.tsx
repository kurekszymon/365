import React from "react";
import { interpolate } from "remotion";
import { Icon, type IconName } from "../../../components/Icon";
import { tl } from "../../../i18n";
import { colors, fonts } from "../../../theme";
import { CANVAS, HALL, PRESET, TABLE, guestsAt, seatedAt, tablesAt, viewAt } from "../plan";
import { OnboardingCard } from "./OnboardingCard";

/**
 * `Canvas/Canvas.tsx` at easywed/v1.1.2 on a phone, for a plan opened for the
 * first time: `DEFAULT_HALL` fitted and centred at zoom 1, drawn by `HallView` -
 * the floor with its 1 m grid and firmer 5 m ruling, `ring-1
 * ring-planner-hall/70`, and the label chip at its top-left (`hall.unnamed` and
 * the size; a phone gets no dimension labels, `!isMobile`). Over it,
 * `OnboardingChecklist`. A table from the add hub is `TableVisual` with no name
 * - only its count - and no seat markers, since *Miejsca* is off on a fresh
 * plan (`view.store` `showSeats: false`). Drawn in the canvas box's own CSS px.
 */

/** `text-[10px]` count, `text-xs` chip - the app's fixed sizes, whatever the zoom. */
const COUNT_SIZE = 10;
const CHIP_SIZE = 12;

/** `HallView`'s chip: the grip, then name · size, `truncate`d inside the hall. */
const HallChip: React.FC = () => {
  const label = [tl.app.hallsList.unnamed, `${HALL.width}×${HALL.height} m`].join(" · ");
  return (
    <div
      style={{
        position: "absolute",
        top: 4,
        left: 4,
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px 2px 4px",
        borderRadius: 6,
        border: `1px solid ${colors.border}`,
        backgroundColor: `${colors.card}e6`,
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        fontFamily: fonts.sans,
        fontSize: CHIP_SIZE,
        lineHeight: "16px",
        fontWeight: 500,
        color: colors.ink,
        whiteSpace: "nowrap",
      }}
    >
      {/* `GripVerticalIcon`, `size-3.5`: two columns of three dots. */}
      <svg width={14} height={14} viewBox="0 0 24 24">
        {[9, 15].map((x) => [5, 12, 19].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} fill={colors.inkSoft} />))}
      </svg>
      {label}
    </div>
  );
};

/**
 * `DraggableTable`'s toolbar over a selected table, as the table-shape cut
 * draws it: 2rem above its edge, `p-1` round a `size-3.5` icon, `gap-1`; the
 * pen is the phone's own (`isMobile`), then copy, duplicate and a red delete.
 */
const TOOL = 4 + 14 + 4 + 2;
const TOOLS: { icon: IconName; danger?: boolean }[] = [
  { icon: "squarePen" },
  { icon: "clipboardCopy" },
  { icon: "copy" },
  { icon: "trash", danger: true },
];
const TOOLBAR_WIDTH = TOOLS.length * TOOL + (TOOLS.length - 1) * 4;
const TOOLBAR_GAP = 32;

/** The pen's centre in the canvas box's CSS px, over the table at `frame`'s zoom. */
export const penAt = (frame: number) => {
  const { ppm, origin } = viewAt(frame);
  return {
    x: origin.x + (TABLE.x + PRESET.size.width / 2) * ppm - TOOLBAR_WIDTH / 2 + TOOL / 2,
    y: origin.y + TABLE.y * ppm - TOOLBAR_GAP + TOOL / 2,
  };
};

export const SeededCanvas: React.FC<{
  frame: number;
  /** The table's selection, 0..1: its ring and its toolbar. */
  selected: number;
  penPressed: boolean;
}> = ({ frame, selected, penPressed }) => {
  const { ppm: PPM, origin } = viewAt(frame);
  const grid = `${colors.grid}80`;
  const gridMajor = `${colors.grid}bf`;
  const seated = seatedAt(frame);

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: CANVAS.width, height: CANVAS.height }}>
      <div
        style={{
          position: "absolute",
          left: origin.x,
          top: origin.y,
          width: HALL.width * PPM,
          height: HALL.height * PPM,
          backgroundColor: colors.bg,
          backgroundImage: [
            `linear-gradient(${gridMajor} 1px, transparent 1px)`,
            `linear-gradient(90deg, ${gridMajor} 1px, transparent 1px)`,
            `linear-gradient(${grid} 1px, transparent 1px)`,
            `linear-gradient(90deg, ${grid} 1px, transparent 1px)`,
          ].join(", "),
          backgroundSize: `${PPM * 5}px ${PPM * 5}px, ${PPM * 5}px ${PPM * 5}px, ${PPM}px ${PPM}px, ${PPM}px ${PPM}px`,
          boxShadow: `0 0 0 1px ${colors.hall}b3, 0 1px 2px rgba(0, 0, 0, 0.05)`,
        }}
      >
        {tablesAt(frame) ? (
          <div
            style={{
              position: "absolute",
              left: TABLE.x * PPM,
              top: TABLE.y * PPM,
              width: PRESET.size.width * PPM,
              height: PRESET.size.height * PPM,
              boxSizing: "border-box",
              borderRadius: 999,
              border: `1px solid ${colors.tableBorder}`,
              backgroundColor: colors.table,
              color: colors.tableInk,
              // The selection ring, `ring-2 ring-planner-selected`.
              boxShadow: `0 0 0 ${2 * selected}px ${colors.selected}, 0 1px 2px rgba(0, 0, 0, 0.05)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* `px-1 max-w-full` round a `truncate`d count: at the fitted zoom a 1.5 m table is too narrow for all of it. */}
            <div style={{ maxWidth: "100%", boxSizing: "border-box", padding: "0 4px", display: "flex" }}>
              <span
                style={{
                  minWidth: 0,
                  fontFamily: fonts.sans,
                  fontSize: COUNT_SIZE,
                  lineHeight: 1.25,
                  opacity: 0.75,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {`${seated} / ${PRESET.capacity}`}
              </span>
            </div>
          </div>
        ) : null}
        <HallChip />
      </div>

      {selected > 0 ? (
        <div
          style={{
            position: "absolute",
            left: penAt(frame).x - TOOL / 2,
            top: penAt(frame).y - TOOL / 2,
            display: "flex",
            gap: 4,
            opacity: selected,
            transform: `translateY(${interpolate(selected, [0, 1], [4, 0])}px)`,
          }}
        >
          {TOOLS.map((tool, i) => (
            <div
              key={tool.icon}
              style={{
                width: TOOL,
                height: TOOL,
                boxSizing: "border-box",
                borderRadius: 8,
                border: `1px solid ${tool.danger ? "#ffc9c9" : colors.tableBorder}`,
                backgroundColor: colors.bg,
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: penPressed && i === 0 ? "translateY(1px)" : undefined,
              }}
            >
              <Icon name={tool.icon} color={tool.danger ? colors.destructive : colors.tableInk} size={14} />
            </div>
          ))}
        </div>
      ) : null}

      <OnboardingCard tables={tablesAt(frame)} guests={guestsAt(frame)} seated={seated} />
    </div>
  );
};
