import React from "react";
import { interpolate } from "remotion";
import { colors, shadow } from "../../theme";

/**
 * Mum's phone: a plain handset with no maker's shape to it - rounded corners,
 * a dark bezel and a camera pill - so it reads as any phone. The screen is
 * laid out in CSS pixels at a phone's width, and the caller scales the whole.
 */
export const PHONE = {
  width: 390,
  height: 800,
  bezel: 12,
  radius: 54,
  /** The strip under the camera pill that every screen leaves clear. */
  safeTop: 40,
  /** `env(safe-area-inset-bottom)`: what the rounded corners and the home bar take off the bottom. */
  safeBottom: 22,
};

export const PHONE_OUTER = {
  width: PHONE.width + PHONE.bezel * 2,
  height: PHONE.height + PHONE.bezel * 2,
};

export const PhoneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      width: PHONE_OUTER.width,
      height: PHONE_OUTER.height,
      boxSizing: "border-box",
      padding: PHONE.bezel,
      borderRadius: PHONE.radius + PHONE.bezel,
      backgroundColor: colors.ink,
      boxShadow: `${shadow.card}, inset 0 0 0 2px rgba(255, 255, 255, 0.08)`,
    }}
  >
    <div
      style={{
        position: "relative",
        width: PHONE.width,
        height: PHONE.height,
        borderRadius: PHONE.radius,
        overflow: "hidden",
        backgroundColor: colors.bg,
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          top: 11,
          left: PHONE.width / 2 - 46,
          width: 92,
          height: 26,
          borderRadius: 999,
          backgroundColor: colors.ink,
        }}
      />
    </div>
  </div>
);

/** How long a touch shows before it lands, and how long its ring takes to spread. */
const TOUCH_LEAD = 5;
const RIPPLE_OVER = 12;

/**
 * A thumb on the glass: a soft dot that settles where it will land, then a
 * ring spreading out from it as the tap lands on `at` - the touch indicator a
 * screen recording shows. Drawn in screen pixels, centred on `x`/`y`.
 */
export const Touch: React.FC<{ frame: number; at: number; x: number; y: number }> = ({ frame, at, x, y }) => {
  if (frame < at - TOUCH_LEAD || frame > at + RIPPLE_OVER) return null;
  const dot =
    interpolate(frame, [at - TOUCH_LEAD, at - 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    interpolate(frame, [at + 2, at + 8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const spread = interpolate(frame, [at, at + RIPPLE_OVER], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ring = 22 + spread * 26;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x - 22,
          top: y - 22,
          width: 44,
          height: 44,
          borderRadius: 999,
          backgroundColor: "rgba(36, 31, 26, 0.22)",
          opacity: dot,
          transform: `scale(${interpolate(dot, [0, 1], [1.3, 1])})`,
        }}
      />
      {frame >= at ? (
        <div
          style={{
            position: "absolute",
            left: x - ring,
            top: y - ring,
            width: ring * 2,
            height: ring * 2,
            borderRadius: 999,
            border: "3px solid rgba(36, 31, 26, 0.3)",
            opacity: 1 - spread,
          }}
        />
      ) : null}
    </>
  );
};
