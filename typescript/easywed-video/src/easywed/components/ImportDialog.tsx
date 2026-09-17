import React from "react";
import { interpolateColors } from "remotion";
import type { RosterGuest } from "../data";
import { tl } from "../i18n";
import { colors, fonts, shadow } from "../theme";
import { Cursor } from "./Cursor";
import { Icon } from "./Icon";

/**
 * The guest import wizard - `dialogs/guests/ImportGuestsDialog.tsx` at
 * easywed/v1, with `shared/FileDropZone`, `GuestImportMappingStep`,
 * `GuestImportSheetPreview`, `GuestImportResultPreview` and `ui/preview-table`.
 * A centred dialog in landscape; in portrait the bottom-sheet drawer
 * `ResponsiveDialog` swaps to on a phone. Every string is `guests.import.*`
 * (or `common.show_more`) from `pl.json` / `en.json`, verbatim.
 *
 * Sizes are the app's CSS pixels times `scale`, as `AppFrame` draws the chrome.
 */

export type ImportStage = "file" | "mapping" | "preview";

/** `GUEST_IMPORT_FIELDS`, in the app's order, labelled `guests.import.col.*`. */
export const IMPORT_FIELDS = [
  { field: "name", label: tl.import.col.name, required: true },
  { field: "table", label: tl.import.col.table, required: false },
  { field: "dietary", label: tl.import.col.dietary, required: false },
  { field: "note", label: tl.import.col.note, required: false },
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number]["field"];

/** The app's `ColumnMapping`: a column index per field, or null for "- None -". */
export type ColumnMapping = Record<ImportField, number | null>;

export type ImportPointer = {
  target: "drop" | "next" | "commit";
  /** 0 = off at its starting point, 1 = resting on the target. */
  approach: number;
  pressed?: boolean;
  /** Held under the pointer - the file being dragged in. */
  carrying?: React.ReactNode;
  opacity?: number;
};

type Props = {
  stage: ImportStage;
  /** Portrait's bottom sheet rather than the centred dialog. */
  drawer: boolean;
  scale: number;
  headers: string[];
  rows: string[][];
  mapping: ColumnMapping;
  /** Per-field settle onto its column, 0..1, indexed like `IMPORT_FIELDS`. */
  snap?: number[];
  /** What the preview step will add, in sheet order. */
  guests?: RosterGuest[];
  /** The drop zone's drag-over state, 0..1. */
  dragOver?: number;
  /** Fades the body alone, for the cut from one step to the next. */
  contentOpacity?: number;
  pointer?: ImportPointer;
};

/** `PreviewTable`'s `initial` - rows shown before "+N more rows". */
const PREVIEW_ROWS = 6;

/** Column widths for the four-field table, so long cells truncate as `truncate` does. */
const COLUMN_SHARES = [31, 29, 19, 21];

/** `ring-foreground/10` around the dialog. */
const RING = "rgba(36, 31, 26, 0.1)";
/** The drop zone's idle `border-muted-foreground/40`. */
const DROP_BORDER = "rgba(123, 115, 107, 0.4)";

/**
 * Where on its target the pointer comes to rest. The file lands in the drop
 * zone's empty lower corner, so it never covers the zone's own label.
 */
const POINTER_AT: Record<ImportPointer["target"], { left: string; top: string }> = {
  drop: { left: "78%", top: "78%" },
  next: { left: "50%", top: "50%" },
  commit: { left: "50%", top: "50%" },
};

/**
 * Where the pointer starts, relative to where it rests, in CSS px - always from
 * above, so a bottom-anchored drawer never hides its approach below the frame.
 */
const POINTER_FROM: Record<ImportPointer["target"], { x: number; y: number }> = {
  drop: { x: 200, y: -260 },
  next: { x: 150, y: -180 },
  commit: { x: 150, y: -180 },
};

const PointerOverlay: React.FC<{ pointer: ImportPointer; scale: number }> = ({ pointer, scale }) => {
  const from = POINTER_FROM[pointer.target];
  const away = 1 - pointer.approach;
  return (
    <div
      style={{
        position: "absolute",
        ...POINTER_AT[pointer.target],
        zIndex: 10,
        opacity: pointer.opacity ?? 1,
        transform: `translate(${from.x * scale * away}px, ${from.y * scale * away}px)`,
      }}
    >
      {pointer.carrying ? (
        <div style={{ position: "absolute", left: 0, top: 0, transform: "translate(-35%, -40%)" }}>
          {pointer.carrying}
        </div>
      ) : null}
      <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <g transform={`scale(${scale * 1.1})`}>
          <Cursor x={0} y={0} opacity={1} pressed={pointer.pressed} />
        </g>
      </svg>
    </div>
  );
};

