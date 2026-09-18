import React from "react";
import { Icon } from "../../components/Icon";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";

/**
 * Redraws `planner/Canvas/ShapeEditToolbar.tsx`, the pill that floats over the
 * canvas while the shape editor owns it: the desktop hint (`shape_edit.hint`,
 * `truncate`d to the canvas) and the black *Gotowe* button that hands back to
 * the hall's form. `rounded-full border bg-card/95 py-1.5 pr-1.5 pl-4
 * shadow-md`, `gap-3`, `text-xs text-muted-foreground`, a `size="sm"` button.
 * Drawn in the app's pixels and scaled by the caller.
 */
export const ShapeEditPill: React.FC<{ maxWidth: number }> = ({ maxWidth }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      maxWidth,
      boxSizing: "border-box",
      padding: "6px 6px 6px 16px",
      borderRadius: 999,
      border: `1px solid ${colors.border}`,
      backgroundColor: "rgba(253, 251, 246, 0.95)",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
      fontFamily: fonts.sans,
    }}
  >
    <span
      style={{
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontSize: 12,
        color: colors.inkSoft,
      }}
    >
      {tl.app.shapeEditHint}
    </span>
    <span
      style={{
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height: 28,
        padding: "0 10px",
        borderRadius: 999,
        backgroundColor: colors.primary,
        color: colors.primaryInk,
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <Icon name="check" color={colors.primaryInk} size={16} />
      {tl.app.done}
    </span>
  </div>
);
