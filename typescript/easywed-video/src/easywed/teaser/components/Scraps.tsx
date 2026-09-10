import React from "react";
import { colors, fonts, shadow } from "../../theme";

/**
 * The paper the planner replaces: a spreadsheet window and a sticky note. Both
 * are deliberately generic - the point is the pile, not any one document - so
 * they are drawn from bars rather than real text, apart from the filename.
 */

/** One spreadsheet row: a wide name bar plus two short ones. */
const Row: React.FC<{ width: number; struck?: boolean; scale: number }> = ({
  width,
  struck,
  scale,
}) => (
  <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 * scale }}>
    <div
      style={{
        width: `${width}%`,
        height: 11 * scale,
        borderRadius: 999,
        backgroundColor: colors.bgDeep,
      }}
    />
    <div
      style={{ width: `${18}%`, height: 11 * scale, borderRadius: 999, backgroundColor: colors.secondary }}
    />
    <div
      style={{ width: `${11}%`, height: 11 * scale, borderRadius: 999, backgroundColor: colors.secondary }}
    />
    {struck ? (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: "18%",
          top: "50%",
          height: 2.5 * scale,
          borderRadius: 999,
          backgroundColor: colors.terracotta,
          opacity: 0.8,
        }}
      />
    ) : null}
  </div>
);

export const SheetCard: React.FC<{
  filename: string;
  rows: { width: number; struck?: boolean }[];
  width: number;
  scale: number;
}> = ({ filename, rows, width, scale }) => (
  <div
    style={{
      width,
      padding: `${16 * scale}px ${18 * scale}px ${20 * scale}px`,
      borderRadius: 16 * scale,
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.card,
      boxShadow: shadow.card,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10 * scale,
        paddingBottom: 12 * scale,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      {/* The three window dots, so the card reads as a file and not a panel. */}
      {[0, 1, 2].map((dot) => (
        <div
          key={dot}
          style={{
            width: 9 * scale,
            height: 9 * scale,
            borderRadius: 999,
            backgroundColor: colors.tableBorder,
          }}
        />
      ))}
      <div
        style={{
          marginLeft: 6 * scale,
          fontFamily: fonts.sans,
          fontSize: 17 * scale,
          fontWeight: 600,
          color: colors.inkSoft,
          whiteSpace: "nowrap",
        }}
      >
        {filename}
      </div>
    </div>

    <div style={{ marginTop: 14 * scale, display: "flex", flexDirection: "column", gap: 11 * scale }}>
      {rows.map((row, i) => (
        <Row key={i} width={row.width} struck={row.struck} scale={scale} />
      ))}
    </div>
  </div>
);

/**
 * The one colour in the film that is not in the app's palette - a real sticky
 * note is yellow, and against the cream backdrop nothing on-palette reads as
 * one.
 */
const NOTE_PAPER = "#f0e2b4";

export const StickyNote: React.FC<{ text: string; width: number; scale: number }> = ({
  text,
  width,
  scale,
}) => (
  <div
    style={{
      width,
      padding: `${20 * scale}px ${20 * scale}px`,
      backgroundColor: NOTE_PAPER,
      boxShadow: shadow.chip,
      fontFamily: fonts.sans,
      fontSize: 22 * scale,
      fontWeight: 600,
      lineHeight: 1.3,
      color: "#6b5a2c",
    }}
  >
    {text}
  </div>
);
