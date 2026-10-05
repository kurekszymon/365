import React from "react";
import { interpolate, spring } from "remotion";
import { AppFrame } from "../../../components/AppFrame";
import { HallCanvas } from "../../../components/HallCanvas";
import { PlannerCanvas } from "../../../components/PlannerCanvas";
import { tl } from "../../../i18n";
import { TEN_TABLES_HALL } from "../../../layouts";
import { colors, fonts } from "../../../theme";
import {
  CLICK_ADD,
  CLICK_MENU,
  DIALOG_IN,
  FIXTURE_MOVES,
  HUB_HOVER,
  HUB_IN,
  JUMP_FLOOR,
  JUMP_TABLES,
  MENU_HOVER,
  MENU_IN,
  MENU_OUT,
  PANEL_IN,
  PRESS_HELD,
  TABLE_IN_FROM,
  TABLE_STAGGER,
} from "../script";
import { batchFormAt, draggingAt, fixtureAt, fixtureSpec, MENU_AT } from "../state";
import { AddHubDialog } from "./AddHubDialog";
import { CanvasMenu } from "./CanvasMenu";
import { APP_PX, CANVAS_BOX, CONTENT, DESK } from "./desk";
import { FixturesPanel } from "./FixturesPanel";
import { TableBatchDialog } from "./TableBatchDialog";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * Type sizes on the canvas, in hall units. v1 writes a fixture's name at
 * `text-xs` and a table's count at 10 px - 12 and 10 units at 100% - which
 * would be a few pixels tall on a phone; these keep them readable while
 * staying well inside a 1.5 m table.
 */
const COUNT_SIZE = 20;
const FIXTURE_LABEL_SIZE = 22;
/** *Wejście* is 0.3 m deep - 18 units - so its name is set to fit inside it, as `text-xs` fits it in the app. */
const ENTRANCE_LABEL_SIZE = 15;

/** `FixtureVisual`: `rounded-sm` for a rectangle, `rounded-3xl` - a pill at this height - for *Wejście*'s `rounded`. */
const cornerFor = (id: string, height: number) => (id === "entrance" ? height / 2 : 4);

/**
 * The couple's laptop at `frame` on the cut's clock, in desk pixels: the
 * signed-in desktop planner on an empty 14x16 m hall with *Miejsca* off, as v1
 * starts, then the canvas menu, the batch dialog, the ten tables, the
 * *Elementy sali* panel and the add hub, and the three fixtures dragged into
 * place. Unnamed tables carry no name on the canvas at v1 (`TableVisual` draws
 * one only when `hasName`), just their `0 / 8`.
 */
