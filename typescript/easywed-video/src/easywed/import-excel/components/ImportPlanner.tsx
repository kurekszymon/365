import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { AppFrame } from "../../components/AppFrame";
import { HallCanvas, hallAspect } from "../../components/HallCanvas";
import { Icon, type IconName } from "../../components/Icon";
import { canvasInsets, PlannerCanvas } from "../../components/PlannerCanvas";
import type { RosterGuest } from "../../data";
import { useFormat } from "../../format";
import { tl } from "../../i18n";
import { colors, fonts } from "../../theme";

/**
 * The planner the import happens over: `AppFrame` on the guests tab, the hall
 * with its tables already placed, and the guest panel (`Guests/GuestListContent`)
 * beside it - its no-guests state until the import lands, then the
 * `SeatingProgress` card and the list. Portrait has no room for the panel, so
 * the progress card alone sits over the hall.
 */

/** Dialog size against its CSS spec - bigger in portrait, where it is the whole screen. */
export const dialogScale = (tall: boolean): number => (tall ? 2 : 1.8);

/** The guest panel's scale; its progress card is the beat, so it reads larger than the chrome. */
const PANEL_SCALE = { wide: 1.75, tall: 2.3 };
const PANEL_WIDTH = 600;
const GUEST_ROWS = 5;

/** `AppFrame`'s window corner - the modal layer is clipped to the same window. */
const WINDOW_RADIUS = 24;

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("");

