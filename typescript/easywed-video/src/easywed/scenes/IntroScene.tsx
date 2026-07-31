import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrandMark } from "../components/BrandMark";
import { Wordmark } from "../components/Wordmark";
import { useFormat } from "../format";
import { colors, fonts } from "../theme";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { tall } = useFormat();

  const markIn = spring({ frame, fps, config: { damping: 12, mass: 0.7 } });
  const seatProgress = interpolate(frame, [8, 52], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fillProgress = spring({ frame: frame - 54, fps, config: { damping: 11, mass: 0.5 } });

  const wordIn = spring({ frame: frame - 46, fps, config: { damping: 200 }, durationInFrames: 26 });
  const taglineIn = spring({ frame: frame - 62, fps, config: { damping: 200 }, durationInFrames: 26 });

  return (
    <Backdrop>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `scale(${markIn})` }}>
          <BrandMark size={tall ? 260 : 300} seatProgress={seatProgress} fillProgress={fillProgress} />
        </div>

        <div
          style={{
            marginTop: 64,
            opacity: wordIn,
            transform: `translateY(${interpolate(wordIn, [0, 1], [28, 0])}px)`,
          }}
        >
          <Wordmark size={tall ? 108 : 128} />
        </div>

        <div
          style={{
            marginTop: 26,
            opacity: taglineIn,
            transform: `translateY(${interpolate(taglineIn, [0, 1], [20, 0])}px)`,
            fontFamily: fonts.sans,
            fontSize: tall ? 32 : 36,
            letterSpacing: 0.5,
            color: colors.inkSoft,
          }}
        >
          Wedding planning made easy.
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
