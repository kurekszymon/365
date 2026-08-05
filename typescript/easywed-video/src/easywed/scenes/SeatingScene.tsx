import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AppFrame } from "../components/AppFrame";
import { HallCanvas } from "../components/HallCanvas";
import { PlannerCanvas } from "../components/PlannerCanvas";
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

  const chipWidth = tall ? 210 : 240;

  return (
    <AppFrame activeRail="guests">
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: tall ? "column" : "row",
          padding: tall ? `${pad}px 40px 8px` : "34px 20px 34px 40px",
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
              backgroundColor: colors.secondary,
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
                  backgroundColor: colors.primary,
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

        <PlannerCanvas hall={hall} tall={tall} zoom="96%">
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
                // A guest card lifted straight out of the list: avatar circle,
                // name, the app's card fill and hairline border.
                <g key={seatIndex} transform={`translate(${x} ${y})`} opacity={opacity}>
                  <rect
                    x={-chipWidth / 2}
                    y={-21}
                    width={chipWidth}
                    height={42}
                    rx={14}
                    fill={colors.card}
                    stroke={colors.border}
                    strokeWidth={1.5}
                  />
                  <circle cx={-chipWidth / 2 + 24} cy={0} r={13} fill={colors.seatFilled} />
                  <text
                    x={-chipWidth / 2 + 24}
                    y={5}
                    textAnchor="middle"
                    fontFamily={fonts.sans}
                    fontSize={12}
                    fontWeight={600}
                    fill="#fff"
                  >
                    {name
                      .split(" ")
                      .map((part) => part.charAt(0))
                      .join("")}
                  </text>
                  <text
                    x={-chipWidth / 2 + 46}
                    y={6}
                    fontFamily={fonts.sans}
                    fontSize={tall ? 18 : 20}
                    fontWeight={500}
                    fill={colors.ink}
                  >
                    {name}
                  </text>
                </g>
              );
            })}
          </HallCanvas>
        </PlannerCanvas>
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
