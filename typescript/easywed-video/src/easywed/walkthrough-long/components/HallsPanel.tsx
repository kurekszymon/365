import React from "react";
import { DRAWER_HANDLE, DrawerHandle, HALL_PANEL, panelShell } from "../../components/HallPanel";
import { Icon } from "../../components/Icon";
import type { Point } from "../../geometry";
import { tl } from "../../i18n";
import type { HallLayout } from "../../layouts";
import { colors, fonts } from "../../theme";

/**
 * Redraws the halls overview: `Sidebar/EntityEditDialog` around
 * `EntityForms/HallsPanelContent` at v1 - the same centred modal the hall
 * settings open in, titled `hall.list_title`. The hint, one bordered row per
 * hall (name, then its floor as *p. 1*; size and entity count under it; a
 * chevron), and the outline *Dodaj salę* button under the rows.
 *
 * Drawn in the app's own CSS pixels, like `HallPanel`, and scaled as a whole
 * by the caller - as a centred modal, or with `drawer` as the phone's bottom
 * sheet (`MobilePanelDrawer`), the same list under a grab handle.
 */
const P = HALL_PANEL;

/** `text-xs` hint: two lines at the dialog's `max-w-md`. */
const HINT = 32;
/** A row: `py-2` round `text-sm` over `text-xs`, plus its 1 px border either side. */
const ROW = 8 + 20 + 16 + 8 + 2;
const ROW_GAP = 8;

const rowsHeight = (rows: number) => rows * ROW + (rows - 1) * ROW_GAP;

export const hallsPanelHeight = (rows: number, drawer = false): number =>
  (drawer ? DRAWER_HANDLE : 0) + P.pad * 2 + P.header + P.gap + HINT + P.gap + rowsHeight(rows) + P.gap + P.button;

/** Where the pointer aims for *Dodaj salę*, in the panel's own unscaled pixels. */
export const hallsPanelAddTarget = (rows: number, width = P.width, drawer = false): Point => ({
  x: width / 2,
  y: hallsPanelHeight(rows, drawer) - P.pad - P.button / 2,
});

/**
 * Entities in a hall, as the row counts them: its tables and its fixtures -
 * and the dance floor, which at v1 is a fixture like the bar
 * (`fixtures.preset.dance_floor`).
 */
const entityCount = (hall: HallLayout) => hall.tables.length + hall.fixtures.length + 1;

const h = tl.app.hallsList;

const HallRow: React.FC<{ hall: HallLayout; index: number }> = ({ hall, index }) => (
  <div
    style={{
      height: ROW,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 10,
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.card,
    }}
  >
    <div>
      <div style={{ height: 20, display: "flex", alignItems: "baseline", fontSize: 14, fontWeight: 500, color: colors.ink }}>
        {hall.name || h.unnamedIndex(index + 1)}
        {hall.floor !== undefined ? (
          <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 400, color: colors.inkSoft }}>
            {h.floorShort(hall.floor)}
          </span>
        ) : null}
      </div>
      <div style={{ height: 16, fontSize: 12, color: colors.inkSoft }}>
        {`${hall.meters.width}×${hall.meters.height} m · ${h.entityCount(entityCount(hall))}`}
      </div>
    </div>
    <Icon name="chevronRight" color={colors.inkSoft} size={16} />
  </div>
);

export const HallsPanel: React.FC<{
  halls: HallLayout[];
  /** *Dodaj salę* held down. */
  addPressed?: boolean;
  /** The phone's bottom sheet rather than the desktop modal. */
  drawer?: boolean;
  /** The panel's width in app pixels - a sheet is as wide as the screen. */
  width?: number;
}> = ({ halls, addPressed = false, drawer = false, width = P.width }) => (
  <div style={panelShell(drawer, width, hallsPanelHeight(halls.length, drawer))}>
    {drawer ? <DrawerHandle /> : null}
    <div style={{ height: P.header, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontFamily: fonts.heading, fontSize: drawer ? 18 : 16, fontWeight: 500, color: colors.ink }}>
        {h.title}
      </div>
      <div
        style={{
          width: P.header,
          height: P.header,
          borderRadius: 999,
          backgroundColor: colors.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="check" color={colors.primaryInk} size={20} />
      </div>
    </div>

    <div style={{ height: HINT, fontSize: 12, lineHeight: "16px", color: colors.inkSoft }}>{h.hint}</div>

    <div style={{ display: "flex", flexDirection: "column", gap: ROW_GAP }}>
      {halls.map((hall, i) => (
        <HallRow key={i} hall={hall} index={i} />
      ))}
    </div>

    <div
      style={{
        height: P.button,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        backgroundColor: addPressed ? colors.bgDeep : colors.secondary,
        fontSize: 14,
        fontWeight: 500,
        color: colors.ink,
      }}
    >
      <Icon name="plus" color={colors.ink} size={16} />
      {h.add}
    </div>
  </div>
);
