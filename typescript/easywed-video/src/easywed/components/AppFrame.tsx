import React from "react";
import { AbsoluteFill } from "remotion";
import { WEDDING } from "../data";
import { useFormat } from "../format";
import { colors, fonts, shadow } from "../theme";
import { Backdrop } from "./Backdrop";
import { BrandMark } from "./BrandMark";
import { NAV_ITEMS, NavIcon, type NavKind } from "./NavIcon";
import { Wordmark } from "./Wordmark";

type Props = {
  activeRail: NavKind;
  children: React.ReactNode;
};

const Avatars: React.FC<{ size: number }> = ({ size }) => (
  <>
    {["AK", "PN"].map((initials, i) => (
      <div
        key={initials}
        style={{
          width: size,
          height: size,
          marginLeft: i === 0 ? 0 : -size / 3,
          borderRadius: 999,
          backgroundColor: i === 0 ? colors.brandGreen : colors.terracotta,
          color: "#fff",
          border: `3px solid ${colors.card}`,
          fontFamily: fonts.sans,
          fontSize: size * 0.4,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {initials}
      </div>
    ))}
  </>
);

/**
 * The planner's shell, shared across the hall, guest and seating scenes so the
 * video reads as one continuous app. Landscape gets the desktop rail; portrait
 * gets the mobile bottom tab bar, matching how the app itself adapts.
 */
export const AppFrame: React.FC<Props> = ({ activeRail, children }) => {
  const { tall, pad } = useFormat();

  return (
    <Backdrop>
      <AbsoluteFill style={{ padding: pad }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRadius: 28,
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            boxShadow: shadow.card,
            overflow: "hidden",
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: tall ? 14 : 20,
              padding: tall ? "20px 26px" : "22px 32px",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <BrandMark size={tall ? 36 : 40} seatProgress={1} fillProgress={1} />
            <Wordmark size={tall ? 30 : 34} />
            <div style={{ width: 1, height: 30, backgroundColor: colors.border, margin: "0 4px" }} />
            <div
              style={{
                fontFamily: fonts.sans,
                fontSize: tall ? 22 : 24,
                fontWeight: 600,
                color: colors.ink,
              }}
            >
              {WEDDING.couple}
            </div>
            {tall ? null : (
              <div style={{ fontFamily: fonts.sans, fontSize: 22, color: colors.inkSoft }}>
                {WEDDING.date}
              </div>
            )}
            <div style={{ flex: 1 }} />
            <Avatars size={tall ? 40 : 44} />
          </header>

          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
            {tall ? null : (
              <nav
                style={{
                  width: 104,
                  padding: "26px 0",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 18,
                  borderRight: `1px solid ${colors.border}`,
                }}
              >
                {NAV_ITEMS.map(({ kind }) => {
                  const active = kind === activeRail;
                  return (
                    <div
                      key={kind}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        backgroundColor: active ? colors.accentSoft : "transparent",
                        border: `2px solid ${active ? colors.accent : colors.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <NavIcon kind={kind} color={active ? colors.accent : colors.inkSoft} size={26} />
                    </div>
                  );
                })}
              </nav>
            )}
            <div style={{ flex: 1, display: "flex", minWidth: 0 }}>{children}</div>
          </div>

          {tall ? (
            <nav
              style={{
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
                padding: "18px 12px 26px",
                borderTop: `1px solid ${colors.border}`,
                backgroundColor: colors.bg,
              }}
            >
              {NAV_ITEMS.map(({ kind, label }) => {
                const active = kind === activeRail;
                const tint = active ? colors.accent : colors.inkSoft;
                return (
                  <div
                    key={kind}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 18px",
                      borderRadius: 16,
                      backgroundColor: active ? colors.accentSoft : "transparent",
                    }}
                  >
                    <NavIcon kind={kind} color={tint} size={30} />
                    <span style={{ fontFamily: fonts.sans, fontSize: 18, color: tint, fontWeight: active ? 600 : 400 }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </nav>
          ) : null}
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
