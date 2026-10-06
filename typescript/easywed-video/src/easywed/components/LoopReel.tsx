import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fonts } from "../theme";
import { Backdrop } from "./Backdrop";
import { TableMark } from "./TableMark";

/**
 * The 9:16 brand loops' stage, lifted from `StressAway`: the motto on top and
 * the plan slide's signature (`.claude/skills/plan-slide/template.html`) at
 * the bottom hold still, and only what sits between them moves. It slides in
 * from the left over the first `LOOP_SLIDE` frames and out to the right over
 * the last, ending off-canvas on the final frame - both ends are the same
 * empty stage, so a replay reads as the next table coming in.
 */

/** A motto line's runs, set with a space between them; an `accent` run is in italic terracotta. */
export type MottoPart = string | { accent: string };
export type Motto = MottoPart[][];

/** Frames the stage takes to slide in, and again to slide out. */
export const LOOP_SLIDE = 18;
/** The table mark's size on the stage. */
export const LOOP_MARK = 560;

/** Clear of the Reels chrome (top bar; caption and buttons over the bottom ~20%) and inside the feed's centred 4:5 crop (y 285-1635). */
const PAD_TOP = 320;
const PAD_BOTTOM = 360;
const TEXT = 88;
const SIG_MARK = 72;
const SIG_TEXT = 54;

/** The logo itself: 12 and 3 o'clock taken. */
const SIGNATURE_FILLS = [1, 0, 1, 0, 0, 0, 0, 0];

export const LoopReel: React.FC<{
  motto: Motto;
  /** The composition's length; the slide out ends on its last frame. */
  durationInFrames: number;
  /** What slides through - the mark, and anything that travels with it. */
  children: React.ReactNode;
}> = ({ motto, durationInFrames, children }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  // Off-canvas on both sides: half the canvas plus half the mark, with room for the ripple.
  const offstage = width / 2 + LOOP_MARK / 2 + 40;
  const slideIn = interpolate(frame, [0, LOOP_SLIDE], [-offstage, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const slideOut = interpolate(
    frame,
    [durationInFrames - LOOP_SLIDE, durationInFrames - 1],
    [0, offstage],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.cubic),
    },
  );

  return (
    <Backdrop>
      <AbsoluteFill
        style={{
          alignItems: "center",
          padding: `${PAD_TOP}px 32px ${PAD_BOTTOM}px`,
          boxSizing: "border-box",
          color: colors.ink,
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontFamily: fonts.heading,
            fontWeight: 400,
            fontSize: TEXT,
            lineHeight: 1.18,
            letterSpacing: "0.005em",
          }}
        >
          {motto.map((line, i) => (
            <div key={i}>
              {line.map((part, j) => (
                <React.Fragment key={j}>
                  {j > 0 ? " " : null}
                  {typeof part === "string" ? (
                    part
                  ) : (
                    <span
                      style={{ fontStyle: "italic", color: colors.terracotta }}
                    >
                      {part.accent}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ transform: `translateX(${slideIn + slideOut}px)` }}>
            {children}
          </div>
        </div>

        <div
          style={{ display: "flex", alignItems: "center", gap: SIG_TEXT * 0.4 }}
        >
          <TableMark size={SIG_MARK} fills={SIGNATURE_FILLS} />
          <span
            style={{
              fontFamily: fonts.heading,
              fontWeight: 600,
              fontSize: SIG_TEXT,
              color: colors.ink,
              letterSpacing: "-0.005em",
              lineHeight: 1,
              transform: "translateY(-0.15em)",
            }}
          >
            easywed.
          </span>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
