import React from "react";
import { colors, fonts } from "../theme";

/** "easywed." - lowercase Playfair with the dot in the brand terracotta. */
export const Wordmark: React.FC<{ size: number; color?: string }> = ({ size, color }) => {
  return (
    <span
      style={{
        fontFamily: fonts.heading,
        fontSize: size,
        fontWeight: 600,
        letterSpacing: -size * 0.02,
        color: color ?? colors.ink,
        lineHeight: 1,
      }}
    >
      easywed<span style={{ color: colors.terracotta }}>.</span>
    </span>
  );
};
