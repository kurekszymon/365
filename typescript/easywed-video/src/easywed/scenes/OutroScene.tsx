import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrandMark } from "../components/BrandMark";
import { Wordmark } from "../components/Wordmark";
import { useFormat } from "../format";
import { colors, fonts, shadow } from "../theme";

const FEATURES = [
  "Drag & drop floor plan",
  "CSV & XLSX import",
  "PDF export for printing",
  "Rooms & floors",
  "Plan together",
];

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { tall } = useFormat();

  const markIn = spring({ frame: frame - 2, fps, config: { damping: 13, mass: 0.6 } });
  const titleIn = spring({ frame: frame - 14, fps, config: { damping: 200 }, durationInFrames: 26 });
  const pills = FEATURES.map((_, i) =>
    spring({ frame: frame - (28 + i * 6), fps, config: { damping: 200 }, durationInFrames: 22 }),
  );
  const ctaIn = spring({ frame: frame - 58, fps, config: { damping: 12, mass: 0.6 } });

  return (
    <Backdrop>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, transform: `scale(${markIn})` }}>
          <BrandMark size={tall ? 84 : 96} seatProgress={1} fillProgress={1} />
          <Wordmark size={tall ? 74 : 84} />
        </div>

        <div
          style={{
            marginTop: 46,
            maxWidth: tall ? 900 : 1180,
            textAlign: "center",
            fontFamily: fonts.heading,
            fontSize: tall ? 80 : 92,
            fontWeight: 600,
            letterSpacing: -2,
            lineHeight: 1.08,
            color: colors.ink,
            opacity: titleIn,
            transform: `translateY(${interpolate(titleIn, [0, 1], [26, 0])}px)`,
          }}
        >
          Every guest in the right seat
        </div>

        <div style={{ marginTop: 44, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {FEATURES.map((feature, i) => (
            <div
              key={feature}
              style={{
                padding: "14px 26px",
                borderRadius: 999,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.card,
                fontFamily: fonts.sans,
                fontSize: 26,
                color: colors.ink,
                opacity: pills[i],
                transform: `translateY(${interpolate(pills[i], [0, 1], [18, 0])}px)`,
              }}
            >
              {feature}
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 58,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            opacity: ctaIn,
            transform: `scale(${interpolate(ctaIn, [0, 1], [0.9, 1])})`,
          }}
        >
          <div
            style={{
              // The landing page's CTA block is `bg-primary`, not the logo green.
              padding: "22px 52px",
              borderRadius: 999,
              backgroundColor: colors.primary,
              color: colors.primaryInk,
              boxShadow: shadow.chip,
              fontFamily: fonts.sans,
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: 0.4,
            }}
          >
            easywed.app
          </div>
          <div style={{ fontFamily: fonts.sans, fontSize: 26, color: colors.inkSoft }}>
            Start in guest mode - no sign-up needed.
          </div>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