/** One half of the footer's `ButtonGroup`: outline "Back", then the primary action. */
const GroupButton: React.FC<{
  label: string;
  primary?: boolean;
  scale: number;
  pressed?: boolean;
  children?: React.ReactNode;
}> = ({ label, primary, scale, pressed, children }) => (
  <div
    style={{
      position: "relative",
      height: 32 * scale,
      padding: `0 ${10 * scale}px`,
      display: "flex",
      alignItems: "center",
      borderRadius: primary ? `0 ${10 * scale}px ${10 * scale}px 0` : `${10 * scale}px 0 0 ${10 * scale}px`,
      border: `1px solid ${primary ? colors.primary : colors.border}`,
      backgroundColor: primary ? colors.primary : colors.bg,
      color: primary ? colors.primaryInk : colors.ink,
      fontSize: 14 * scale,
      fontWeight: 500,
      whiteSpace: "nowrap",
      transform: pressed ? `translateY(${scale}px)` : undefined,
    }}
  >
    {label}
    {children}
  </div>
);

type Cell = { text: string; muted?: boolean };

const PreviewTable: React.FC<{
  headers: string[];
  rows: Cell[][];
  scale: number;
  /** Per-column highlight, 0..1. */
  highlight?: number[];
}> = ({ headers, rows, scale, highlight }) => {
  const remaining = rows.length - PREVIEW_ROWS;
  const tint = (j: number) =>
    interpolateColors(highlight?.[j] ?? 0, [0, 1], ["rgba(246, 232, 242, 0)", colors.selectedSoft]);
  const cell: React.CSSProperties = {
    padding: `${4 * scale}px ${8 * scale}px`,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "left",
    lineHeight: 1.35,
  };

  return (
    <div style={{ borderRadius: 8 * scale, border: `1px solid ${colors.border}`, overflow: "hidden", fontSize: 12 * scale }}>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          {headers.map((header, j) => (
            <col key={header} style={{ width: `${COLUMN_SHARES[j] ?? 100 / headers.length}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.secondary }}>
            {headers.map((header, j) => (
              <th key={header} style={{ ...cell, fontWeight: 500, color: colors.ink, backgroundColor: tint(j) }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, PREVIEW_ROWS).map((row, i) => (
            <tr key={row[0].text} style={{ borderBottom: i < PREVIEW_ROWS - 1 || remaining > 0 ? `1px solid ${colors.border}` : undefined }}>
              {row.map((value, j) => (
                <td
                  key={j}
                  style={{ ...cell, color: value.muted ? colors.inkSoft : colors.ink, backgroundColor: tint(j) }}
                >
                  {value.text}
                </td>
              ))}
            </tr>
          ))}
          {remaining > 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                style={{ padding: `${6 * scale}px ${8 * scale}px`, textAlign: "center", fontStyle: "italic", color: colors.inkSoft }}
              >
                {tl.import.moreRows(remaining)}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
};

export const ImportDialog: React.FC<Props> = ({
  stage,
  drawer,
  scale,
  headers,
  rows,
  mapping,
  snap,
  guests = [],
  dragOver = 0,
  contentOpacity = 1,
  pointer,
}) => {
  const muted: React.CSSProperties = { fontSize: 14 * scale, lineHeight: 1.43, color: colors.inkSoft };
  const pointerOn = (target: ImportPointer["target"]) =>
    pointer?.target === target ? <PointerOverlay pointer={pointer} scale={scale} /> : null;

  const fieldGlow = IMPORT_FIELDS.map((_, i) => Math.sin((snap?.[i] ?? 1) * Math.PI));
  // The sheet preview lights the column each field is settling onto.
  const columnGlow = headers.map((_, j) =>
    IMPORT_FIELDS.reduce((glow, { field }, i) => (mapping[field] === j ? Math.max(glow, fieldGlow[i]) : glow), 0),
  );

  const footer = (primaryLabel: string, target: "next" | "commit") => (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <GroupButton label={tl.import.back} scale={scale} />
      <GroupButton
        label={primaryLabel}
        primary
        scale={scale}
        pressed={pointer?.target === target && pointer.pressed}
      >
        {pointerOn(target)}
      </GroupButton>
    </div>
  );

  let body: React.ReactNode;
  if (stage === "file") {
    body = (
      <>
        <div style={muted}>
          {tl.import.intro}
        </div>
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8 * scale,
            padding: 32 * scale,
            borderRadius: 10 * scale,
            border: `${2 * scale}px dashed ${interpolateColors(dragOver, [0, 1], [DROP_BORDER, colors.primary])}`,
            backgroundColor: `rgba(43, 38, 33, ${0.05 * dragOver})`,
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: 14 * scale, fontWeight: 500, color: colors.ink }}>
            {tl.import.dropHere}
          </span>
          <span style={{ fontSize: 12 * scale, color: colors.inkSoft }}>{tl.import.chooseFile}</span>
          {pointerOn("drop")}
        </div>
      </>
    );
  } else if (stage === "mapping") {
    body = (
      <>
        <div style={muted}>{tl.import.mapColumns}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 * scale }}>
          {IMPORT_FIELDS.map(({ field, label, required }, i) => {
            const settle = snap?.[i] ?? 1;
            const column = mapping[field];
            const value = column === null ? tl.import.colNone : headers[column] || tl.import.colUnnamed(column + 1);
            return (
              <div key={field} style={{ display: "flex", alignItems: "center", gap: 12 * scale }}>
                <div style={{ flex: 1, fontSize: 14 * scale, fontWeight: 500, color: colors.ink }}>
                  {label}
                  {required ? <span style={{ color: colors.destructive }}> *</span> : null}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 32 * scale,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: `0 ${8 * scale}px 0 ${10 * scale}px`,
                    borderRadius: 10 * scale,
                    border: `1px solid ${interpolateColors(fieldGlow[i], [0, 1], [colors.border, colors.selected])}`,
                    backgroundColor: interpolateColors(fieldGlow[i], [0, 1], [colors.bg, colors.selectedSoft]),
                    fontSize: 14 * scale,
                    color: colors.ink,
                  }}
                >
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      opacity: settle,
                      transform: `translateX(${(1 - settle) * 14 * scale}px)`,
                    }}
                  >
                    {value}
                  </span>
                  <Icon name="chevronDown" color={colors.inkSoft} size={16 * scale} />
                </div>
              </div>
            );
          })}
        </div>
        <PreviewTable
          headers={headers}
          rows={rows.map((row) => headers.map((_, j) => (row[j] ? { text: row[j] } : { text: "-", muted: true })))}
          scale={scale}
          highlight={columnGlow}
        />
        {footer(tl.import.next, "next")}
      </>
    );
  } else {
    const shown = IMPORT_FIELDS.filter(({ field }) => mapping[field] !== null);
    body = (
      <>
        <div style={muted}>
          {tl.import.summary(guests.length)}
        </div>
        <PreviewTable
          headers={shown.map(({ label }) => label)}
          rows={guests.map((guest) =>
            shown.map(({ field }): Cell => {
              if (field === "name") return { text: guest.name };
              if (field === "table") return guest.table ? { text: guest.table } : { text: tl.import.unassigned, muted: true };
              if (field === "dietary") return guest.diet ? { text: tl.diet[guest.diet] } : { text: "-", muted: true };
              return guest.note ? { text: guest.note } : { text: "-", muted: true };
            }),
          )}
          scale={scale}
        />
        {footer(tl.import.commit(guests.length), "commit")}
      </>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: drawer ? "100%" : 512 * scale,
        display: "flex",
        flexDirection: "column",
        gap: drawer ? 0 : 16 * scale,
        padding: drawer ? 0 : 16 * scale,
        borderRadius: drawer ? `${12 * scale}px ${12 * scale}px 0 0` : 12 * scale,
        border: drawer ? undefined : `1px solid ${RING}`,
        borderTop: `1px solid ${drawer ? colors.border : RING}`,
        backgroundColor: colors.bg,
        boxShadow: shadow.card,
        fontFamily: fonts.sans,
        color: colors.ink,
      }}
    >
      {drawer ? (
        <div
          style={{
            alignSelf: "center",
            marginTop: 12 * scale,
            width: 48 * scale,
            height: 6 * scale,
            borderRadius: 999,
            backgroundColor: "rgba(123, 115, 107, 0.3)",
          }}
        />
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8 * scale,
          padding: drawer ? 16 * scale : `0 ${28 * scale}px 0 0`,
        }}
      >
        <div style={{ fontFamily: fonts.heading, fontSize: 16 * scale, fontWeight: 500, lineHeight: 1 }}>
          {tl.import.title}
        </div>
        {drawer ? <Icon name="x" color={colors.inkSoft} size={20 * scale} /> : null}
      </div>
      {drawer ? null : (
        <div
          style={{
            position: "absolute",
            top: 8 * scale,
            right: 8 * scale,
            width: 28 * scale,
            height: 28 * scale,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="x" color={colors.ink} size={16 * scale} />
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12 * scale,
          padding: drawer ? `0 ${16 * scale}px ${16 * scale}px` : 0,
          opacity: contentOpacity,
        }}
      >
        {body}
      </div>
    </div>
  );
};