/** `Guests/SeatingProgress`: `guests.progress` and `guests.seated_ratio` over a bar. */
const SeatingProgress: React.FC<{ seated: number; total: number; scale: number }> = ({ seated, total, scale }) => {
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

/** An outline button, as the empty guest list stacks them. */
const OutlineButton: React.FC<{ icon: IconName; label: string; scale: number }> = ({ icon, label, scale }) => (
  <div
    style={{
      height: 32 * scale,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6 * scale,
      borderRadius: 10 * scale,
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.bg,
      fontSize: 14 * scale,
      fontWeight: 500,
      color: colors.ink,
    }}
  >
    <Icon name={icon} color={colors.ink} size={16 * scale} />
    {label}
  </div>
);

const GuestPanel: React.FC<{
  guests: RosterGuest[];
  seated: number;
  listIn: number;
  rowIn: number[];
  scale: number;
}> = ({ guests, seated, listIn, rowIn, scale }) => (
  <div
    style={{
      width: PANEL_WIDTH,
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      gap: 8 * scale,
      padding: `${12 * scale}px ${14 * scale}px`,
      borderRadius: 22,
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.bg,
      overflow: "hidden",
      fontFamily: fonts.sans,
    }}
  >
    <div
      style={{
        fontFamily: fonts.heading,
        fontSize: 18 * scale,
        fontWeight: 600,
        color: colors.ink,
        paddingBottom: 8 * scale,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      {tl.guests.title}
    </div>

    {guests.length === 0 ? (
      <>
        <div style={{ fontSize: 14 * scale, color: colors.inkSoft }}>{tl.guests.none}</div>
        <OutlineButton icon="plus" label={tl.guests.add} scale={scale} />
        <OutlineButton icon="fileSpreadsheet" label={tl.guests.import} scale={scale} />
      </>
    ) : (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8 * scale,
          opacity: listIn,
          transform: `translateY(${interpolate(listIn, [0, 1], [20, 0])}px)`,
        }}
      >
        <SeatingProgress seated={seated} total={guests.length} scale={scale} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8 * scale,
            padding: `${7 * scale}px ${10 * scale}px`,
            borderRadius: 10 * scale,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.card,
            fontSize: 14 * scale,
            color: colors.inkSoft,
          }}
        >
          <Icon name="search" color={colors.inkSoft} size={16 * scale} />
          {tl.guests.search}
        </div>
        {guests.slice(0, GUEST_ROWS).map((guest, i) => (
          <div
            key={guest.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10 * scale,
              padding: `${6 * scale}px ${10 * scale}px`,
              borderRadius: 16 * scale,
              border: `1px solid ${colors.border}`,
              opacity: rowIn[i] ?? 1,
              transform: `translateX(${interpolate(rowIn[i] ?? 1, [0, 1], [30, 0])}px)`,
            }}
          >
            <div
              style={{
                width: 26 * scale,
                height: 26 * scale,
                borderRadius: 999,
                backgroundColor: colors.bgDeep,
                color: colors.inkSoft,
                fontSize: 11 * scale,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {initials(guest.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14 * scale, fontWeight: 600, color: colors.ink, whiteSpace: "nowrap" }}>
                {guest.name}
              </div>
              <div style={{ fontSize: 12 * scale, color: colors.inkSoft, whiteSpace: "nowrap" }}>{guest.table}</div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

type Props = {
  /** Guests on the list - empty until the import is committed. */
  guests: RosterGuest[];
  /** Per-table share of taken seats, indexed like `hall.tables`. */
  seatFill: number[];
  /** Entrance of the progress card, and of each of the first list rows. */
  listIn?: number;
  rowIn?: number[];
  /** Strength of the dialog scrim, 0..1, and the dialog floating over it. */
  scrim?: number;
  modal?: React.ReactNode;
};

export const ImportPlanner: React.FC<Props> = ({ guests, seatFill, listIn = 1, rowIn = [], scrim = 0, modal }) => {
  const { hall, tall, pad } = useFormat();
  const panelScale = tall ? PANEL_SCALE.tall : PANEL_SCALE.wide;

  // Read back off the canvas's own fill, so the card can never disagree with it.
  const seated = hall.tables.reduce((sum, table, i) => sum + Math.round((seatFill[i] ?? 0) * table.seats), 0);

  // The viewport takes the room's aspect ratio within whatever the layout
  // leaves it - measured with container units rather than guessed in pixels.
  const insets = canvasInsets(tall);
  const aspect = hallAspect(hall);
  const insetX = insets.left + insets.right;
  const insetY = insets.top + insets.bottom;
  const canvasWidth = `min(100cqw, calc((100cqh - ${insetY}px) * ${aspect} + ${insetX}px))`;
  const canvasHeight = `calc((${canvasWidth} - ${insetX}px) / ${aspect} + ${insetY}px)`;

  return (
    <AbsoluteFill>
      <AppFrame activeRail="guests">
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: tall ? "column" : "row",
            gap: tall ? 20 : 28,
            padding: tall ? "24px 24px 20px" : "24px 28px",
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {tall ? (
            <div
              style={{
                flexShrink: 0,
                opacity: guests.length > 0 ? listIn : 0,
                transform: `translateY(${interpolate(listIn, [0, 1], [-20, 0])}px)`,
              }}
            >
              <SeatingProgress seated={seated} total={guests.length} scale={panelScale} />
            </div>
          ) : (
            <GuestPanel guests={guests} seated={seated} listIn={listIn} rowIn={rowIn} scale={panelScale} />
          )}

          <div
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              containerType: "size",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: canvasWidth, height: canvasHeight, display: "flex" }}>
              <PlannerCanvas hall={hall} tall={tall}>
                <HallCanvas
                  hall={hall}
                  outline={1}
                  floor={1}
                  tableIn={hall.tables.map(() => 1)}
                  seatFill={seatFill}
                />
              </PlannerCanvas>
            </div>
          </div>
        </div>
      </AppFrame>

      {modal ? (
        <AbsoluteFill style={{ padding: pad }}>
          <div
            style={{
              flex: 1,
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: tall ? "stretch" : "center",
              justifyContent: tall ? "flex-end" : "center",
              borderRadius: WINDOW_RADIUS,
              overflow: "hidden",
            }}
          >
            <AbsoluteFill
              style={{ backgroundColor: colors.scrim, opacity: scrim, backdropFilter: `blur(${4 * scrim}px)` }}
            />
            {modal}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

/** The dialog's own entrance: zoom-in-95 and fade in landscape, a slide up as a drawer. */
export const DialogMotion: React.FC<{ open: number; drawer: boolean; children: React.ReactNode }> = ({
  open,
  drawer,
  children,
}) => (
  <div
    style={{
      position: "relative",
      display: "flex",
      flexDirection: "column",
      opacity: drawer ? 1 : open,
      transform: drawer ? `translateY(${(1 - open) * 100}%)` : `scale(${interpolate(open, [0, 1], [0.95, 1])})`,
    }}
  >
    {children}
  </div>
);
