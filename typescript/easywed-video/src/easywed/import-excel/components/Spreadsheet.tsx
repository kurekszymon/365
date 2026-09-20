import React from "react";
import { Icon } from "../../components/Icon";
import { colors, fonts, shadow } from "../../theme";

/**
 * The list as it lives today: a plain spreadsheet window - column letters, row
 * numbers, a header row and real names. Unlike the teaser's `SheetCard` it holds
 * real text, because the names are what the import has to carry across intact.
 */

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Share of the width each column takes after the row-number gutter. */
const SHARES = [38, 29, 15, 18];

const cell = (scale: number): React.CSSProperties => ({
  height: 48 * scale,
  display: "flex",
  alignItems: "center",
  padding: `0 ${12 * scale}px`,
  borderRight: `1px solid ${colors.border}`,
  borderBottom: `1px solid ${colors.border}`,
  overflow: "hidden",
  whiteSpace: "nowrap",
});

export const Spreadsheet: React.FC<{
  headers: string[];
  rows: string[][];
  width: number;
  scale: number;
  /** How far the rows have drifted up, in px. */
  scroll: number;
  /** Rows drawn - enough to run past the bottom of the frame. */
  visibleRows: number;
}> = ({ headers, rows, width, scale, scroll, visibleRows }) => {
  const gutter = 52 * scale;
  const columns = `${gutter}px ${SHARES.map((share) => `${share}fr`).join(" ")}`;
  const rowHeight = 48 * scale;

  return (
    <div
      style={{
        width,
        borderRadius: 18 * scale,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.card,
        boxShadow: shadow.card,
        overflow: "hidden",
        fontFamily: fonts.sans,
      }}
    >
      {/* The window dots, so the card reads as a file and not a panel. */}
      <div
        style={{
          display: "flex",
          gap: 10 * scale,
          padding: `${16 * scale}px ${18 * scale}px`,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        {[0, 1, 2].map((dot) => (
          <div
            key={dot}
            style={{
              width: 11 * scale,
              height: 11 * scale,
              borderRadius: 999,
              backgroundColor: colors.tableBorder,
            }}
          />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: columns }}>
        <div style={{ ...cell(scale), height: 34 * scale, backgroundColor: colors.bgDeep }} />
        {headers.map((_, j) => (
          <div
            key={LETTERS[j]}
            style={{
              ...cell(scale),
              height: 34 * scale,
              justifyContent: "center",
              backgroundColor: colors.bgDeep,
              fontSize: 16 * scale,
              color: colors.inkSoft,
            }}
          >
            {LETTERS[j]}
          </div>
        ))}

        <div
          style={{
            ...cell(scale),
            justifyContent: "center",
            backgroundColor: colors.secondary,
            fontSize: 16 * scale,
            color: colors.inkSoft,
          }}
        >
          1
        </div>
        {headers.map((header) => (
          <div
            key={header}
            style={{ ...cell(scale), fontSize: 20 * scale, fontWeight: 700, color: colors.ink }}
          >
            {header}
          </div>
        ))}
      </div>

      {/* Only the data rows drift; the letters and the header row stay put. */}
      <div style={{ height: visibleRows * rowHeight, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: columns,
            transform: `translateY(${-scroll}px)`,
          }}
        >
          {rows.slice(0, visibleRows + Math.ceil(scroll / rowHeight) + 1).map((row, i) => (
            <React.Fragment key={row[0]}>
              <div
                style={{
                  ...cell(scale),
                  justifyContent: "center",
                  backgroundColor: colors.secondary,
                  fontSize: 16 * scale,
                  color: colors.inkSoft,
                }}
              >
                {i + 2}
              </div>
              {row.map((value, j) => (
                <div
                  key={j}
                  style={{
                    ...cell(scale),
                    fontSize: 20 * scale,
                    color: j === 0 ? colors.ink : colors.inkSoft,
                  }}
                >
                  {value}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

/** The file itself, as a chip - held in the hook, dragged into the dialog next. */
export const FileChip: React.FC<{ name: string; scale: number }> = ({ name, scale }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10 * scale,
      padding: `${10 * scale}px ${18 * scale}px ${10 * scale}px ${14 * scale}px`,
      borderRadius: 14 * scale,
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.card,
      boxShadow: shadow.chip,
      fontFamily: fonts.sans,
      fontSize: 22 * scale,
      fontWeight: 600,
      color: colors.ink,
      whiteSpace: "nowrap",
    }}
  >
    <Icon name="fileSpreadsheet" color={colors.brandGreen} size={28 * scale} />
    {name}
  </div>
);
