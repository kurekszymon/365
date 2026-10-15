import React from "react";
import { interpolate } from "remotion";
import { colors, fonts } from "../theme";

/**
 * A short line of story over the product, lighter than `SceneLabel`: no step
 * pill and no subtitle, set in the UI face rather than the heading one, so it
 * reads as narration beside a hook or payoff in Playfair. The story cuts share
 * it. It is driven by progress values rather than a frame of its own, so a
 * film that runs every scene from one clock can place its lines on that clock.
 */
export const CaptionLine: React.FC<{
  text: string;
  /** Entrance, 0..1: a fade and a short rise. */
  enter: number;
  /** Exit, 0..1: fades back out where it stands. */
  exit?: number;
  size: number;
  align?: "left" | "center" | "right";
  color?: string;
}> = ({ text, enter, exit = 0, size, align = "center", color = colors.ink }) => (
  <div
    style={{
      fontFamily: fonts.sans,
      fontSize: size,
      fontWeight: 500,
      lineHeight: 1.25,
      letterSpacing: -0.5,
      color,
      textAlign: align,
      opacity: enter * (1 - exit),
      transform: `translateY(${interpolate(enter, [0, 1], [18, 0])}px)`,
    }}
  >
    {text}
  </div>
);
