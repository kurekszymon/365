import React from "react";
import { Easing, interpolate } from "remotion";
import { Icon } from "../../components/Icon";
import { tl } from "../../i18n";
import { colors, fonts, shadow } from "../../theme";
import { TICK, TICKS } from "../script";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * The evening's clock in the corner of the frame - *Niedziela, 19:40* - and
 * the one piece of the cut that is not the app: story framing, so it is a
 * plain card pill rather than any of the planner's chrome. On each tick the old
 * time rolls up and out and the new one rolls in under it; the day stays put.
 */
export const TimeChip: React.FC<{ frame: number; size: number }> = ({ frame, size }) => {
  const ticks: readonly number[] = TICKS;
  const current = ticks.reduce((last, at, i) => (frame >= at ? i : last), 0);
  const tickedAt = ticks[current] ?? 0;
  const roll =
    current > 0 ? interpolate(frame, [tickedAt, tickedAt + TICK], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) : 1;
  const lineHeight = size * 1.2;

  const time = (text: string, offset: number, opacity: number) => (
    <span
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: `translateY(${offset * lineHeight}px)`,
        opacity,
      }}
    >
      {text}
    </span>
  );

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.4,
        padding: `${size * 0.36}px ${size * 0.66}px ${size * 0.36}px ${size * 0.5}px`,
        borderRadius: 999,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.card,
        boxShadow: shadow.chip,
        fontFamily: fonts.sans,
        fontSize: size,
        lineHeight: `${lineHeight}px`,
        fontWeight: 600,
        color: colors.ink,
      }}
    >
      <Icon name="clock" color={colors.terracotta} size={size * 1.05} strokeWidth={2.2} />
      <span style={{ color: colors.inkSoft, fontWeight: 500 }}>{`${tl.couch.day},`}</span>
      {/* Sized by the time it is rolling to, so the pill never jumps mid-roll. */}
      <span
        style={{
          position: "relative",
          display: "inline-block",
          height: lineHeight,
          overflow: "hidden",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span style={{ visibility: "hidden" }}>{tl.couch.times[current]}</span>
        {current > 0 && roll < 1 ? time(tl.couch.times[current - 1], -roll, 1 - roll) : null}
        {time(tl.couch.times[current], 1 - roll, roll)}
      </span>
    </div>
  );
};
