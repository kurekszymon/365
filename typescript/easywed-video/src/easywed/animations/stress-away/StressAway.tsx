import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { colors, fonts } from "../../theme";

/**
 * A 9:16 Reel: the three-line motto and the plan slide's signature
 * (`.claude/skills/plan-slide/template.html`) hold still, and only the table
 * moves. It slides in empty from the left, seats 12 and 3 o'clock first so it
 * becomes the logo, then the other six one at a time in a shuffled order, and
 * slides out full to the right - both ends are an empty stage, so a replay
 * reads as the next table coming in.
 */
/** Two lines; the first ends on the accent, set in italic terracotta. */
const LEAD = "One guest";
const ACCENT = "per day";
const TAIL = "keeps the stress away";

const SLIDE_IN_TO = 18;
/** Seat indices clockwise from 12 o'clock: the logo's two, then the rest shuffled. */
const FILL_ORDER = [0, 2, 5, 1, 4, 7, 3, 6];
/** The logo's two close together, a beat to read it, then the rest in quick succession. */
const FILL_AT = [28, 46, 76, 84, 92, 100, 108, 116];
/** Once the last guest's bounce has settled. */
const SLIDE_OUT_FROM = 130;

export const STRESS_AWAY_DURATION = 148;

/** Clear of the Reels chrome (top bar; caption and buttons over the bottom ~20%) and inside the feed's centred 4:5 crop (y 285-1635). */
const PAD_TOP = 320;
const PAD_BOTTOM = 360;
const TEXT = 88;
const MARK = 560;
const SIG_MARK = 72;
const SIG_TEXT = 54;

const TABLE_RADIUS = 33;
const ORBIT = 47;

const Mark: React.FC<{ size: number; fills: number[] }> = ({ size, fills }) => (
  <svg
    width={size}
    height={size}
    viewBox="-60 -60 120 120"
    style={{ overflow: "visible" }}
  >
    <circle r={TABLE_RADIUS} fill={colors.brandGreen} />
    {fills.map((fill, i) => {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const cx = Math.cos(angle) * ORBIT;
      const cy = Math.sin(angle) * ORBIT;
      const settled = Math.min(fill, 1);
      return (
        <g key={i}>
          {/* A soft ring that breathes out as the guest sits down. */}
          <circle
            cx={cx}
            cy={cy}
            r={10 + settled * 8}
            fill="none"
            stroke={colors.terracotta}
            strokeWidth={1.5}
            opacity={settled > 0 && settled < 1 ? (1 - settled) * 0.6 : 0}
          />
          <circle
            cx={cx}
            cy={cy}
            r={9 + fill}
            fill={interpolateColors(
              settled,
              [0, 1],
              [colors.brandGreenSoft, colors.terracotta],
            )}
          />
        </g>
      );
    })}
  </svg>
);

const SIGNATURE_FILLS = [1, 0, 1, 0, 0, 0, 0, 0];

export const StressAway: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  // Off-canvas on both sides: half the canvas plus half the mark, with room for the ripple.
  const offstage = width / 2 + MARK / 2 + 40;
  const slideIn = interpolate(frame, [0, SLIDE_IN_TO], [-offstage, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const slideOut = interpolate(
    frame,
    [SLIDE_OUT_FROM, STRESS_AWAY_DURATION - 1],
    [0, offstage],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.cubic),
    },
  );

  const fills = Array.from({ length: 8 }, (_, seat) =>
    spring({
      frame: frame - FILL_AT[FILL_ORDER.indexOf(seat)],
      fps,
      config: { damping: 9, mass: 0.5 },
    }),
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
          <div>
            {LEAD}{" "}
            <span style={{ fontStyle: "italic", color: colors.terracotta }}>
              {ACCENT}
            </span>
          </div>
          <div>{TAIL}</div>
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
            <Mark size={MARK} fills={fills} />
          </div>
        </div>

        <div
          style={{ display: "flex", alignItems: "center", gap: SIG_TEXT * 0.4 }}
        >
          <Mark size={SIG_MARK} fills={SIGNATURE_FILLS} />
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
