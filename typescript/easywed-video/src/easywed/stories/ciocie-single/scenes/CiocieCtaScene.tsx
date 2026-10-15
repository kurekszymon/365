import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandMark } from "../../../components/BrandMark";
import { CallToAction } from "../../../components/CallToAction";
import { Wordmark } from "../../../components/Wordmark";
import { tl } from "../../../i18n";
import { CiocieStage } from "../components/CiocieStage";
import { CIOCIE_STARTS } from "../timeline";

/**
 * The whole room holds under the payoff while the pull-back settles, then the
 * phone recedes behind the page and the mark, the wordmark and the action land
 * - the table-shape cut's close, started later, since this cut's payoff is the
 * room itself and needs the beat to be read.
 */
const RECEDE_FROM = 36;
const RECEDE_OVER = 22;
/** The action lands with 48 frames left - past ten a word. */
const MARK_FROM = 50;
const CTA_FROM = 60;

const LAYOUT = { markSize: 104, wordSize: 92, actionSize: 44, urlSize: 42, marginTop: 64, below: 200 };

export const CiocieCtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const recede = spring({ frame: frame - RECEDE_FROM, fps, config: { damping: 200 }, durationInFrames: RECEDE_OVER });
  const markIn = spring({ frame: frame - MARK_FROM, fps, config: { damping: 13, mass: 0.6 } });
  // The mark's two seats fill as it lands.
  const fillProgress = spring({ frame: frame - (MARK_FROM + 10), fps, config: { damping: 11, mass: 0.5 } });

  return (
    <CiocieStage frame={frame + CIOCIE_STARTS.cta} recede={recede}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingTop: LAYOUT.below }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, transform: `scale(${markIn})` }}>
          <BrandMark size={LAYOUT.markSize} seatProgress={1} fillProgress={fillProgress} />
          <Wordmark size={LAYOUT.wordSize} />
        </div>

        <CallToAction
          action={tl.ciocie.ctaAction}
          from={CTA_FROM}
          actionSize={LAYOUT.actionSize}
          urlSize={LAYOUT.urlSize}
          marginTop={LAYOUT.marginTop}
        />
      </AbsoluteFill>
    </CiocieStage>
  );
};
