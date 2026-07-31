import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useFormat } from "../format";
import { colors, fonts } from "../theme";

type Props = {
  step: string;
  title: string;
  subtitle: string;
  /** Frame the label slides in on. */
  from?: number;
};

export const SceneLabel: React.FC<Props> = ({ step, title, subtitle, from = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { type } = useFormat();

  const enter = spring({ frame: frame - from, fps, config: { damping: 200 }, durationInFrames: 30 });
  const x = interpolate(enter, [0, 1], [-60, 0]);

  return (
    <div style={{ opacity: enter, transform: `translateX(${x}px)` }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 18px",
          borderRadius: 999,
          backgroundColor: colors.accentSoft,
          color: colors.accent,
          fontFamily: fonts.sans,
          fontSize: type.step,
          fontWeight: 600,
          letterSpacing: 1.6,
          textTransform: "uppercase",
        }}
      >
        {step}
      </div>
      <div
        style={{
          marginTop: 18,
          fontFamily: fonts.heading,
          fontSize: type.title,
          fontWeight: 600,
          color: colors.ink,
          letterSpacing: -1,
          lineHeight: 1.05,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 14,
          maxWidth: type.subtitleWidth,
          fontFamily: fonts.sans,
          fontSize: type.subtitle,
          lineHeight: 1.45,
          color: colors.inkSoft,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
};
