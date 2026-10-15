import React from "react";
import { AbsoluteFill, Freeze, interpolate, useCurrentFrame } from "remotion";

/** Length of the seam, matching the walkthrough's crossfade. */
export const LOOP_SEAM = 15;

/**
 * Closes a landing-page loop. `TransitionSeries` never wraps last -> first, so
 * the final scene dissolves onto the first scene held at its frame 0 instead.
 * The dissolve completes on the composition's last frame, so the `<video loop>`
 * restarts on the very picture it just showed.
 */
export const LoopSeam: React.FC<{
  /** The scene's own frame the seam starts on - its length less `LOOP_SEAM`. */
  from: number;
  /** The loop's first scene, as it renders at its frame 0. */
  children: React.ReactNode;
}> = ({ from, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [from, from + LOOP_SEAM - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (opacity === 0) return null;

  return (
    <AbsoluteFill style={{ opacity }}>
      <Freeze frame={0}>{children}</Freeze>
    </AbsoluteFill>
  );
};
