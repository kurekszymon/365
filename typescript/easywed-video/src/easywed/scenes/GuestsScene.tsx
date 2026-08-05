import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AppFrame } from "../components/AppFrame";
import { Icon, type IconName } from "../components/Icon";
import { SceneLabel } from "../components/SceneLabel";
import { GUESTS } from "../data";
import { useFormat } from "../format";
import { colors, fonts, shadow } from "../theme";

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("");

/**
 * A row of the planner's guest list: avatar, name, and the seat line
 * underneath - a secondary-filled card, not a table row.
 */
const GuestRow: React.FC<{ guest: (typeof GUESTS)[number]; enter: number; scale: number }> = ({
  guest,
  enter,
  scale,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12 * scale,
      padding: `${7 * scale}px ${13 * scale}px`,
      borderRadius: 14 * scale,
      backgroundColor: colors.secondary,
      opacity: enter,
      transform: `translateX(${interpolate(enter, [0, 1], [40, 0])}px)`,
    }}
  >
    <div
      style={{
        width: 27 * scale,
        height: 27 * scale,
        borderRadius: 999,
        backgroundColor: colors.bgDeep,
        color: colors.inkSoft,
        fontFamily: fonts.sans,
        fontSize: 12 * scale,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {initials(guest.name)}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 15 * scale,
          fontWeight: 600,
          color: colors.ink,
        }}
      >
        {guest.name}
      </div>
      <div
        style={{
          marginTop: 2 * scale,
          display: "flex",
          alignItems: "center",
          gap: 5 * scale,
          fontFamily: fonts.sans,
          fontSize: 12 * scale,
          color: colors.inkSoft,
        }}
      >
        <Icon name="check" color={colors.inkSoft} size={11 * scale} />
        {`At table: ${guest.table}`}
      </div>
    </div>
    <Icon name="pencil" color={colors.inkSoft} size={15 * scale} />
    <Icon name="trash" color={colors.inkSoft} size={15 * scale} />
  </div>
);

const FilterChip: React.FC<{ label: string; active?: boolean; tone?: string; scale: number }> = ({
  label,
  active,
  tone,
  scale,
}) => (
  <div
    style={{
      padding: `${7 * scale}px ${14 * scale}px`,
      borderRadius: 999,
      backgroundColor: active ? colors.primary : colors.secondary,
      color: active ? colors.primaryInk : (tone ?? colors.inkSoft),
      fontFamily: fonts.sans,
      fontSize: 13 * scale,
      fontWeight: 600,
    }}
  >
    {label}
  </div>
);

const PanelButton: React.FC<{ icon: IconName; label: string; scale: number }> = ({
  icon,
  label,
  scale,
}) => (
  <div
    style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8 * scale,
      padding: `${10 * scale}px 0`,
      borderRadius: 12 * scale,
      backgroundColor: colors.secondary,
      fontFamily: fonts.sans,
      fontSize: 14 * scale,
      fontWeight: 600,
      color: colors.ink,
    }}
  >
    <Icon name={icon} color={colors.ink} size={16 * scale} />
    {label}
  </div>
);

