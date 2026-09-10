import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { BrandMark } from "../../components/BrandMark";
import { Wordmark } from "../../components/Wordmark";
import { useFormat } from "../../format";
import { colors, fonts, shadow } from "../../theme";

export const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { tall } = useFormat();

  const markIn = spring({ frame, fps, config: { damping: 13, mass: 0.6 } });
  // The mark's two seats fill on the cut, echoing the room that just filled.
  const fillProgress = spring({ frame: frame - 10, fps, config: { damping: 11, mass: 0.5 } });
  const titleIn = spring({ frame: frame - 16, fps, config: { damping: 200 }, durationInFrames: 26 });
  const ctaIn = spring({ frame: frame - 36, fps, config: { damping: 12, mass: 0.6 } });
  const noteIn = spring({ frame: frame - 52, fps, config: { damping: 200 }, durationInFrames: 22 });

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

        <div
          style={{
            marginTop: tall ? 52 : 56,
            padding: "22px 52px",
            borderRadius: 999,
            backgroundColor: colors.primary,
            color: colors.primaryInk,
            boxShadow: shadow.chip,
            fontFamily: fonts.sans,
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: 0.4,
            opacity: ctaIn,
            transform: `scale(${interpolate(ctaIn, [0, 1], [0.9, 1])})`,
          }}
        >
          easywed.app
        </div>

        <div
          style={{
            marginTop: 22,
            fontFamily: fonts.sans,
            fontSize: 27,
            color: colors.inkSoft,
            opacity: noteIn,
          }}
        >
          Za darmo, bez zakładania konta.
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
