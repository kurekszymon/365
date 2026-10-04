import React from "react";
import { AddHub } from "../../components/AddHub";
import { Icon } from "../../components/Icon";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";
import { APP_PX, DIALOG, HUB } from "./desk";

/**
 * `Sidebar/AddEntityDialog.tsx` at easywed/v1: the desktop *Dodaj do sali*
 * picker, a plain `Dialog` with its close X, opened from the *Elementy sali*
 * panel and so pre-filtered to *Elementy sali*. Its body is `AddHubContent`.
 */
const s = APP_PX;

export const AddHubDialog: React.FC<{ opacity: number; hovered?: string }> = ({ opacity, hovered }) => (
  <div
    style={{
      position: "absolute",
      left: HUB.x,
      top: HUB.y,
      width: HUB.width,
      height: HUB.height,
      boxSizing: "border-box",
      padding: DIALOG.pad * s,
      borderRadius: 12 * s,
      backgroundColor: colors.bg,
      boxShadow: `0 0 0 1px rgba(36, 31, 26, 0.1), 0 ${24 * s}px ${48 * s}px -${12 * s}px rgba(0, 0, 0, 0.18)`,
      fontFamily: fonts.sans,
      color: colors.ink,
      opacity,
      transform: `scale(${0.95 + 0.05 * opacity})`,
    }}
  >
    <div style={{ position: "absolute", top: 8 * s, right: 8 * s, width: 28 * s, height: 28 * s, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name="x" color={colors.ink} size={16 * s} />
    </div>
    <div style={{ height: 16 * s, display: "flex", alignItems: "center", fontFamily: fonts.heading, fontSize: 16 * s, fontWeight: 500 }}>
      {tl.app.addHub.title}
    </div>
    <div style={{ marginTop: DIALOG.gap * s }}>
      <AddHub category="fixtures" width={HUB.innerWidth} scale={s} hovered={hovered} />
    </div>
  </div>
);
