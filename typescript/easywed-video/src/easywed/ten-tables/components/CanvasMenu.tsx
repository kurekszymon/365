import React from "react";
import { Icon, type IconName } from "../../components/Icon";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";
import { MENU, menuHeight } from "./desk";

/**
 * The canvas's right-click menu at easywed/v1 (`Canvas/Canvas.tsx`,
 * `CanvasContextMenu`, `CanvasViewMenu`, `ui/context-menu.tsx`) as it opens on
 * an empty spot inside the hall with nothing on the clipboard: no edit or copy
 * section, just *Dodaj stół*, *Dodaj stoły* and *Dodaj element*, a separator,
 * then the *Widok* section - *Styl siatki* and *Odległość przyciągania* (with
 * its current *1 m*) as submenus, *Miejsca* and *Mierzenie* as unchecked
 * checkbox rows, since v1 starts with both off.
 *
 * Sizes are the app's CSS pixels times `scale`; it opens with its top-left at
 * the pointer.
 */

const Row: React.FC<{
  icon: IconName;
  label: string;
  scale: number;
  lit?: boolean;
  value?: string;
  submenu?: boolean;
}> = ({ icon, label, scale, lit, value, submenu }) => (
  <div
    style={{
      height: MENU.row * scale,
      display: "flex",
      alignItems: "center",
      gap: 6 * scale,
      padding: `0 ${6 * scale}px`,
      borderRadius: 6 * scale,
      backgroundColor: lit ? colors.accentFill : "transparent",
      fontSize: 14 * scale,
      color: colors.ink,
      whiteSpace: "nowrap",
    }}
  >
    <Icon name={icon} color={colors.ink} size={16 * scale} />
    {label}
    {value ? (
      <span style={{ marginLeft: "auto", paddingLeft: 12 * scale, fontSize: 12 * scale, color: colors.inkSoft }}>{value}</span>
    ) : null}
    {submenu ? (
      <span style={{ marginLeft: value ? 0 : "auto", display: "flex" }}>
        <Icon name="chevronRight" color={colors.ink} size={16 * scale} />
      </span>
    ) : null}
  </div>
);

export const CanvasMenu: React.FC<{
  /** Top-left, at the pointer, in the parent's px. */
  x: number;
  y: number;
  scale: number;
  /** Open, 0..1: `fade-in-0 zoom-in-95` and back. */
  open: number;
  /** The row under the pointer, by its place in the add section. */
  lit?: number;
}> = ({ x, y, scale, open, lit }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: MENU.width * scale,
      height: menuHeight * scale,
      boxSizing: "border-box",
      padding: MENU.pad * scale,
      borderRadius: 10 * scale,
      backgroundColor: colors.card,
      // `shadow-md ring-1 ring-foreground/10`.
      boxShadow: `0 0 0 1px rgba(36, 31, 26, 0.1), 0 ${4 * scale}px ${6 * scale}px -${1 * scale}px rgba(0, 0, 0, 0.1)`,
      fontFamily: fonts.sans,
      opacity: open,
      transformOrigin: "0 0",
      transform: `scale(${0.95 + 0.05 * open})`,
    }}
  >
    <Row icon="table" label={tl.app.canvasMenu.addTable} scale={scale} lit={lit === 0} />
    <Row icon="squarePlus" label={tl.app.canvasMenu.addTables} scale={scale} lit={lit === 1} />
    <Row icon="fixtures" label={tl.app.canvasMenu.addFixture} scale={scale} lit={lit === 2} />
    <div style={{ height: 1, margin: `${4 * scale}px ${-4 * scale}px`, backgroundColor: colors.border }} />
    <div
      style={{
        height: MENU.label * scale,
        display: "flex",
        alignItems: "center",
        padding: `0 ${6 * scale}px`,
        fontSize: 12 * scale,
        fontWeight: 500,
        color: colors.inkSoft,
      }}
    >
      {tl.app.canvasMenu.view}
    </div>
    <Row icon="grid" label={tl.app.canvasMenu.gridStyle} scale={scale} submenu />
    <Row icon="magnet" label={tl.app.canvasMenu.snap} scale={scale} value={tl.app.canvasMenu.metres(1)} submenu />
    <Row icon="armchair" label={tl.app.canvasMenu.seats} scale={scale} />
    <Row icon="ruler" label={tl.app.canvasMenu.measure} scale={scale} />
  </div>
);
