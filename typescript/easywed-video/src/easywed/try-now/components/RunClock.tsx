import React from "react";
import { interpolate } from "remotion";
import { Icon } from "../../components/Icon";
import { colors, fonts } from "../../theme";

/**
 * The speedrun's stopwatch: a chip in the top-right, level with the series
 * tag, reading `m:ss` in even-width digits. It is the film's own clock - the
 * caller passes whole seconds read off `(frame - CLOCK_START) / fps` - so it
 * cannot drift from what the viewer watches. Running, it carries the accent's
 * dot; stopped, the ink's check, and it pulses once.
 */
export const RunClock: React.FC<{
  seconds: number;
  running: boolean;
  stopped: boolean;
  /** The stop's pulse, 0..1..0. */
  pulse: number;
  opacity: number;
}> = ({ seconds, running, stopped, pulse, opacity }) => {
  const shown = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <div
      style={{
        position: "absolute",
        right: 48,
        top: 64,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 26px 10px 20px",
        borderRadius: 999,
        border: `1px solid ${stopped ? colors.primary : colors.border}`,
        backgroundColor: stopped ? colors.primary : colors.card,
        color: stopped ? colors.primaryInk : colors.ink,
        boxShadow: "0 6px 18px rgba(60, 50, 40, 0.14)",
        fontFamily: fonts.sans,
        fontSize: 40,
        fontWeight: 700,
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: -0.5,
        opacity,
        transform: `scale(${interpolate(pulse, [0, 1], [1, 1.14])})`,
        transformOrigin: "right center",
      }}
    >
      {stopped ? (
        <Icon name="check" color={colors.primaryInk} size={30} strokeWidth={2.6} />
      ) : (
        <Icon name="clock" color={running ? colors.accent : colors.inkSoft} size={30} strokeWidth={2.4} />
      )}
      {shown}
    </div>
  );
};
