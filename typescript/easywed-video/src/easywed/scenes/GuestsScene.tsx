import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AppFrame } from "../components/AppFrame";
import { SceneLabel } from "../components/SceneLabel";
import { GUESTS } from "../data";
import { useFormat } from "../format";
import { colors, fonts, shadow } from "../theme";

const DIET_COLORS: Record<string, string> = {
  Vegetarian: colors.brandGreen,
  Vegan: colors.brandGreen,
  "Gluten-free": colors.terracotta,
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("");

const GuestRow: React.FC<{ guest: (typeof GUESTS)[number]; enter: number; fontSize: number }> = ({
  guest,
  enter,
  fontSize,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 18,
      padding: "16px 22px",
      borderBottom: `1px solid ${colors.border}`,
      opacity: enter,
      transform: `translateX(${interpolate(enter, [0, 1], [40, 0])}px)`,
    }}
  >
    <div
      style={{
        width: 46,
        height: 46,
        borderRadius: 999,
        backgroundColor: colors.bgDeep,
        color: colors.ink,
        fontFamily: fonts.sans,
        fontSize: 18,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {initials(guest.name)}
    </div>
    <div style={{ fontFamily: fonts.sans, fontSize, color: colors.ink, flex: 1 }}>{guest.name}</div>
    {guest.diet ? (
      <div
        style={{
          padding: "5px 14px",
          borderRadius: 999,
          border: `1px solid ${DIET_COLORS[guest.diet]}`,
          color: DIET_COLORS[guest.diet],
          fontFamily: fonts.sans,
          fontSize: 18,
          fontWeight: 500,
        }}
      >
        {guest.diet}
      </div>
    ) : null}
    <div
      style={{
        width: 150,
        textAlign: "right",
        fontFamily: fonts.sans,
        fontSize: 21,
        color: colors.inkSoft,
      }}
    >
      {guest.table}
    </div>
  </div>
);

const Stat: React.FC<{ value: string; label: string; enter: number; size: number }> = ({
  value,
  label,
  enter,
  size,
}) => (
  <div
    style={{
      flex: 1,
      padding: "22px 26px",
      borderRadius: 20,
      backgroundColor: colors.bg,
      border: `1px solid ${colors.border}`,
      opacity: enter,
      transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
    }}
  >
    <div style={{ fontFamily: fonts.heading, fontSize: size, fontWeight: 600, color: colors.ink }}>
      {value}
    </div>
    <div style={{ marginTop: 4, fontFamily: fonts.sans, fontSize: 21, color: colors.inkSoft }}>{label}</div>
  </div>
);

export const GuestsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { hall, tall, pad, gap, type } = useFormat();

  const rows = GUESTS.map((_, i) =>
    spring({ frame: frame - (34 + i * 6), fps, config: { damping: 200 }, durationInFrames: 22 }),
  );

  const counter = Math.round(
    interpolate(frame, [40, 100], [0, hall.totalSeats], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  const statsIn = [0, 1, 2].map((i) =>
    spring({ frame: frame - (46 + i * 8), fps, config: { damping: 200 }, durationInFrames: 24 }),
  );

  const importIn = spring({ frame: frame - 108, fps, config: { damping: 12, mass: 0.6 } });

  return (
    <AppFrame activeRail="guests">
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: tall ? "column" : "row",
          padding: tall ? `${pad}px 40px 8px` : "34px 40px",
          gap,
          minWidth: 0,
        }}
      >
        <div style={{ width: tall ? "100%" : 540, paddingTop: tall ? 8 : 40, flexShrink: 0 }}>
          <SceneLabel
            step="Step 02"
            title="Add your guests"
            subtitle="Dietary needs, plus-ones and seat assignments live next to every name - no more cross-checking three spreadsheets."
            from={6}
          />

          <div style={{ display: "flex", gap: 16, marginTop: tall ? 26 : 44 }}>
            <Stat value={String(counter)} label="Guests" enter={statsIn[0]} size={type.stat} />
            <Stat value="7" label="Vegetarian" enter={statsIn[1]} size={type.stat} />
            <Stat value="5" label="Plus-ones" enter={statsIn[2]} size={type.stat} />
          </div>

          <div
            style={{
              marginTop: tall ? 22 : 30,
              display: "inline-flex",
              alignItems: "center",
              gap: 16,
              padding: "18px 26px",
              borderRadius: 18,
              backgroundColor: colors.accentSoft,
              color: colors.accent,
              boxShadow: shadow.chip,
              fontFamily: fonts.sans,
              fontSize: type.body,
              fontWeight: 600,
              opacity: importIn,
              transform: `translateY(${interpolate(importIn, [0, 1], [30, 0])}px)`,
            }}
          >
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M12 18v-7M9 14l3-3 3 3" />
            </svg>
            Import from CSV or Excel
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            borderRadius: 22,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.card,
            overflow: "hidden",
            alignSelf: tall ? "stretch" : "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "18px 22px",
              backgroundColor: colors.bg,
              borderBottom: `1px solid ${colors.border}`,
              fontFamily: fonts.sans,
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: colors.inkSoft,
            }}
          >
            <span style={{ flex: 1 }}>Guest</span>
            <span style={{ width: 150, textAlign: "right" }}>Seated at</span>
          </div>
          {GUESTS.map((guest, i) => (
            <GuestRow key={guest.name} guest={guest} enter={rows[i]} fontSize={type.body} />
          ))}
        </div>
      </div>
    </AppFrame>
  );
};
