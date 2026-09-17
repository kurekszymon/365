import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { HallCanvas } from "../../components/HallCanvas";
import { PlannerCanvas } from "../../components/PlannerCanvas";
import { useFormat } from "../../format";
import { colors } from "../../theme";
import { CHIPS_TOP, GuestList, LIST_TOP, rowBottom } from "../../components/GuestList";
import { guestListFor } from "../guests";

/**
 * A close-up on the guest panel: in landscape the desktop panel beside the
 * planner, in portrait the list drawer a phone opens from the tab bar. Framed
 * from the search down, so the progress card above it stays out of shot.
 */

/**
 * Diet rows among the first this-many are tagged on screen. The list's other
 * diets were typed in earlier, so the filter chips start from them and tick up.
 */
const TAGGED_IN_SHOT = 10;

/** Frames each diet tag lands on, in list order; the list scrolls the tagged row into view first. */
const TAG_FROM = 16;
const TAG_STEP = 18;
const SCROLL_LEAD = 14;
const SCROLL_OVER = 14;

/** The list's CSS scale - large enough that a 12px tag reads on a phone. */
const SCALE = { wide: 2.2, tall: 2.46 };

/** Where the filter row's top edge sits on screen: the search shows above it, the progress card does not. */
const CHIPS_AT = 140;

/**
 * Landscape: the panel's left edge, width and inner padding, and the gap before
 * the planner beside it - wide enough that "Przy stole: Stół pary młodej" fits
 * beside the row's three buttons.
 */
const PANEL = { x: 64, width: 420, padX: 14, gap: 48 };
/** Portrait: the drawer's `px-4`. */
const DRAWER_PAD = 16;

/** Room kept below a tagged row when the list scrolls to it, in CSS px. */
const ROW_MARGIN = 16;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const ReportTagsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: frameWidth, height: frameHeight } = useVideoConfig();
  const { hall, tall } = useFormat();
  const guests = guestListFor(hall);
  const scale = tall ? SCALE.tall : SCALE.wide;

  const listTop = CHIPS_AT - CHIPS_TOP * scale;
  const listHeight = (frameHeight - (listTop + LIST_TOP * scale)) / scale;

  // The rows in shot carrying a diet, tagged one after another; the rest already carry theirs.
  const dietRows = guests.map((guest, i) => (guest.diet && i < TAGGED_IN_SHOT ? i : -1)).filter((i) => i >= 0);
  const tagAt = dietRows.map((_, k) => TAG_FROM + k * TAG_STEP);
  const tagged = guests.map((guest, i) => {
    const k = dietRows.indexOf(i);
    if (k >= 0) return spring({ frame: frame - tagAt[k], fps, config: { damping: 12, mass: 0.5 } });
    return guest.diet ? 1 : 0;
  });

  // Before each tag lands, the list scrolls just far enough to show its row whole.
  const targets = dietRows.map((row) => Math.max(0, rowBottom(guests, row) + ROW_MARGIN - listHeight));
  const scroll = interpolate(
    frame,
    tagAt.flatMap((at) => [at - SCROLL_LEAD, at - SCROLL_LEAD + SCROLL_OVER]),
    targets.flatMap((target, k) => [k === 0 ? 0 : targets[k - 1], target]),
    { ...clamp, easing: Easing.inOut(Easing.cubic) },
  );

  const listWidth = tall ? frameWidth / scale - DRAWER_PAD * 2 : PANEL.width - PANEL.padX * 2;
  const list = (
    <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}>
      <GuestList guests={guests} width={listWidth} tagged={tagged} scroll={scroll} listHeight={listHeight} />
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
        <div style={{ position: "absolute", left: DRAWER_PAD * scale, top: listTop }}>{list}</div>
        {topFade}
      </AbsoluteFill>
    );
  }

  const panelWidth = PANEL.width * scale;
  const canvasLeft = PANEL.x + panelWidth + PANEL.gap;

  return (
    <Backdrop>
      {/* The planner beside the panel, every seat taken; it runs off the frame's edges like the panel does. */}
      <div
        style={{
          position: "absolute",
          left: canvasLeft,
          top: -140,
          width: frameWidth - canvasLeft + 220,
          height: frameHeight + 280,
          display: "flex",
        }}
      >
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

      <div
        style={{
          position: "absolute",
          left: PANEL.x,
          top: -40,
          width: panelWidth,
          height: frameHeight + 80,
          borderRadius: 22 * scale,
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.bg,
        }}
      />
      <div style={{ position: "absolute", left: PANEL.x + PANEL.padX * scale, top: listTop }}>{list}</div>
      {topFade}
    </Backdrop>
  );
};
