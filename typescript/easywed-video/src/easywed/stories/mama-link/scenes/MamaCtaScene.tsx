import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../../../components/Backdrop";
import { BrandMark } from "../../../components/BrandMark";
import { CallToAction } from "../../../components/CallToAction";
import { Wordmark } from "../../../components/Wordmark";
import { tl } from "../../../i18n";
import { colors, fonts } from "../../../theme";
import { MAMA_STARTS } from "../timeline";
import { PhoneShot } from "./MamaPhoneScene";

/**
 * Mum's phone recedes behind the page and the payoff lands over it, then the
 * mark, the wordmark and the action - keep-apart's close. Nothing moves until
 * the cut is over: the beat before draws the same phone, and a crossfade
 * between two poses of it would ghost.
 */
const RECEDE_FROM = 8;
const RECEDE_OVER = 22;
const PAYOFF_FROM = 12;
/** The payoff stays up; the action lands under it with 68 frames left - past ten a word. */
const MARK_FROM = 28;
const CTA_FROM = 40;

/**
 * How far back the phone goes, how far it drops - below the payoff, so its
 * address bar never reads through the line - and how much of it is left
 * showing under the page.
 */
const RECEDE_SCALE = 0.9;
const RECEDE_DROP = 240;
const RECEDE_LEFT = 0.05;

const LAYOUT = { padX: 48, payoffTop: 330, payoffSize: 84, markSize: 104, wordSize: 92, actionSize: 44, urlSize: 42, marginTop: 64 };

export const MamaCtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const recede = spring({ frame: frame - RECEDE_FROM, fps, config: { damping: 200 }, durationInFrames: RECEDE_OVER });
  const payoffIn = spring({ frame: frame - PAYOFF_FROM, fps, config: { damping: 200 }, durationInFrames: 20 });
  const markIn = spring({ frame: frame - MARK_FROM, fps, config: { damping: 13, mass: 0.6 } });
  // The mark's two seats fill as it lands.
  const fillProgress = spring({ frame: frame - (MARK_FROM + 10), fps, config: { damping: 11, mass: 0.5 } });

  return (
    <Backdrop>
      <AbsoluteFill
        style={{
          transform: `scale(${interpolate(recede, [0, 1], [1, RECEDE_SCALE])}) translateY(${interpolate(recede, [0, 1], [0, RECEDE_DROP])}px)`,
        }}
      >
        <PhoneShot frame={frame + MAMA_STARTS.cta} />
      </AbsoluteFill>

      {/* The page takes the phone's place, leaving just enough of it to read as the same screen. */}
      <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: interpolate(recede, [0, 1], [0, 1 - RECEDE_LEFT]) }} />

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
        {tl.mama.payoff}
      </div>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingTop: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, transform: `scale(${markIn})` }}>
          <BrandMark size={LAYOUT.markSize} seatProgress={1} fillProgress={fillProgress} />
          <Wordmark size={LAYOUT.wordSize} />
        </div>

        <CallToAction
          action={tl.mama.ctaAction}
          from={CTA_FROM}
          actionSize={LAYOUT.actionSize}
          urlSize={LAYOUT.urlSize}
          marginTop={LAYOUT.marginTop}
        />
      </AbsoluteFill>
    </Backdrop>
  );
};
