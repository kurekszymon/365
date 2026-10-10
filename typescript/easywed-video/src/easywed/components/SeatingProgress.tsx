import React from "react";
import { tl } from "../i18n";
import { colors, fonts } from "../theme";

/**
 * `Guests/SeatingProgress`: `guests.progress` and `guests.seated_ratio` over a
 * bar - the card at the top of the guest panel. Drawn at `scale` times its CSS
 * spec. The import cut and the sunday-couch cut both show it.
 */
export const SeatingProgress: React.FC<{ seated: number; total: number; scale: number }> = ({
  seated,
  total,
  scale,
}) => {
  const pct = total > 0 ? Math.round((seated / total) * 100) : 0;
  return (
    <div
      style={{
        padding: 14 * scale,
        borderRadius: 16 * scale,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.card,
        fontFamily: fonts.sans,
      }}
    >
      <div
        style={{
          marginBottom: 10 * scale,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12 * scale,
          fontSize: 13 * scale,
        }}
      >
        <span style={{ fontWeight: 600, color: colors.ink }}>{tl.guests.progress}</span>
        <span style={{ color: colors.inkSoft, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          {tl.guests.seatedRatio(seated, total)}
        </span>
      </div>
      <div style={{ height: 8 * scale, borderRadius: 999, backgroundColor: colors.bgDeep, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, backgroundColor: colors.primary }} />
      </div>
    </div>
  );
};
