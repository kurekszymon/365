import React from "react";
import { tl } from "../i18n";
import type { HallLayout } from "../layouts";
import { colors, fonts, shadow } from "../theme";
import { Icon, type IconName } from "./Icon";

type ToolProps = { icon?: IconName; label: string; active?: boolean; scale: number };

/** One of the canvas toolbar's bordered chips. The measure mode switch is the one without a glyph. */
const Tool: React.FC<ToolProps> = ({ icon, label, active, scale }) => {
  const tint = active ? colors.selected : colors.inkSoft;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6 * scale,
        padding: `${5 * scale}px ${8 * scale}px`,
        borderRadius: 6 * scale,
        border: `1px solid ${active ? colors.selected : colors.border}`,
        backgroundColor: active ? colors.selectedSoft : "rgba(253, 251, 246, 0.8)",
        fontFamily: fonts.sans,
        fontSize: 10 * scale,
        color: tint,
      }}
    >
      {icon ? <Icon name={icon} color={tint} size={14 * scale} /> : null}
      {label}
    </div>
  );
};

/** The snap stepper and the zoom pill share this "− value +" shape. */
const Stepper: React.FC<{ value: string; scale: number; round?: boolean }> = ({
  value,
  scale,
  round,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      borderRadius: round ? 999 : 6 * scale,
      border: `1px solid ${colors.border}`,
      backgroundColor: round ? colors.card : "rgba(253, 251, 246, 0.8)",
      boxShadow: round ? "0 8px 20px -12px rgba(40, 60, 45, 0.4)" : undefined,
      fontFamily: fonts.sans,
      fontSize: 10 * scale,
      color: colors.inkSoft,
    }}
  >
    <span style={{ padding: `${4 * scale}px ${8 * scale}px`, fontSize: 13 * scale }}>−</span>
    <span style={{ minWidth: 34 * scale, textAlign: "center" }}>{value}</span>
    <span style={{ padding: `${4 * scale}px ${8 * scale}px`, fontSize: 13 * scale }}>+</span>
  </div>
);

/** Chrome size relative to the frame - one scale for both cuts' furniture. */
export const chromeScale = (tall: boolean): number => (tall ? 1.5 : 1.7);

/** Gap between the viewport's edge and the chrome floating over it. */
const GAP = 10;
/** Heights the insets have to clear, in unscaled units. */
const TOOLBAR_HEIGHT = 26;
const MINIMAP_HEIGHT = 44;
const MINIMAP_CARD = MINIMAP_HEIGHT + 10;

/**
 * Room the chrome needs inside the viewport. The hall is drawn within these, so
 * the toolbar, the zoom pill and the minimap float over the viewport's own
 * margin - inside the planner, as in the app - without ever landing on a table.
 */
export const canvasInsets = (tall: boolean) => {
  const scale = chromeScale(tall);
  return {
    top: (GAP * 2 + TOOLBAR_HEIGHT) * scale,
    bottom: (GAP * 2 + MINIMAP_CARD) * scale,
    left: 16 * scale,
    right: 16 * scale,
  };
};

/**
 * The corner minimap: the room in miniature. The app draws the whole world -
 * every hall - as dots inside a fixed box; with one hall to show, the video
 * draws that hall at its true proportions instead, so the card is a small,
 * honest copy of the plan rather than a scatter of dots.
 */
