import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandMark } from "../../components/BrandMark";
import { CallToAction } from "../../components/CallToAction";
import { Wordmark } from "../../components/Wordmark";
import { useFormat } from "../../format";
import { tl } from "../../i18n";
import { colors } from "../../theme";
import { GuestPanel } from "../components/GuestPanel";
import { guestListFor } from "../guests";

/**
 * The filtered list recedes behind the page, then the mark, the wordmark and
 * the action land. Nothing moves until the cut is over: the beat before this
 * one draws the same list, and a crossfade between two poses of it would ghost.
 */
const RECEDE_FROM = 8;
const RECEDE_OVER = 22;
const MARK_FROM = 16;
const CTA_FROM = 32;

/** How far back the panel goes, and how much of it is left showing under the page. */
const RECEDE_SCALE = 0.9;
const RECEDE_LEFT = 0.05;

const LAYOUT = {
  wide: { markSize: 104, wordSize: 92, actionSize: 36, urlSize: 38, marginTop: 40 },
  tall: { markSize: 104, wordSize: 92, actionSize: 44, urlSize: 42, marginTop: 48 },
};

export const KidsCtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { hall, tall } = useFormat();
  const layout = tall ? LAYOUT.tall : LAYOUT.wide;
  const guests = guestListFor(hall);

  const recede = spring({
    frame: frame - RECEDE_FROM,
    fps,
    config: { damping: 200 },
    durationInFrames: RECEDE_OVER,
  });
  const markIn = spring({ frame: frame - MARK_FROM, fps, config: { damping: 13, mass: 0.6 } });
  // The mark's two seats fill as the count lands - every child on the list has one.
  const fillProgress = spring({
    frame: frame - (MARK_FROM + 10),
    fps,
    config: { damping: 11, mass: 0.5 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <AbsoluteFill
        style={{
          transform: `scale(${interpolate(recede, [0, 1], [1, RECEDE_SCALE])}) translateY(${interpolate(recede, [0, 1], [0, 60])}px)`,
        }}
      >
        <GuestPanel guests={guests} scroll={0} aged={guests.map(() => 1)} activeFilter="kids" />
      </AbsoluteFill>

      {/* The page takes the panel's place, leaving just enough of it to read as the same list. */}
      <AbsoluteFill
        style={{ backgroundColor: colors.bg, opacity: interpolate(recede, [0, 1], [0, 1 - RECEDE_LEFT]) }}
      />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, transform: `scale(${markIn})` }}>
          <BrandMark size={layout.markSize} seatProgress={1} fillProgress={fillProgress} />
          <Wordmark size={layout.wordSize} />
        </div>

        <CallToAction
          action={tl.kids.ctaAction}
          from={CTA_FROM}
          actionSize={layout.actionSize}
          urlSize={layout.urlSize}
          marginTop={tall ? 64 : 52}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
