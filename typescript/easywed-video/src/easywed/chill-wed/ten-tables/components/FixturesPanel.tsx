import React from "react";
import { Icon } from "../../../components/Icon";
import { tl } from "../../../i18n";
import { colors, fonts } from "../../../theme";
import { APP_PX, PANEL, PANEL_HEADER } from "./desk";

/**
 * The desktop rail's *Elementy sali* panel at easywed/v1 (`SidebarRail`'s
 * content column around `EntityListContent kind="fixtures"`): a `w-[400px]`
 * overlay that slides out from under the rail over the canvas, headed by the
 * tab's name and a collapse chevron, then the outline *Dodaj element* - which
 * opens the add hub pre-filtered to fixtures - over `fixtures.none` while the
 * room has none. Drawn in the planner row's own coordinates, so the row's edge
 * clips it as it slides.
 */
const s = APP_PX;

export const FixturesPanel: React.FC<{
  /** Slid in, 0..1. */
  open: number;
  /** *Dodaj element* held down. */
  pressed?: boolean;
}> = ({ open, pressed }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: PANEL.width,
      height: PANEL.height,
      boxSizing: "border-box",
      borderRight: `1px solid ${colors.border}`,
      backgroundColor: colors.bg,
      boxShadow: `${8 * s}px 0 ${24 * s}px -${16 * s}px rgba(40, 60, 45, 0.45)`,
      fontFamily: fonts.sans,
      color: colors.ink,
      transform: `translateX(${-(1 - open) * PANEL.width}px)`,
    }}
  >
    <div
      style={{
        height: PANEL_HEADER * s,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `0 ${16 * s}px`,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div style={{ fontFamily: fonts.heading, fontSize: 16 * s, fontWeight: 600 }}>{tl.app.fixturesPanel.title}</div>
      <Icon name="chevronLeft" color={colors.inkSoft} size={16 * s} />
    </div>
    <div style={{ padding: 16 * s, display: "flex", flexDirection: "column", gap: 16 * s }}>
      <div
        style={{
          height: 32 * s,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6 * s,
          borderRadius: 10 * s,
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.secondary,
          fontSize: 14 * s,
          fontWeight: 500,
          transform: pressed ? `translateY(${s}px)` : undefined,
        }}
      >
        <Icon name="plus" color={colors.ink} size={16 * s} />
        {tl.app.fixturesPanel.add}
      </div>
      <div style={{ fontSize: 14 * s, color: colors.inkSoft }}>{tl.app.fixturesPanel.none}</div>
    </div>
  </div>
);
