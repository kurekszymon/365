import React from "react";
import type { HallLayout } from "../layouts";
import { colors, fonts } from "../theme";
import { Icon, type IconName } from "./Icon";

type ToolProps = { icon: IconName; label: string; active?: boolean; scale: number };

/** One of the canvas toolbar's bordered chips. */
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
      <Icon name={icon} color={tint} size={14 * scale} />
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

/** The corner minimap: the room's footprint with a dot per table. */
const Minimap: React.FC<{ hall: HallLayout; scale: number }> = ({ hall, scale }) => {
  const width = 108 * scale;
  const height = (width * hall.canvas.height) / hall.canvas.width;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 8 * scale,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.card,
        boxShadow: "0 10px 24px -16px rgba(40, 60, 45, 0.5)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {hall.tables.map((table) => (
        <div
          key={table.id}
          style={{
            position: "absolute",
            left: `${(table.x / hall.canvas.width) * 100}%`,
            top: `${(table.y / hall.canvas.height) * 100}%`,
            width: 5 * scale,
            height: 5 * scale,
            marginLeft: -2.5 * scale,
            marginTop: -2.5 * scale,
            borderRadius: 999,
            backgroundColor: colors.tableBorder,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: `${((hall.danceFloor.x - hall.danceFloor.width / 2) / hall.canvas.width) * 100}%`,
          top: `${((hall.danceFloor.y - hall.danceFloor.height / 2) / hall.canvas.height) * 100}%`,
          width: `${(hall.danceFloor.width / hall.canvas.width) * 100}%`,
          height: `${(hall.danceFloor.height / hall.canvas.height) * 100}%`,
          borderRadius: 3 * scale,
          backgroundColor: colors.fixture,
        }}
      />
    </div>
  );
};

/**
 * The canvas viewport: the hall itself plus the chrome that floats over it -
 * the toolbar top-right, the zoom pill bottom-left and the minimap
 * bottom-right, exactly where the planner puts them.
 */
export const PlannerCanvas: React.FC<{
  hall: HallLayout;
  tall: boolean;
  zoom?: string;
  children: React.ReactNode;
}> = ({ hall, tall, zoom = "92%", children }) => {
  const scale = tall ? 1.5 : 1.7;

  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: "relative", display: "flex" }}>
      {/* Taken out of flow so the hall SVG scales to the viewport instead of
          its own intrinsic aspect ratio pushing the box wider. */}
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>{children}</div>

      <div
        style={{
          position: "absolute",
          top: 12 * scale,
          right: 12 * scale,
          display: "flex",
          alignItems: "center",
          gap: 8 * scale,
        }}
      >
        <Stepper value="1 m" scale={scale} />
        <Tool icon="grid" label="Siatka" scale={scale} />
        {tall ? null : <Tool icon="ruler" label="Mierzenie" scale={scale} />}
        <Tool icon="armchair" label="Miejsca" active scale={scale} />
      </div>

      <div style={{ position: "absolute", left: 12 * scale, bottom: 12 * scale }}>
        <Stepper value={zoom} scale={scale} round />
      </div>

      <div style={{ position: "absolute", right: 12 * scale, bottom: 12 * scale }}>
        <Minimap hall={hall} scale={scale} />
      </div>
    </div>
  );
};