const Minimap: React.FC<{ hall: HallLayout; scale: number }> = ({ hall, scale }) => {
  const { canvas, danceFloor } = hall;
  const inner = MINIMAP_HEIGHT * scale;
  const width = Math.min(
    Math.max((inner * canvas.width) / canvas.height, 44 * scale),
    108 * scale,
  );
  // Canvas units per minimap pixel - read off the fit the viewBox actually
  // lands on, so hairlines and dashes keep their weight however the room is
  // proportioned.
  const perPx = 1 / Math.min(width / canvas.width, inner / canvas.height);

  return (
    <div
      style={{
        padding: 4 * scale,
        borderRadius: 10 * scale,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.card,
        boxShadow: "0 8px 20px -12px rgba(40, 60, 45, 0.4)",
      }}
    >
      <svg width={width} height={inner} viewBox={`0 0 ${canvas.width} ${canvas.height}`}>
        {/* The room's own dashed footprint, as the app outlines each hall. */}
        <rect
          x={0}
          y={0}
          width={canvas.width}
          height={canvas.height}
          rx={5 * perPx}
          fill={colors.bg}
          stroke={colors.tableBorder}
          strokeWidth={1.2 * perPx}
          strokeDasharray={`${4 * perPx} ${3 * perPx}`}
        />
        <rect
          x={danceFloor.x - danceFloor.width / 2}
          y={danceFloor.y - danceFloor.height / 2}
          width={danceFloor.width}
          height={danceFloor.height}
          rx={4 * perPx}
          fill={colors.fixture}
        />
        {hall.fixtures.map((fixture) => (
          <rect
            key={fixture.id}
            x={fixture.x - fixture.width / 2}
            y={fixture.y - fixture.height / 2}
            width={fixture.width}
            height={fixture.height}
            rx={2 * perPx}
            fill={colors.fixture}
          />
        ))}
        {hall.tables.map((table) =>
          table.shape === "round" ? (
            <circle
              key={table.id}
              cx={table.x}
              cy={table.y}
              r={table.width / 2}
              fill={colors.tableBorder}
            />
          ) : (
            <rect
              key={table.id}
              x={table.x - table.width / 2}
              y={table.y - table.height / 2}
              width={table.width}
              height={table.height}
              rx={3 * perPx}
              fill={colors.tableBorder}
            />
          ),
        )}
      </svg>
    </div>
  );
};

/**
 * The canvas viewport: the app's own gradient-washed surface, the hall drawn
 * inside it, and the chrome floating over its corners - the toolbar top-right,
 * the zoom pill bottom-left and the minimap bottom-right, exactly where the
 * planner puts them.
 */
export const PlannerCanvas: React.FC<{
  hall: HallLayout;
  tall: boolean;
  zoom?: string;
  /**
   * The measure tool switched on: *Mierzenie* lights up and, as in
   * `CanvasToolbar`, its mode switch (`measure.mode.*`) joins the end of the row.
   */
  measureMode?: string;
  children: React.ReactNode;
}> = ({ hall, tall, zoom = "92%", measureMode, children }) => {
  const scale = chromeScale(tall);
  const insets = canvasInsets(tall);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        position: "relative",
        display: "flex",
        borderRadius: 20 * scale,
        border: `1px solid ${colors.border}`,
        // `Canvas.tsx` washes the viewport muted -> background -> planner-soft.
        backgroundImage: `linear-gradient(135deg, rgba(239, 233, 221, 0.6) 0%, ${colors.bg} 46%, rgba(246, 232, 242, 0.5) 100%)`,
        boxShadow: shadow.card,
        overflow: "hidden",
      }}
    >
      {/* Taken out of flow so the hall SVG scales to the viewport instead of
          its own intrinsic aspect ratio pushing the box wider. */}
      <div
        style={{
          position: "absolute",
          top: insets.top,
          right: insets.right,
          bottom: insets.bottom,
          left: insets.left,
          display: "flex",
        }}
      >
        {children}
      </div>

      <div
        style={{
          position: "absolute",
          top: GAP * scale,
          right: GAP * scale,
          display: "flex",
          alignItems: "center",
          gap: 8 * scale,
        }}
      >
        <Stepper value="1 m" scale={scale} />
        <Tool icon="grid" label={tl.app.grid} scale={scale} />
        {tall ? null : (
          <Tool icon="ruler" label={tl.app.measure} active={measureMode !== undefined} scale={scale} />
        )}
        <Tool icon="armchair" label={tl.app.seats} active scale={scale} />
        {measureMode !== undefined ? <Tool label={measureMode} active scale={scale} /> : null}
      </div>

      <div style={{ position: "absolute", left: GAP * scale, bottom: GAP * scale }}>
        <Stepper value={zoom} scale={scale} round />
      </div>

      <div style={{ position: "absolute", right: GAP * scale, bottom: GAP * scale }}>
        <Minimap hall={hall} scale={scale} />
      </div>
    </div>
  );
};
