import React from "react";
import { interpolate, spring } from "remotion";
import { AppFrame } from "../../../components/AppFrame";
import { GuestList } from "../../../components/GuestList";
import { HallCanvas, hallAspect, PAD as HALL_PAD } from "../../../components/HallCanvas";
import { canvasInsets, chromeScale, PlannerCanvas } from "../../../components/PlannerCanvas";
import { SeatingProgress } from "../../../components/SeatingProgress";
import { rosterFor } from "../../../data";
import type { Point } from "../../../geometry";
import { tl } from "../../../i18n";
import { COUCH_HALL } from "../../../layouts";
import { HEIGHT, WIDTH } from "../../../timeline";
import { colors, fonts } from "../../../theme";
import { FILL, FLOOR_IN, LIST_FROM, TABLE_IN } from "../script";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** The laptop's screen, at the landscape cut's own size - so its chrome is the 16:9 films'. */
export const DESK = { width: WIDTH, height: HEIGHT };

/** App CSS px to desktop px, as `AppFrame` and `PlannerCanvas` scale their chrome in landscape. */
const APP_PX = chromeScale(false);

/**
 * `AppFrame`'s content box on the desktop, worked out from its own spec: the
 * 44 px margin and the window's 1 px border, the header (8 px padding either
 * side of its 32 px buttons, and a border) above, the 76 px rail and its border
 * to the left. The camera and the pointer aim through it, so a pixel of
 * rounding here moves neither by more than a pixel.
 */
const FRAME_MARGIN = 44 + 1;
const HEADER = (8 * 2 + 32) * APP_PX + 1;
const RAIL = 76 * APP_PX + 1;
const CONTENT = {
  x: FRAME_MARGIN + RAIL,
  y: FRAME_MARGIN + HEADER,
  width: DESK.width - FRAME_MARGIN * 2 - RAIL,
  height: DESK.height - FRAME_MARGIN * 2 - HEADER,
};

/**
 * Inside the content box: its padding, and the guest panel with the gap beside
 * it - the import cut's desktop, the panel a little wider so a row reading
 * *Przy stole: Stół pary młodej* clears its seat, edit and delete buttons.
 */
const INNER = { x: 28, y: 24 };
const PANEL = { width: 660, scale: 1.6, gap: 28 };

/** Where the planner sits on the laptop with the guest panel shut or open. */
export type DeskLayout = {
  panel: boolean;
  /** The canvas viewport, in desk pixels. */
  box: { x: number; y: number; width: number; height: number };
  /** Desk pixels per hall unit. */
  unit: number;
  /** The hall's (0, 0) on the desk. */
  origin: Point;
};

/**
 * The viewport takes the room's aspect ratio inside whatever the panel leaves
 * it, as `PlanScene` sizes it, so the hall fills the viewport and the chrome
 * floats against the walls.
 */
export const deskLayout = (panel: boolean): DeskLayout => {
  const side = panel ? PANEL.width + PANEL.gap : 0;
  const region = {
    x: CONTENT.x + INNER.x + side,
    y: CONTENT.y + INNER.y,
    width: CONTENT.width - INNER.x * 2 - side,
    height: CONTENT.height - INNER.y * 2,
  };
  const insets = canvasInsets(false);
  const insetX = insets.left + insets.right;
  const insetY = insets.top + insets.bottom;
  const aspect = hallAspect(COUCH_HALL);
  const drawWidth = Math.min(region.width - insetX, (region.height - insetY) * aspect);
  const width = drawWidth + insetX;
  const height = drawWidth / aspect + insetY;
  const box = {
    x: region.x + (region.width - width) / 2,
    y: region.y + (region.height - height) / 2,
    width,
    height,
  };
  const unit = drawWidth / (COUCH_HALL.canvas.width + HALL_PAD.left + HALL_PAD.right);
  return {
    panel,
    box,
    unit,
    origin: { x: box.x + insets.left + HALL_PAD.left * unit, y: box.y + insets.top + HALL_PAD.top * unit },
  };
};

export const hallToDesk = (p: Point, layout: DeskLayout): Point => ({
  x: layout.origin.x + p.x * layout.unit,
  y: layout.origin.y + p.y * layout.unit,
});

/** The panel is open from the moment the guests are on the list. */
export const layoutAt = (frame: number): DeskLayout => deskLayout(frame >= LIST_FROM);

/** `getInitials` in the app's `Canvas/utils.ts`: the first letters of the first two words. */
const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

