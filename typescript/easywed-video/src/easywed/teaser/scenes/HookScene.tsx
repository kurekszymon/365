import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { useFormat } from "../../format";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";

/** Revealed word by word, so the question lands on "4?" rather than all at once. */
const QUESTION = tl.teaser.question;

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { tall } = useFormat();

  const words = QUESTION.map((_, i) =>
    spring({ frame: frame - (2 + i * 5), fps, config: { damping: 200 }, durationInFrames: 20 }),
  );
  const stingIn = spring({ frame: frame - 46, fps, config: { damping: 200 }, durationInFrames: 24 });

  return (
    <Backdrop>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: tall ? "0 70px" : "0 160px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            columnGap: tall ? 20 : 26,
            rowGap: tall ? 6 : 10,
            fontFamily: fonts.heading,
            fontSize: tall ? 96 : 116,
            fontWeight: 600,
            letterSpacing: -2.5,
            lineHeight: 1.1,
            color: colors.ink,
            textAlign: "center",
          }}
        >
          {QUESTION.map((word, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: words[i],
                transform: `translateY(${interpolate(words[i], [0, 1], [34, 0])}px)`,
              }}
            >
              {word}
            </span>
          ))}
        </div>

        <div
          style={{
            marginTop: tall ? 40 : 44,
            fontFamily: fonts.sans,
            fontSize: tall ? 38 : 40,
            color: colors.terracotta,
            letterSpacing: 0.4,
            opacity: stingIn,
            transform: `translateY(${interpolate(stingIn, [0, 1], [18, 0])}px)`,
          }}
        >
          {tl.teaser.sting}
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
