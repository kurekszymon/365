import React from "react";
import { AbsoluteFill } from "remotion";
import { WEDDING } from "../data";
import { tl } from "../i18n";
import { useFormat } from "../format";
import { colors, fonts, shadow } from "../theme";
import { Backdrop } from "./Backdrop";
import { BrandMark } from "./BrandMark";
import { Icon, NAV_ITEMS, type IconName, type NavKind } from "./Icon";
import { Wordmark } from "./Wordmark";

type Props = {
  activeRail: NavKind;
  children: React.ReactNode;
  /**
   * Draw the desktop planner whatever the composition's shape - for a portrait
   * film that shows the couple's laptop. Left out, the frame follows `useFormat()`.
   */
  desktop?: boolean;
  /** Drawn over the dashed invite circle, positioned from its centre - a pointer that presses it. */
  inviteSlot?: React.ReactNode;
};

/** `useFormat()`'s landscape padding, for a desktop frame drawn inside a portrait composition. */
const DESKTOP_PAD = 44;

/**
 * The header's member stack: the signed-in owner plus the dashed "invite"
 * circle the app shows next to it.
 */
const Members: React.FC<{ size: number; inviteSlot?: React.ReactNode }> = ({ size, inviteSlot }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.16 }}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: "#4f46e5",
        color: "#fff",
        fontFamily: fonts.sans,
        fontSize: size * 0.38,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      AK
    </div>
    <Icon name="user" color={colors.inkSoft} size={size * 0.5} />
    <div
      style={{
        width: size * 0.78,
        height: size * 0.78,
        borderRadius: 999,
        border: `2px dashed ${colors.tableBorder}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: inviteSlot ? "relative" : undefined,
      }}
    >
      <Icon name="userPlus" color={colors.inkSoft} size={size * 0.42} />
      {inviteSlot ? (
        <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, zIndex: 10 }}>
          {inviteSlot}
        </div>
      ) : null}
    </div>
  </div>
);

/** A bordered icon-only header button - import, export, account. */
const HeaderButton: React.FC<{ name: IconName; scale: number }> = ({ name, scale }) => (
  <div
    style={{
      width: 36 * scale,
      height: 32 * scale,
      borderRadius: 9 * scale,
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.card,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Icon name={name} color={colors.ink} size={17 * scale} />
  </div>
);

/** Icon-in-a-circle tab button, mirroring the app's `TabBadgeIcon`. */
const TabIcon: React.FC<{
  kind: NavKind;
  active: boolean;
  badge?: number;
  size: number;
}> = ({ kind, active, badge, size }) => (
  <div style={{ position: "relative" }}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: active ? colors.primary : "rgba(43, 38, 33, 0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={kind} color={active ? colors.primaryInk : colors.primary} size={size * 0.53} />
    </div>
    {badge ? (
      <div
        style={{
          position: "absolute",
          top: -size * 0.1,
          right: -size * 0.14,
          minWidth: size * 0.42,
          height: size * 0.42,
          padding: `0 ${size * 0.1}px`,
          borderRadius: 999,
          backgroundColor: colors.accentSoft,
          color: colors.accent,
          fontFamily: fonts.sans,
          fontSize: size * 0.26,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {badge}
      </div>
    ) : null}
  </div>
);

/**
 * The planner's shell, shared across the hall, guest and seating scenes so the
 * video reads as one continuous app. Landscape gets the desktop rail - the
 * 60px icon strip with its labels underneath; portrait gets the mobile tab bar
 * with the zoom control and add FAB, matching how the app itself adapts.
 */
export const AppFrame: React.FC<Props> = ({ activeRail, children, desktop = false, inviteSlot }) => {
  const format = useFormat();
  const tall = desktop ? false : format.tall;
  const pad = desktop ? DESKTOP_PAD : format.pad;
  // The app's chrome is designed at browser scale; everything here is that
  // spec times a constant so it stays legible at 1080p.
  const s = tall ? 1.5 : 1.7;

  return (
    <Backdrop>
      <AbsoluteFill style={{ padding: pad }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRadius: 24,
            backgroundColor: colors.bg,
            border: `1px solid ${colors.border}`,
            boxShadow: shadow.card,
            overflow: "hidden",
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12 * s,
              padding: `${8 * s}px ${12 * s}px`,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <BrandMark size={24 * s} seatProgress={1} fillProgress={1} />
            <Wordmark size={20 * s} />
            <div style={{ width: 1, height: 20 * s, backgroundColor: colors.border }} />
            <Icon name="arrowLeft" color={colors.inkSoft} size={17 * s} />
            <div
              style={{
                fontFamily: fonts.heading,
                fontSize: 17 * s,
                fontWeight: 600,
                color: colors.ink,
              }}
            >
              {WEDDING.couple}
            </div>

            <div style={{ flex: 1 }} />

            <Members size={21 * s} inviteSlot={inviteSlot} />
            {tall ? null : (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6 * s,
                  padding: `${7 * s}px ${12 * s}px`,
                  borderRadius: 9 * s,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.card,
                  fontFamily: fonts.sans,
                  fontSize: 13 * s,
                  fontWeight: 500,
                  color: colors.ink,
                }}
              >
                <Icon name="landmark" color={colors.ink} size={15 * s} />
                {tl.app.configureHall}
              </div>
            )}
            <HeaderButton name="upload" scale={s} />
            <HeaderButton name="download" scale={s} />
            <HeaderButton name="user" scale={s} />
          </header>

          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
            {tall ? null : (
              <nav
                style={{
                  // Wider than the app's 60px strip: "Przypomnienia" spills out
                  // of it at this type size, and a rail label can't wrap.
                  width: 76 * s,
                  padding: `${14 * s}px 0`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14 * s,
                  borderRight: `1px solid ${colors.border}`,
                }}
              >
                <div
                  style={{
                    width: 34 * s,
                    height: 34 * s,
                    borderRadius: 11 * s,
                    backgroundColor: colors.secondary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="chevronRight" color={colors.ink} size={19 * s} />
                </div>
                {NAV_ITEMS.map(({ kind, label, badge }) => (
                  <div
                    key={kind}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4 * s,
                      width: "100%",
                    }}
                  >
                    <TabIcon
                      kind={kind}
                      active={kind === activeRail}
                      badge={badge}
                      size={34 * s}
                    />
                    <span
                      style={{
                        fontFamily: fonts.sans,
                        fontSize: 9 * s,
                        fontWeight: 700,
                        lineHeight: 1.15,
                        color: colors.inkSoft,
                        textAlign: "center",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </nav>
            )}
            <div style={{ flex: 1, display: "flex", minWidth: 0 }}>{children}</div>
          </div>

          {tall ? (
            <nav
              style={{
                display: "flex",
                justifyContent: "space-around",
                alignItems: "flex-start",
                padding: `${10 * s}px ${6 * s}px ${14 * s}px`,
                borderTop: `1px solid ${colors.border}`,
                backgroundColor: colors.bg,
              }}
            >
              {NAV_ITEMS.map(({ kind, label, badge }) => (
                <div
                  key={kind}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 5 * s,
                    width: 78 * s,
                  }}
                >
                  <TabIcon kind={kind} active={kind === activeRail} badge={badge} size={36 * s} />
                  <span
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 10 * s,
                      fontWeight: 700,
                      color: colors.inkSoft,
                      textAlign: "center",
                    }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </nav>
          ) : null}
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