export const GuestsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { hall, tall, pad, gap, type } = useFormat();
  const scale = tall ? 1.5 : 1.7;

  // As many rows as the panel holds without clipping; the rest are summarised.
  const visibleGuests = GUESTS.slice(0, tall ? 8 : 3);
  const rows = visibleGuests.map((_, i) =>
    spring({ frame: frame - (34 + i * 8), fps, config: { damping: 200 }, durationInFrames: 22 }),
  );

  const counter = Math.round(
    interpolate(frame, [40, 100], [0, hall.totalSeats], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  const panelIn = spring({ frame: frame - 12, fps, config: { damping: 200 }, durationInFrames: 26 });
  const importIn = spring({ frame: frame - 108, fps, config: { damping: 12, mass: 0.6 } });

  const seatedShare = counter / hall.totalSeats;

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
        <div style={{ width: tall ? "100%" : 560, paddingTop: tall ? 8 : 40, flexShrink: 0 }}>
          <SceneLabel
            step="Step 02"
            title="Add your guests"
            subtitle="Dietary needs, plus-ones and seat assignments live next to every name - no more cross-checking three spreadsheets."
            from={6}
          />

          <div
            style={{
              marginTop: tall ? 26 : 44,
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              opacity: importIn,
              transform: `translateY(${interpolate(importIn, [0, 1], [30, 0])}px)`,
            }}
          >
            {[
              { icon: "fileUp" as IconName, label: "Import CSV or XLSX" },
              { icon: "printer" as IconName, label: "Export a PDF to print" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 24px",
                  borderRadius: 18,
                  backgroundColor: colors.accentSoft,
                  color: colors.accent,
                  boxShadow: shadow.chip,
                  fontFamily: fonts.sans,
                  fontSize: type.body,
                  fontWeight: 600,
                }}
              >
                <Icon name={icon} color={colors.accent} size={26} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* The guests panel, as it slides out of the rail in the app. */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8 * scale,
            padding: `${12 * scale}px ${16 * scale}px`,
            borderRadius: 22,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.bg,
            overflow: "hidden",
            alignSelf: "stretch",
            opacity: panelIn,
            transform: `translateX(${interpolate(panelIn, [0, 1], [-40, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: fonts.heading,
              fontSize: 18 * scale,
              fontWeight: 600,
              color: colors.ink,
              paddingBottom: 8 * scale,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            Guests
          </div>

          <div
            style={{
              padding: `${12 * scale}px ${14 * scale}px`,
              borderRadius: 16 * scale,
              backgroundColor: colors.secondary,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span
                style={{
                  flex: 1,
                  fontFamily: fonts.sans,
                  fontSize: 15 * scale,
                  fontWeight: 700,
                  color: colors.ink,
                }}
              >
                Guest list
              </span>
              <span
                style={{ fontFamily: fonts.sans, fontSize: 14 * scale, color: colors.inkSoft }}
              >
                {`${counter} of ${hall.totalSeats} guests added`}
              </span>
            </div>
            <div
              style={{
                marginTop: 9 * scale,
                height: 7 * scale,
                borderRadius: 999,
                backgroundColor: colors.bgDeep,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${seatedShare * 100}%`,
                  height: "100%",
                  borderRadius: 999,
                  backgroundColor: colors.primary,
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9 * scale,
              padding: `${9 * scale}px ${13 * scale}px`,
              borderRadius: 14 * scale,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.card,
              fontFamily: fonts.sans,
              fontSize: 14 * scale,
              color: colors.inkSoft,
            }}
          >
            <Icon name="search" color={colors.inkSoft} size={15 * scale} />
            Search a guest...
          </div>

          <div style={{ display: "flex", gap: 8 * scale }}>
            <FilterChip label={`All ${hall.totalSeats}`} active scale={scale} />
            <FilterChip label="No seat 0" scale={scale} />
            <FilterChip label="Vege 7" tone={colors.brandGreen} scale={scale} />
          </div>

          <div style={{ display: "flex", gap: 8 * scale }}>
            <PanelButton icon="plus" label="Add guest" scale={scale} />
            <PanelButton icon="fileUp" label="Import guests" scale={scale} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 7 * scale, minHeight: 0 }}>
            {visibleGuests.map((guest, i) => (
              <GuestRow key={guest.name} guest={guest} enter={rows[i]} scale={scale} />
            ))}
            <div
              style={{
                paddingTop: 4 * scale,
                fontFamily: fonts.sans,
                fontSize: 13 * scale,
                color: colors.inkSoft,
                opacity: rows[visibleGuests.length - 1],
              }}
            >
              {`+ ${hall.totalSeats - visibleGuests.length} more guests`}
            </div>
          </div>
        </div>
      </div>
    </AppFrame>
  );
};
