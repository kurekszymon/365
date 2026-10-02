import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrandMark } from "../components/BrandMark";
import { CallToAction } from "../components/CallToAction";
import { Wordmark } from "../components/Wordmark";
import { useFormat } from "../format";
import { tl } from "../i18n";
import { colors, fonts } from "../theme";

/**
 * The walkthrough's close. The long walkthrough passes its own headline and
 * action and an empty feature list - the pills hold spent and account-gated
 * lines - so the defaults are the short film's own copy.
 */
export const OutroScene: React.FC<{ title?: string; features?: string[]; action?: string }> = ({
  title = tl.demo.outroTitle,
  features = tl.demo.features,
  action = tl.demo.outroAction,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { tall } = useFormat();

  const markIn = spring({ frame: frame - 2, fps, config: { damping: 13, mass: 0.6 } });
  const titleIn = spring({ frame: frame - 14, fps, config: { damping: 200 }, durationInFrames: 26 });
  const pills = features.map((_, i) =>
    spring({ frame: frame - (28 + i * 6), fps, config: { damping: 200 }, durationInFrames: 22 }),
  );

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
          {title}
        </div>

        {features.length > 0 ? (
          <div style={{ marginTop: 44, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
            {features.map((feature, i) => (
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
        ) : null}

        {/* The one thing to do next, then the pill - the closing shape the
            social cuts already use (`components/CallToAction.tsx`), so the
            longest film ends on an instruction rather than on a note. The
            guest-mode line that sat here belongs in the caption. */}
        <CallToAction
          action={action}
          from={58}
          actionSize={tall ? 36 : 34}
          urlSize={tall ? 38 : 36}
          marginTop={tall ? 52 : 50}
        />
      </AbsoluteFill>
    </Backdrop>
  );
};