/** The whole list, each guest with the chair they end up on: the n-th guest a row names for a table takes its n-th seat. */
const ROSTER = rosterFor(COUCH_HALL.tables);
const SEAT_OF = ROSTER.map((guest) => ROSTER.filter((other) => other.table === guest.table).indexOf(guest));
const INITIALS = COUCH_HALL.tables.map((table) =>
  ROSTER.filter((guest) => guest.table === table.label).map((guest) => getInitials(guest.name)),
);

/**
 * The couple's laptop at `frame` on the cut's clock: the hall guest mode
 * seeded, laid out - the dance floor and the bar, then the tables - and then
 * seated table by table, the guest panel open beside it from 21:05 with its
 * *Rozsadzeni* card and the list read back off the same seats.
 */
export const CouchDesk: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const hall = COUCH_HALL;
  const layout = layoutAt(frame);

  const floor = interpolate(frame, FLOOR_IN, [0, 1], clamp);
  const tableIn = hall.tables.map((table) =>
    spring({ frame: frame - TABLE_IN[table.id], fps, config: { damping: 13, mass: 0.6 } }),
  );
  const seatFill = hall.tables.map((table) => interpolate(frame, FILL[table.id], [0, 1], clamp));

  // A guest is on their chair once `PlannerTable` has it more than half taken,
  // the same point its initials appear - so the list and the card can never
  // disagree with the canvas.
  const guests = ROSTER.map((guest, i) => {
    const t = hall.tables.findIndex((table) => table.label === guest.table);
    const taken = seatFill[t] * hall.tables[t].seats - SEAT_OF[i];
    return taken >= 0.5 ? guest : { ...guest, table: "" };
  });
  const seated = guests.filter((guest) => guest.table).length;

  // `useTabBadgeCounts`: unseated guests, tables, fixtures - the dance floor is one - and open reminders.
  const badges = {
    guests: layout.panel ? guests.length - seated : 0,
    tables: tableIn.filter((enter) => enter >= 0.5).length,
    fixtures: floor >= 0.5 ? hall.fixtures.length + 1 : 0,
    reminders: 0,
  };

  // The minimap draws the room as it stands: only what has landed on the canvas.
  const landed = {
    ...hall,
    tables: hall.tables.filter((_, i) => tableIn[i] >= 0.5),
    fixtures: floor >= 0.5 ? hall.fixtures : [],
    danceFloor: floor >= 0.5 ? hall.danceFloor : { ...hall.danceFloor, width: 0, height: 0 },
  };

  const panelWidth = (PANEL.width - 14 * PANEL.scale * 2) / PANEL.scale;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: DESK.width, height: DESK.height }}>
      <AppFrame activeRail={layout.panel ? "guests" : "tables"} desktop badges={badges}>
        <div style={{ flex: 1, position: "relative" }}>
          {layout.panel ? (
            <div
              style={{
                position: "absolute",
                left: INNER.x,
                top: INNER.y,
                bottom: INNER.y,
                width: PANEL.width,
                display: "flex",
                flexDirection: "column",
                gap: 8 * PANEL.scale,
                padding: `${12 * PANEL.scale}px ${14 * PANEL.scale}px`,
                borderRadius: 22,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.bg,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 18 * PANEL.scale,
                  fontWeight: 600,
                  color: colors.ink,
                  paddingBottom: 8 * PANEL.scale,
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                {tl.guests.title}
              </div>
              <SeatingProgress seated={seated} total={guests.length} scale={PANEL.scale} />
              <div style={{ width: panelWidth, transformOrigin: "0 0", transform: `scale(${PANEL.scale})` }}>
                <GuestList
                  guests={guests}
                  width={panelWidth}
                  tagged={guests.map(() => 1)}
                  scroll={0}
                  listHeight={400}
                />
              </div>
            </div>
          ) : null}

          <div
            style={{
              position: "absolute",
              left: layout.box.x - CONTENT.x,
              top: layout.box.y - CONTENT.y,
              width: layout.box.width,
              height: layout.box.height,
              display: "flex",
            }}
          >
            <PlannerCanvas hall={landed} tall={false}>
              <HallCanvas
                hall={hall}
                outline={1}
                floor={floor}
                tableIn={tableIn}
                seatFill={seatFill}
                seatInitials={INITIALS}
              />
            </PlannerCanvas>
          </div>
        </div>
      </AppFrame>
    </div>
  );
};
