import React from "react";
import { AbsoluteFill } from "remotion";
import { colors } from "../theme";

/**
 * The cream page with the two soft green blooms from the app icon.
 */
export const Backdrop: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(680px 680px at 88% -8%, ${colors.brandGreenMist} 0%, rgba(217, 234, 217, 0) 62%),
            radial-gradient(560px 560px at 6% 106%, #e8f3e6 0%, rgba(232, 243, 230, 0) 60%)`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
