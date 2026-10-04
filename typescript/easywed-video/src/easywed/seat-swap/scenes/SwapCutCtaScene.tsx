import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandMark } from "../../components/BrandMark";
import { CallToAction } from "../../components/CallToAction";
import { Wordmark } from "../../components/Wordmark";
import { useFormat } from "../../format";
import { tl } from "../../i18n";
import { colors } from "../../theme";
import { SwapCutPlanner } from "../components/SwapCutPlanner";
import { SWAP_CUT_STARTS } from "../timeline";

/**
 * The full room recedes behind the page, then the mark, the wordmark and the
 * action land. Nothing moves until the cut is over: the beat before draws the
 * same room, and a crossfade between two poses of it would ghost.
 */
const RECEDE_FROM = 8;
const RECEDE_OVER = 22;
const MARK_FROM = 16;
const CTA_FROM = 32;

/** How far back the room goes, and how much of it is left showing under the page. */
const RECEDE_SCALE = 0.9;
const RECEDE_LEFT = 0.05;

const LAYOUT = {
  wide: { markSize: 104, wordSize: 92, actionSize: 36, urlSize: 38, marginTop: 52 },
  tall: { markSize: 104, wordSize: 92, actionSize: 44, urlSize: 42, marginTop: 64 },
};

export const SwapCutCtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { tall } = useFormat();
  const layout = tall ? LAYOUT.tall : LAYOUT.wide;

  const recede = spring({
    frame: frame - RECEDE_FROM,
    fps,
    config: { damping: 200 },
    durationInFrames: RECEDE_OVER,
  });
  const markIn = spring({ frame: frame - MARK_FROM, fps, config: { damping: 13, mass: 0.6 } });
  // The mark's two seats fill as it lands - every chair in the room is taken again.
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
        <SwapCutPlanner frame={frame + SWAP_CUT_STARTS.cta} copy={false} />
      </AbsoluteFill>

      {/* The page takes the room's place, leaving just enough of it to read as the same plan. */}
      <AbsoluteFill
        style={{ backgroundColor: colors.bg, opacity: interpolate(recede, [0, 1], [0, 1 - RECEDE_LEFT]) }}
      />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, transform: `scale(${markIn})` }}>
          <BrandMark size={layout.markSize} seatProgress={1} fillProgress={fillProgress} />
          <Wordmark size={layout.wordSize} />
        </div>

        <CallToAction
          action={tl.swapCut.ctaAction}
          from={CTA_FROM}
          actionSize={layout.actionSize}
          urlSize={layout.urlSize}
          marginTop={layout.marginTop}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
