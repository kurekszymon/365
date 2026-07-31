import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AppFrame } from "../components/AppFrame";
import { HallCanvas } from "../components/HallCanvas";
import { SceneLabel } from "../components/SceneLabel";
import { GUESTS } from "../data";
import { useFormat } from "../format";
import { allSeats } from "../geometry";
import { colors, fonts } from "../theme";

const CHIP_START = 34;
const CHIP_STAGGER = 13;
const CHIP_FLIGHT = 26;
const CHIP_COUNT = 9;

export const SeatingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { hall, tall, pad, gap, type } = useFormat();

  const seats = allSeats(hall.tables);
  // Spread the flying chips across the room rather than filling one table.
  const chipTargets = Array.from({ length: CHIP_COUNT }, (_, i) =>
    Math.floor((i * seats.length) / CHIP_COUNT),
  );

  const seatsBefore = hall.tables.map((_, i) =>
    hall.tables.slice(0, i).reduce((sum, t) => sum + t.seats, 0),
  );

  const seated = interpolate(frame, [CHIP_START, 196], [0, hall.totalSeats], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });

  const seatFill = hall.tables.map((table, i) => {
    const filled = Math.min(Math.max(seated - seatsBefore[i], 0), table.seats);
    return filled / table.seats;
  });

  const progress = seated / hall.totalSeats;
  const barIn = spring({ frame: frame - 20, fps, config: { damping: 200 }, durationInFrames: 24 });

  const chipWidth = tall ? 150 : 180;

  return (
    <AppFrame activeRail="plan">
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
            step="Step 03"
            title="Seat everyone"
            subtitle="Drag guests onto seats, balance the tables, and export a printable plan for the venue."
            from={4}
          />

          <div
            style={{
              marginTop: tall ? 26 : 48,
              padding: "26px 28px",
              borderRadius: 22,
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              opacity: barIn,
              transform: `translateY(${interpolate(barIn, [0, 1], [24, 0])}px)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span
                style={{
                  fontFamily: fonts.heading,
                  fontSize: type.stat,
                  fontWeight: 600,
                  color: colors.ink,
                }}
              >
                {Math.round(seated)}
              </span>
              <span style={{ fontFamily: fonts.sans, fontSize: type.body, color: colors.inkSoft }}>
                of {hall.totalSeats} guests seated
              </span>
            </div>
            <div
              style={{
                marginTop: 18,
                height: 16,
                borderRadius: 999,
                backgroundColor: colors.bgDeep,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress * 100}%`,
                  height: "100%",
                  borderRadius: 999,
                  backgroundColor: colors.terracotta,
                }}
              />
            </div>
            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 26,
                fontFamily: fonts.sans,
                fontSize: 20,
                color: colors.inkSoft,
              }}
            >
              <Legend color={colors.seatEmpty} label="Free seat" />
              <Legend color={colors.seatFilled} label="Taken" />
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <HallCanvas
            hall={hall}
            outline={1}
            floor={1}
            tableIn={hall.tables.map(() => 1)}
            seatFill={seatFill}
          >
            {chipTargets.map((seatIndex, i) => {
              const start = CHIP_START + i * CHIP_STAGGER;
              const t = interpolate(frame, [start, start + CHIP_FLIGHT], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.inOut(Easing.cubic),
              });
              if (t <= 0 || t >= 1) {
                return null;
              }
              const target = seats[seatIndex];
              // Chips slide in from the guest list, just off the near wall.
              const from = tall
                ? { x: 60 + i * 70, y: -20 }
                : { x: -20, y: 90 + i * 56 };
              const x = interpolate(t, [0, 1], [from.x, target.x]);
              // A gentle arc rather than a straight line.
              const y = interpolate(t, [0, 1], [from.y, target.y]) - Math.sin(t * Math.PI) * 70;
              const opacity = interpolate(t, [0, 0.2, 0.86, 1], [0, 1, 1, 0]);
              const name = GUESTS[i % GUESTS.length].name;

              return (
                <g key={seatIndex} transform={`translate(${x} ${y})`} opacity={opacity}>
                  <rect
                    x={-chipWidth / 2}
                    y={-22}
                    width={chipWidth}
                    height={44}
                    rx={22}
                    fill={colors.card}
                    stroke={colors.terracotta}
                    strokeWidth={2.5}
                  />
                  <text
                    x={0}
                    y={7}
                    textAnchor="middle"
                    fontFamily={fonts.sans}
                    fontSize={tall ? 19 : 22}
                    fontWeight={500}
                    fill={colors.ink}
                  >
                    {name}
                  </text>
                </g>
              );
            })}
          </HallCanvas>
        </div>
      </div>
    </AppFrame>
  );
};

const Legend: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
    <span style={{ width: 16, height: 16, borderRadius: 999, backgroundColor: color }} />
    {label}
  </span>
);
