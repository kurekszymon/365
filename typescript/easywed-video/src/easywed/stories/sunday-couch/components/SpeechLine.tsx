import React from "react";
import { CaptionLine } from "../../../components/CaptionLine";
import { colors } from "../../../theme";

/** The two voices' quiet tones: the one who starts the evening, and the one who answers. */
const TONE = { left: colors.ink, right: colors.brandGreen };

/** A line never runs the full width, so the two sides read as two people taking turns. */
const MAX_WIDTH = "84%";

/**
 * One of the couple's lines: `CaptionLine`'s narration style, pushed to its
 * voice's side of the frame and set in that voice's tone. No names and no
 * faces - the side and the tone are the whole of who is speaking.
 */
export const SpeechLine: React.FC<{
  text: string;
  side: "left" | "right";
  enter: number;
  exit: number;
  size: number;
}> = ({ text, side, enter, exit, size }) => (
  <div style={{ display: "flex", justifyContent: side === "left" ? "flex-start" : "flex-end" }}>
    <div style={{ maxWidth: MAX_WIDTH }}>
      <CaptionLine text={text} enter={enter} exit={exit} size={size} align={side} color={TONE[side]} />
    </div>
  </div>
);
