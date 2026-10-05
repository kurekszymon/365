import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandMark } from "../../../components/BrandMark";
import { CallToAction } from "../../../components/CallToAction";
import { Wordmark } from "../../../components/Wordmark";
import { tl } from "../../../i18n";
import { colors, fonts } from "../../../theme";
import { CouchPlanner } from "../components/CouchPlanner";
import { SUNDAY_COUCH_STARTS } from "../timeline";

/**
 * The laptop recedes behind the page and the payoff lands over it, then the
 * mark, the wordmark and the action. Nothing moves until the cut is over: the
 * beat before draws the same laptop, and a crossfade between two poses of it
 * would ghost.
 */
const RECEDE_FROM = 8;
const RECEDE_OVER = 22;
const PAYOFF_FROM = 12;
/** The payoff stays up to the last frame - 96 frames for six words; the action lands under it with 68 left. */
const MARK_FROM = 28;
const CTA_FROM = 40;

/** How far back the laptop goes, and how much of it is left showing under the page. */
const RECEDE_SCALE = 0.9;
const RECEDE_LEFT = 0.05;

const LAYOUT = { padX: 48, payoffTop: 330, payoffSize: 84, markSize: 104, wordSize: 92, actionSize: 44, urlSize: 42, marginTop: 64 };

export const CouchCtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const recede = spring({ frame: frame - RECEDE_FROM, fps, config: { damping: 200 }, durationInFrames: RECEDE_OVER });
  const payoffIn = spring({ frame: frame - PAYOFF_FROM, fps, config: { damping: 200 }, durationInFrames: 20 });
  const markIn = spring({ frame: frame - MARK_FROM, fps, config: { damping: 13, mass: 0.6 } });
  // The mark's two seats fill as it lands - everyone seated.
  const fillProgress = spring({ frame: frame - (MARK_FROM + 10), fps, config: { damping: 11, mass: 0.5 } });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <AbsoluteFill
        style={{
          transform: `scale(${interpolate(recede, [0, 1], [1, RECEDE_SCALE])}) translateY(${interpolate(recede, [0, 1], [0, 60])}px)`,
        }}
      >
        <CouchPlanner frame={frame + SUNDAY_COUCH_STARTS.cta} copy={false} />
      </AbsoluteFill>

      {/* The page takes the laptop's place, leaving just enough of it to read as the same evening. */}
      <AbsoluteFill
        style={{ backgroundColor: colors.bg, opacity: interpolate(recede, [0, 1], [0, 1 - RECEDE_LEFT]) }}
      />

      <div
        style={{
          position: "absolute",
          left: LAYOUT.padX,
          right: LAYOUT.padX,
          top: LAYOUT.payoffTop,
          fontFamily: fonts.heading,
          fontSize: LAYOUT.payoffSize,
          fontWeight: 600,
          letterSpacing: -2,
          lineHeight: 1.05,
          color: colors.ink,
          textAlign: "center",
          opacity: payoffIn,
          transform: `translateY(${interpolate(payoffIn, [0, 1], [24, 0])}px)`,
        }}
      >
        {tl.couch.payoff}
      </div>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingTop: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, transform: `scale(${markIn})` }}>
          <BrandMark size={LAYOUT.markSize} seatProgress={1} fillProgress={fillProgress} />
          <Wordmark size={LAYOUT.wordSize} />
        </div>

        <CallToAction
          action={tl.couch.ctaAction}
          from={CTA_FROM}
          actionSize={LAYOUT.actionSize}
          urlSize={LAYOUT.urlSize}
          marginTop={LAYOUT.marginTop}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
