import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandMark } from "../../components/BrandMark";
import { CallToAction } from "../../components/CallToAction";
import { Wordmark } from "../../components/Wordmark";
import { tl } from "../../i18n";
import { TenTablesStage } from "../components/TenTablesStage";
import { TEN_TABLES_STARTS } from "../timeline";

/**
 * The laptop recedes behind the page under the payoff, which stays up, then
 * the mark, the wordmark and the action - the series' close, so every episode
 * ends alike. Nothing moves until the cut is over: the beat before draws the
 * same laptop, and a crossfade between two poses of it would ghost.
 */
const RECEDE_FROM = 8;
const RECEDE_OVER = 22;
/** The action lands with 68 frames left - past ten a word. */
const MARK_FROM = 28;
const CTA_FROM = 40;

const LAYOUT = { markSize: 104, wordSize: 92, actionSize: 44, urlSize: 42, marginTop: 64, below: 200 };

export const TenTablesCtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const recede = spring({ frame: frame - RECEDE_FROM, fps, config: { damping: 200 }, durationInFrames: RECEDE_OVER });
  const markIn = spring({ frame: frame - MARK_FROM, fps, config: { damping: 13, mass: 0.6 } });
  // The mark's two seats fill as it lands.
  const fillProgress = spring({ frame: frame - (MARK_FROM + 10), fps, config: { damping: 11, mass: 0.5 } });

  return (
    <TenTablesStage frame={frame + TEN_TABLES_STARTS.cta} recede={recede}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingTop: LAYOUT.below }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, transform: `scale(${markIn})` }}>
          <BrandMark size={LAYOUT.markSize} seatProgress={1} fillProgress={fillProgress} />
          <Wordmark size={LAYOUT.wordSize} />
        </div>

        <CallToAction
          action={tl.tenTables.ctaAction}
          from={CTA_FROM}
          actionSize={LAYOUT.actionSize}
          urlSize={LAYOUT.urlSize}
          marginTop={LAYOUT.marginTop}
        />
      </AbsoluteFill>
    </TenTablesStage>
  );
};
