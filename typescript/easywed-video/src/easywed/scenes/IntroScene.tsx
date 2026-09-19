import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrandMark } from "../components/BrandMark";
import { Wordmark } from "../components/Wordmark";
import { useFormat } from "../format";
import { tl } from "../i18n";
import { colors, fonts } from "../theme";

/**
 * With a `hook`, the question takes the tagline's place and lands early enough
 * to read by frame 45 - the film's first second and a half - while the logo
 * builds around it as it always has.
 */
const HOOK_FROM = 12;

export const IntroScene: React.FC<{ hook?: string }> = ({ hook }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { tall, type } = useFormat();

  const markIn = spring({ frame, fps, config: { damping: 12, mass: 0.7 } });
  const seatProgress = interpolate(frame, [8, 52], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fillProgress = spring({ frame: frame - 54, fps, config: { damping: 11, mass: 0.5 } });

  const wordIn = spring({ frame: frame - 46, fps, config: { damping: 200 }, durationInFrames: 26 });
  const taglineIn = spring({ frame: frame - 62, fps, config: { damping: 200 }, durationInFrames: 26 });
  const hookIn = spring({ frame: frame - HOOK_FROM, fps, config: { damping: 200 }, durationInFrames: 22 });

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

        {hook ? (
          <div
            style={{
              marginTop: 40,
              maxWidth: tall ? 900 : 1400,
              textAlign: "center",
              opacity: hookIn,
              transform: `translateY(${interpolate(hookIn, [0, 1], [20, 0])}px)`,
              fontFamily: fonts.heading,
              fontSize: type.title,
              fontWeight: 600,
              letterSpacing: -1.5,
              lineHeight: 1.1,
              color: colors.ink,
            }}
          >
            {hook}
          </div>
        ) : (
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
            {tl.demo.tagline}
          </div>
        )}
      </AbsoluteFill>
    </Backdrop>
  );
};
