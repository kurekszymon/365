import React from "react";
import { tl } from "../i18n";
import { colors, fonts } from "../theme";

/**
 * The Instagram series' tag: a pill in the top-left of every Reel from frame 0
 * until its call to action, reading the series' name and the episode's number
 * in posting order. Same colour, same place in every episode, so the grid reads
 * as one set. Drawn in the app's accent - its badge tone - rather than the
 * black of the closing pill, which it must not be mistaken for.
 */
export const SeriesTag: React.FC<{ episode: number; opacity: number }> = ({ episode, opacity }) => (
  <div
    style={{
      position: "absolute",
      left: 48,
      top: 64,
      padding: "12px 26px",
      borderRadius: 999,
      border: `1px solid ${colors.accent}33`,
      backgroundColor: colors.accentSoft,
      color: colors.accent,
      fontFamily: fonts.sans,
      fontSize: 30,
      fontWeight: 600,
      letterSpacing: -0.2,
      whiteSpace: "nowrap",
      opacity,
    }}
  >
    {tl.series.tag(episode)}
  </div>
);
