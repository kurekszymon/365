import React from "react";
import { Icon } from "../../components/Icon";
import { tl } from "../../i18n";
import { colors, fonts, shadow } from "../../theme";

/**
 * Redraws `planner/StatusBar.tsx`, the hint that floats bottom-centre while the
 * measure tool is on: ruler, the `measure.statusbar*` line, then the `Esc` key
 * and `statusbar.esc_to_exit`. `border-planner-table-border`,
 * `bg-planner-soft/90`, `text-planner-selected`.
 */
export const StatusPill: React.FC<{ text: string; scale: number; opacity: number }> = ({
  text,
  scale,
  opacity,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 12 * scale,
      padding: `${8 * scale}px ${16 * scale}px`,
      borderRadius: 999,
      border: `1px solid ${colors.tableBorder}`,
      backgroundColor: "rgba(246, 232, 242, 0.9)",
      boxShadow: shadow.chip,
      fontFamily: fonts.sans,
      fontSize: 12 * scale,
      color: colors.selected,
      whiteSpace: "nowrap",
      opacity,
    }}
  >
    <Icon name="ruler" color={colors.selected} size={14 * scale} />
    <span>{text}</span>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 * scale }}>
      <span
        style={{
          padding: `${2 * scale}px ${6 * scale}px`,
          borderRadius: 4 * scale,
          border: `1px solid ${colors.tableBorder}`,
          backgroundColor: colors.bg,
          fontSize: 10 * scale,
        }}
      >
        Esc
      </span>
      <span style={{ opacity: 0.8 }}>{tl.app.escToExit}</span>
    </span>
  </div>
);
