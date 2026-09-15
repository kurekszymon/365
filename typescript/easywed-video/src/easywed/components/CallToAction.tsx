import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, shadow } from "../theme";
import { Icon } from "./Icon";

/** The pill lands this long after the action line. */
const URL_DELAY = 12;
/** Once the pill has settled, its arrow nudges toward the address once a second. */
const NUDGE_DELAY = 28;
const NUDGE_PERIOD = 30;
const NUDGE_DISTANCE = 8;

/**
 * The social cuts' closing call to action: the one thing to do next, tied to
 * what the film just showed, then the address as the app's black pill.
 */
export const CallToAction: React.FC<{
  action: string;
  /** Frame the action line starts landing on. */
  from: number;
  actionSize: number;
  urlSize: number;
  marginTop: number;
}> = ({ action, from, actionSize, urlSize, marginTop }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const actionIn = spring({ frame: frame - from, fps, config: { damping: 200 }, durationInFrames: 22 });
  const urlIn = spring({ frame: frame - (from + URL_DELAY), fps, config: { damping: 12, mass: 0.6 } });
  const since = frame - (from + URL_DELAY + NUDGE_DELAY);
  const nudge = since > 0 ? Math.max(0, Math.sin((since / NUDGE_PERIOD) * Math.PI * 2)) * NUDGE_DISTANCE : 0;

  return (
    <div style={{ marginTop, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        style={{
          textAlign: "center",
          fontFamily: fonts.sans,
          fontSize: actionSize,
          fontWeight: 600,
          letterSpacing: -0.4,
          color: colors.ink,
          opacity: actionIn,
          transform: `translateY(${interpolate(actionIn, [0, 1], [14, 0])}px)`,
        }}
      >
        {action}
      </div>

      <div
        style={{
          // The landing page's CTA block is `bg-primary`, not the logo green.
          marginTop: Math.round(actionSize * 0.6),
          display: "flex",
          alignItems: "center",
          gap: Math.round(urlSize * 0.45),
          padding: "22px 40px 22px 52px",
          borderRadius: 999,
          backgroundColor: colors.primary,
          color: colors.primaryInk,
          boxShadow: shadow.chip,
          fontFamily: fonts.sans,
          fontSize: urlSize,
          fontWeight: 600,
          letterSpacing: 0.4,
          opacity: urlIn,
          transform: `scale(${interpolate(urlIn, [0, 1], [0.9, 1])})`,
        }}
      >
        easywed.app
        <div style={{ display: "flex", transform: `translateX(${nudge}px)` }}>
          <Icon name="arrowRight" color={colors.primaryInk} size={urlSize} strokeWidth={2.4} />
        </div>
      </div>
    </div>
  );
};
