import React from "react";
import { AbsoluteFill, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../../components/Backdrop";
import { colors, fonts } from "../../theme";

/**
 * An IG post in 4:5, 1:1 and 9:16: the three-line motto, then the logo's table taking its
 * guests one at a time - 12 and 3 o'clock first, so it becomes the real mark,
 * then the other six in a shuffled order - and the plan slide's signature
 * underneath (`.claude/skills/plan-slide/template.html`).
 */
const LINES = ["One guest seated", "per day", "keeps the stress away"];
const LINE_FROM = 8;
const LINE_STEP = 16;

const MARK_FROM = 62;
/** Seat indices clockwise from 12 o'clock: the logo's two, then the rest shuffled. */
const FILL_ORDER = [0, 2, 5, 1, 4, 7, 3, 6];
const FILL_AT = [96, 118, 156, 170, 184, 198, 212, 226];
const SIGNATURE_FROM = 252;

export const STRESS_AWAY_DURATION = 330;

/**
 * Per format, keyed by height. The 4:5 keeps the plan slide's 120/160 padding
 * (carousel dots cover the bottom ~8%); the 9:16 keeps clear of the Reels
 * chrome - the top bar, and the caption and buttons over the bottom ~20%.
 */
const LAYOUTS: Record<number, { padTop: number; padBottom: number; text: number; mark: number; sigMark: number; sigText: number }> = {
  1080: { padTop: 80, padBottom: 90, text: 66, mark: 340, sigMark: 56, sigText: 42 },
  1350: { padTop: 120, padBottom: 160, text: 78, mark: 440, sigMark: 62, sigText: 46 },
  1920: { padTop: 280, padBottom: 400, text: 88, mark: 560, sigMark: 72, sigText: 54 },
};

const TABLE_RADIUS = 33;
const ORBIT = 47;

const Mark: React.FC<{ size: number; fills: number[] }> = ({ size, fills }) => (
  <svg width={size} height={size} viewBox="-60 -60 120 120" style={{ overflow: "visible" }}>
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
            fill={interpolateColors(settled, [0, 1], [colors.brandGreenSoft, colors.terracotta])}
          />
        </g>
      );
    })}
  </svg>
);

export const StressAway: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const layout = LAYOUTS[height] ?? LAYOUTS[1350];

  const markIn = spring({ frame: frame - MARK_FROM, fps, config: { damping: 14, mass: 0.7 } });
  const fills = Array.from({ length: 8 }, (_, seat) =>
    spring({ frame: frame - FILL_AT[FILL_ORDER.indexOf(seat)], fps, config: { damping: 9, mass: 0.5 } }),
  );
  const signature = spring({ frame: frame - SIGNATURE_FROM, fps, config: { damping: 200 } });

  return (
    <Backdrop>
      <AbsoluteFill
        style={{
          alignItems: "center",
          padding: `${layout.padTop}px 32px ${layout.padBottom}px`,
          boxSizing: "border-box",
          color: colors.ink,
        }}
      >
        <div style={{ textAlign: "center" }}>
          {LINES.map((line, i) => {
            const t = spring({ frame: frame - (LINE_FROM + i * LINE_STEP), fps, config: { damping: 200 } });
            return (
              <div
                key={line}
                style={{
                  fontFamily: fonts.heading,
                  fontWeight: 400,
                  fontStyle: i === 1 ? "italic" : "normal",
                  fontSize: layout.text,
                  lineHeight: 1.18,
                  letterSpacing: "0.005em",
                  color: i === 1 ? colors.terracotta : colors.ink,
                  opacity: t,
                  transform: `translateY(${interpolate(t, [0, 1], [28, 0])}px)`,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: `scale(${markIn})`, opacity: Math.min(markIn * 1.5, 1) }}>
            <Mark size={layout.mark} fills={fills} />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: layout.sigText * 0.4,
            opacity: signature,
            transform: `translateY(${interpolate(signature, [0, 1], [16, 0])}px)`,
          }}
        >
          <Mark size={layout.sigMark} fills={[1, 0, 1, 0, 0, 0, 0, 0]} />
          <span
            style={{
              fontFamily: fonts.heading,
              fontWeight: 600,
              fontSize: layout.sigText,
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
