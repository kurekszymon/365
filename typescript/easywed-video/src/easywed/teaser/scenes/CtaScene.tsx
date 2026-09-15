import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { BrandMark } from "../../components/BrandMark";
import { CallToAction } from "../../components/CallToAction";
import { Wordmark } from "../../components/Wordmark";
import { useFormat } from "../../format";
import { colors, fonts } from "../../theme";

/** The action line lands once the title has settled; the pill follows it. */
const CTA_FROM = 36;

export const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { tall } = useFormat();

  const markIn = spring({ frame, fps, config: { damping: 13, mass: 0.6 } });
  // The mark's two seats fill on the cut, echoing the room that just filled.
  const fillProgress = spring({ frame: frame - 10, fps, config: { damping: 11, mass: 0.5 } });
  const titleIn = spring({ frame: frame - 16, fps, config: { damping: 200 }, durationInFrames: 26 });

  return (
    <Backdrop>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 60px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            transform: `scale(${markIn})`,
          }}
        >
          <BrandMark size={tall ? 96 : 108} seatProgress={1} fillProgress={fillProgress} />
          <Wordmark size={tall ? 84 : 96} />
        </div>

        <div
          style={{
            marginTop: tall ? 44 : 48,
            maxWidth: tall ? 880 : 1200,
            textAlign: "center",
            fontFamily: fonts.heading,
            fontSize: tall ? 74 : 84,
            fontWeight: 600,
            letterSpacing: -2,
            lineHeight: 1.08,
            color: colors.ink,
            opacity: titleIn,
            transform: `translateY(${interpolate(titleIn, [0, 1], [26, 0])}px)`,
          }}
        >
          Rozsadź gości w jeden wieczór
        </div>

        <CallToAction
          action="Zacznij dziś wieczorem"
          from={CTA_FROM}
          actionSize={tall ? 46 : 42}
          urlSize={38}
          marginTop={tall ? 52 : 56}
        />
      </AbsoluteFill>
    </Backdrop>
  );
};
