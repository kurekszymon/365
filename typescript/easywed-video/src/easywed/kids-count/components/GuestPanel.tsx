import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { CHIPS_TOP, GuestList, LIST_TOP, ROW_HEIGHT, rowTop } from "../../components/GuestList";
import { HallCanvas, hallAspect } from "../../components/HallCanvas";
import { canvasInsets, PlannerCanvas } from "../../components/PlannerCanvas";
import type { RosterGuest } from "../../data";
import { useFormat } from "../../format";
import { colors } from "../../theme";

/**
 * The guest panel, framed the way the report cut frames it: in landscape the
 * desktop panel beside the planner, in portrait the list drawer a phone opens
 * from the tab bar. Framed from the search down, so the progress card above it
 * stays out of shot.
 *
 * All three list beats of this film share it, so a cut between them moves only
 * what the couple changed.
 */

/** The list's CSS scale - large enough that a 12px badge reads on a phone. */
const SCALE = { wide: 1.8, tall: 2.46 };

/** Where the filter row's top edge sits on screen: the search shows above it, the progress card does not. */
const CHIPS_AT = 140;

/** Landscape: the panel's left edge, width and inner padding, and the gap before the planner beside it. */
const PANEL = { x: 64, width: 420, padX: 14, gap: 48 };

/**
 * Landscape: what the planner beside the panel is given. The panel is a
 * close-up and runs off the top and bottom edges the way a scrolling list does;
 * the hall does not - a room with two tables cut off the frame reads as a
 * mistake, not as a crop. Its band starts below the top strip the hook's
 * question and the payoff line take, so nothing is ever drawn over the room.
 */
const PLANNER = { top: 270, right: 56, bottom: 56 };
/** Portrait: the drawer's `px-4`. */
const DRAWER_PAD = 16;

export type PanelGeometry = {
  scale: number;
  /**
   * How wide a fade over the list has to be to cover it. Portrait is the whole
   * frame; landscape is the panel column alone, so a fade over the list never
   * reaches the planner beside it.
   */
  fadeWidth: number;
  /** Screen y of the list's own origin - the search field's top edge. */
  listTop: number;
  /** Screen x of the same origin. */
  listLeft: number;
  listWidth: number;
  listHeight: number;
};

export const panelGeometry = (tall: boolean, frameWidth: number, frameHeight: number): PanelGeometry => {
  const scale = tall ? SCALE.tall : SCALE.wide;
  const listTop = CHIPS_AT - CHIPS_TOP * scale;
  return {
    scale,
    fadeWidth: tall ? frameWidth : PANEL.x + PANEL.width * scale + PANEL.gap / 2,
    listTop,
    listLeft: tall ? DRAWER_PAD * scale : PANEL.x + PANEL.padX * scale,
    listWidth: tall ? frameWidth / scale - DRAWER_PAD * 2 : PANEL.width - PANEL.padX * 2,
    listHeight: (frameHeight - (listTop + LIST_TOP * scale)) / scale,
  };
};

/** Scroll that leaves row `row`'s top edge `offset` CSS px below the list's first row. */
export const scrollTo = (guests: RosterGuest[], row: number, offset: number): number =>
  Math.max(0, rowTop(guests, row) - offset);

/**
 * Where a row's action buttons sit on screen, in frame pixels: the three 36px
 * circles sit at the row's right edge behind `pr-2`, so the pencil - the middle
 * one - is one and a half buttons in from it.
 */
export const pencilAt = (
  geometry: PanelGeometry,
  guests: RosterGuest[],
  row: number,
  scroll: number,
): { x: number; y: number } => ({
  x: geometry.listLeft + (geometry.listWidth - 8 - 36 * 1.5) * geometry.scale,
  y: geometry.listTop + (LIST_TOP + rowTop(guests, row) - scroll + ROW_HEIGHT / 2) * geometry.scale,
});

type Props = {
  guests: RosterGuest[];
  scroll: number;
  aged?: number[];
  activeFilter?: "all" | "kids";
  /** Drawn over the panel - the cursor, the sheet, a line. */
  children?: React.ReactNode;
};

export const GuestPanel: React.FC<Props> = ({ guests, scroll, aged, activeFilter, children }) => {
  const { width: frameWidth, height: frameHeight } = useVideoConfig();
  const { hall, tall } = useFormat();
  const geometry = panelGeometry(tall, frameWidth, frameHeight);

  const list = (
    <div
      style={{
        position: "absolute",
        left: geometry.listLeft,
        top: geometry.listTop,
        transform: `scale(${geometry.scale})`,
        transformOrigin: "0 0",
      }}
    >
      <GuestList
        guests={guests}
        width={geometry.listWidth}
        tagged={guests.map(() => 0)}
        scroll={scroll}
        listHeight={geometry.listHeight}
        aged={aged}
        activeFilter={activeFilter}
      />
    </div>
  );

  // A soft fade over the top edge, so the crop reads as a close-up rather than a cut.
  const topFade = (
    <AbsoluteFill
      style={{
        height: tall ? 130 : 110,
        background: `linear-gradient(${colors.bg} 25%, rgba(244, 241, 233, 0))`,
      }}
    />
  );

  if (tall) {
    return (
      <AbsoluteFill style={{ backgroundColor: colors.bg }}>
        {list}
        {topFade}
        {children}
      </AbsoluteFill>
    );
  }

  const panelWidth = PANEL.width * geometry.scale;
  const canvasLeft = PANEL.x + panelWidth + PANEL.gap;

  // The hall takes the room's own proportions inside whatever the panel leaves
  // it, measured in container units rather than guessed in pixels - the way
  // `ImportPlanner` sizes the same canvas.
  const insets = canvasInsets(false);
  const aspect = hallAspect(hall);
  const insetX = insets.left + insets.right;
  const insetY = insets.top + insets.bottom;
  const canvasWidth = `min(100cqw, calc((100cqh - ${insetY}px) * ${aspect} + ${insetX}px))`;
  const canvasHeight = `calc((${canvasWidth} - ${insetX}px) / ${aspect} + ${insetY}px)`;

  return (
    <Backdrop>
      {/* The planner beside the panel, every seat taken, whole. */}
      <div
        style={{
          position: "absolute",
          left: canvasLeft,
          top: PLANNER.top,
          width: frameWidth - canvasLeft - PLANNER.right,
          height: frameHeight - PLANNER.top - PLANNER.bottom,
          containerType: "size",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: canvasWidth, height: canvasHeight, display: "flex" }}>
          <PlannerCanvas hall={hall} tall={false}>
            <HallCanvas
              hall={hall}
              outline={1}
              floor={1}
              tableIn={hall.tables.map(() => 1)}
              seatFill={hall.tables.map(() => 1)}
            />
          </PlannerCanvas>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: PANEL.x,
          top: -40,
          width: panelWidth,
          height: frameHeight + 80,
          borderRadius: 22 * geometry.scale,
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.bg,
        }}
      />
      {list}
      {topFade}
      {children}
    </Backdrop>
  );
};