export const TenTablesDesk: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const hall = TEN_TABLES_HALL;

  const tableIn = hall.tables.map((_, i) =>
    frame < JUMP_TABLES ? 0 : spring({ frame: frame - (TABLE_IN_FROM + i * TABLE_STAGGER), fps, config: { damping: 13, mass: 0.6 } }),
  );
  const placed = FIXTURE_MOVES.map((move) => {
    const topLeft = fixtureAt(move, frame);
    return topLeft ? { move, spec: fixtureSpec(move, topLeft) } : null;
  }).filter((f) => f !== null);
  const dragging = draggingAt(frame);

  // The minimap draws the room as it stands: only what has landed on the canvas.
  const floor = placed.find((f) => f.move.id === "floor");
  const landed = {
    ...hall,
    tables: hall.tables.filter((_, i) => tableIn[i] >= 0.5),
    danceFloor: floor ? floor.spec : { ...hall.danceFloor, width: 0, height: 0 },
    fixtures: placed.filter((f) => f.move.id !== "floor").map((f) => f.spec),
  };

  // `useTabBadgeCounts`: tables and fixtures are plain totals; with no guests and no reminders those draw no badge.
  const badges = { tables: landed.tables.length, fixtures: placed.length, guests: 0, reminders: 0 };

  const menu =
    frame >= MENU_IN[0] && frame < MENU_OUT[1]
      ? interpolate(frame, MENU_IN, [0, 1], clamp) * interpolate(frame, MENU_OUT, [1, 0], clamp)
      : 0;
  const batch = frame >= DIALOG_IN[0] && frame < JUMP_TABLES ? interpolate(frame, DIALOG_IN, [0, 1], clamp) : 0;
  const panel = frame >= PANEL_IN[0] && frame < JUMP_FLOOR ? interpolate(frame, PANEL_IN, [0, 1], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) }) : 0;
  const hub = frame >= HUB_IN[0] && frame < JUMP_FLOOR ? interpolate(frame, HUB_IN, [0, 1], clamp) : 0;
  const scrim = Math.max(batch, hub);

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: DESK.width, height: DESK.height }}>
      <AppFrame
        activeRail={panel > 0 ? "fixtures" : null}
        railOpen={panel > 0}
        desktop
        badges={badges}
        railLabels={{ fixtures: tl.app.fixturesPanel.title }}
      >
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              left: CANVAS_BOX.x - CONTENT.x,
              top: CANVAS_BOX.y - CONTENT.y,
              width: CANVAS_BOX.width,
              height: CANVAS_BOX.height,
              display: "flex",
            }}
          >
            <PlannerCanvas hall={landed} tall={false} seatsOn={false}>
              <HallCanvas hall={{ ...hall, tables: [], fixtures: [] }} outline={1} floor={0} tableIn={[]} seatFill={[]}>
                {hall.tables.map((table, i) => {
                  const enter = tableIn[i];
                  return (
                    <g
                      key={table.id}
                      transform={`translate(${table.x} ${table.y}) scale(${enter})`}
                      opacity={interpolate(enter, [0, 0.4], [0, 1], clamp)}
                    >
                      <circle r={table.width / 2} fill={colors.table} stroke={colors.tableBorder} strokeWidth={1.5} />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontFamily={fonts.sans}
                        fontSize={COUNT_SIZE}
                        fill={colors.tableInk}
                        opacity={0.75}
                      >
                        {`0 / ${table.seats}`}
                      </text>
                    </g>
                  );
                })}
                {placed.map(({ move, spec }) => {
                  const selected = dragging?.id === move.id;
                  return (
                    <g key={move.id}>
                      <rect
                        x={spec.x - spec.width / 2}
                        y={spec.y - spec.height / 2}
                        width={spec.width}
                        height={spec.height}
                        rx={cornerFor(move.id, spec.height)}
                        fill={colors.fixture}
                        stroke={selected ? colors.selected : colors.fixtureBorder}
                        strokeWidth={selected ? 3 : 1.5}
                      />
                      <text
                        x={spec.x}
                        y={spec.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontFamily={fonts.sans}
                        fontSize={move.id === "entrance" ? ENTRANCE_LABEL_SIZE : FIXTURE_LABEL_SIZE}
                        fontWeight={500}
                        fill={colors.fixtureInk}
                      >
                        {spec.label}
                      </text>
                    </g>
                  );
                })}
              </HallCanvas>
            </PlannerCanvas>
          </div>

          {panel > 0 ? <FixturesPanel open={panel} pressed={frame >= CLICK_ADD && frame < CLICK_ADD + PRESS_HELD} /> : null}
        </div>
      </AppFrame>

      {/* `DialogOverlay`: `bg-black/10` with `backdrop-blur-xs`, over the whole screen. */}
      {scrim > 0 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: colors.scrim,
            backdropFilter: `blur(${4 * scrim}px)`,
            opacity: scrim,
          }}
        />
      ) : null}

      {menu > 0 ? (
        <CanvasMenu x={MENU_AT.x} y={MENU_AT.y} scale={APP_PX} open={menu} lit={frame >= MENU_HOVER && frame <= CLICK_MENU ? 1 : undefined} />
      ) : null}
      {batch > 0 ? <TableBatchDialog form={batchFormAt(frame)} opacity={batch} /> : null}
      {hub > 0 ? <AddHubDialog opacity={hub} hovered={frame >= HUB_HOVER ? "dance-floor" : undefined} /> : null}
    </div>
  );
};
