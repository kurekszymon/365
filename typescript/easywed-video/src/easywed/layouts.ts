import { tl } from "./i18n";
import { range } from "./geometry";

export type TableSpec = {
  id: string;
  label: string;
  shape: "round" | "rect";
  /** Center point, in canvas coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
  seats: number;
};

export type FixtureSpec = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HallLayout = {
  /** Shown in the hall's label chip, like the app's "Sala · 40×30 m". */
  name: string;
  canvas: { width: number; height: number };
  danceFloor: { x: number; y: number; width: number; height: number };
  tables: TableSpec[];
  fixtures: FixtureSpec[];
  totalSeats: number;
  /** Room size in metres - the canvas is drawn at `PX_PER_M` units per metre. */
  meters: { width: number; height: number };
  /** `hall.floor`, when one is set - the chip and the halls list show it as *p. 1*. */
  floor?: number;
  /** `hall.position` on the world canvas, in metres. Every published film's one hall sits at the origin. */
  position?: { x: number; y: number };
};

/** Canvas units per metre, so the 1 m grid lands on whole numbers. */
export const PX_PER_M = 60;

const withDerived = (hall: Omit<HallLayout, "totalSeats" | "meters">): HallLayout => ({
  ...hall,
  totalSeats: hall.tables.reduce((sum, t) => sum + t.seats, 0),
  meters: {
    width: Math.round(hall.canvas.width / PX_PER_M),
    height: Math.round(hall.canvas.height / PX_PER_M),
  },
});

/**
 * The landscape room, for the 16:9 cut. A 22x14 m hall: a seated round table is
 * ~3.2 m across here, so the columns, the bottom row and the dance floor are
 * spaced at least half a metre apart - no seat ring grazes another, a fixture
 * or a wall.
 */
export const WIDE_HALL = withDerived({
  name: tl.hall.name,
  canvas: { width: 1320, height: 840 },
  danceFloor: { x: 660, y: 430, width: 380, height: 220 },
  tables: [
    { id: "head", label: tl.hall.headTable, shape: "rect", x: 660, y: 120, width: 360, height: 84, seats: 10 },
    { id: "t1", label: tl.hall.table(1), shape: "round", x: 200, y: 330, width: 140, height: 140, seats: 8 },
    { id: "t2", label: tl.hall.table(2), shape: "round", x: 200, y: 570, width: 140, height: 140, seats: 8 },
    { id: "t3", label: tl.hall.table(3), shape: "round", x: 1120, y: 330, width: 140, height: 140, seats: 8 },
    { id: "t4", label: tl.hall.table(4), shape: "round", x: 1120, y: 570, width: 140, height: 140, seats: 8 },
    { id: "t5", label: tl.hall.table(5), shape: "round", x: 490, y: 690, width: 140, height: 140, seats: 8 },
    { id: "t6", label: tl.hall.table(6), shape: "round", x: 830, y: 690, width: 140, height: 140, seats: 8 },
  ],
  fixtures: [
    { id: "bar", label: tl.hall.bar, x: 200, y: 780, width: 200, height: 56 },
    { id: "cake", label: tl.hall.cakeTable, x: 1120, y: 780, width: 200, height: 56 },
  ],
});

/**
 * A portrait room for the 9:16 cut. Not the landscape hall cropped - a vertical
 * video needs a vertical room, so the tables are rearranged into two columns
 * flanking the dance floor with the head table at the top. Same 58 seats, so
 * the guest count reads identically in both cuts.
 */
export const TALL_HALL = withDerived({
  name: tl.hall.name,
  // A 14x16 m room rather than 12x15: a seated round table is ~3 m across, so
  // the columns need the extra metre either side to stop neighbouring seat
  // rings from touching each other, the walls and the dance floor.
  canvas: { width: 840, height: 960 },
  danceFloor: { x: 420, y: 420, width: 300, height: 220 },
  tables: [
    { id: "head", label: tl.hall.headTable, shape: "rect", x: 420, y: 110, width: 320, height: 80, seats: 10 },
    { id: "t1", label: tl.hall.table(1), shape: "round", x: 120, y: 330, width: 130, height: 130, seats: 8 },
    { id: "t2", label: tl.hall.table(2), shape: "round", x: 720, y: 330, width: 130, height: 130, seats: 8 },
    { id: "t3", label: tl.hall.table(3), shape: "round", x: 120, y: 560, width: 130, height: 130, seats: 8 },
    { id: "t4", label: tl.hall.table(4), shape: "round", x: 720, y: 560, width: 130, height: 130, seats: 8 },
    { id: "t5", label: tl.hall.table(5), shape: "round", x: 250, y: 800, width: 130, height: 130, seats: 8 },
    { id: "t6", label: tl.hall.table(6), shape: "round", x: 590, y: 800, width: 130, height: 130, seats: 8 },
  ],
  fixtures: [{ id: "bar", label: tl.hall.bar, x: 420, y: 620, width: 240, height: 56 }],
});

/**
 * The odd-room loop's hall: the landscape room's 22x14 m, planned as the L it
 * turns out to be. Every table, seat ring and fixture stays clear of the
 * top-right quarter that `lShapeVertices` cuts away - the app re-clamps a
 * hall's entities into its new outline (`setHallShape`), so anything standing
 * there would jump. The same half-metre clearances as the other two rooms, and
 * the same 58 seats, so the count reads identically across cuts.
 */
export const L_HALL = withDerived({
  name: tl.hall.name,
  canvas: { width: 1320, height: 840 },
  // Beside Stół 6 in the L's bottom wing, the bar standing on end at the far wall.
  danceFloor: { x: 1047, y: 630, width: 280, height: 220 },
  tables: [
    { id: "head", label: tl.hall.headTable, shape: "rect", x: 330, y: 140, width: 360, height: 84, seats: 10 },
    { id: "t1", label: tl.hall.table(1), shape: "round", x: 140, y: 370, width: 140, height: 140, seats: 8 },
    { id: "t2", label: tl.hall.table(2), shape: "round", x: 520, y: 370, width: 140, height: 140, seats: 8 },
    { id: "t3", label: tl.hall.table(3), shape: "round", x: 330, y: 535, width: 140, height: 140, seats: 8 },
    { id: "t4", label: tl.hall.table(4), shape: "round", x: 140, y: 700, width: 140, height: 140, seats: 8 },
    { id: "t5", label: tl.hall.table(5), shape: "round", x: 520, y: 700, width: 140, height: 140, seats: 8 },
    { id: "t6", label: tl.hall.table(6), shape: "round", x: 770, y: 630, width: 140, height: 140, seats: 8 },
  ],
  fixtures: [{ id: "bar", label: tl.hall.bar, x: 1245, y: 630, width: 56, height: 200 }],
});

/**
 * The keep-apart cut's room, as the couple left it before the video starts:
 * `TALL_HALL`'s 14x16 m, its round tables in two columns either side of the
 * dance floor. Stół 6 stands right under the DJ booth. Two tables are named
 * by the couple (`mum`, `dad` - what were Stół 4 and 5), and those two stand
 * one behind the other on the left. Stół 6 goes first, into the bottom-left
 * corner, which is clear from the start; Rodzina taty then takes the spot
 * Stół 6 left, across the dance floor from Rodzina mamy. The same half-metre
 * clearances as the other rooms, and the same 58 seats.
 *
 * A round table is 130 units, so a centre at 5 past a whole metre puts its
 * top-left corner - what the app snaps (`snapPositionToGrid`) - on the grid.
 * Moved tables come last, so they are drawn over the dance floor they cross.
 */
export const KEEP_APART_HALL = withDerived({
  name: tl.hall.name,
  canvas: { width: 840, height: 960 },
  danceFloor: { x: 425, y: 545, width: 300, height: 240 },
  tables: [
    { id: "head", label: tl.hall.headTable, shape: "rect", x: 425, y: 120, width: 320, height: 80, seats: 10 },
    { id: "t1", label: tl.hall.table(1), shape: "round", x: 725, y: 605, width: 130, height: 130, seats: 8 },
    { id: "t2", label: tl.hall.table(2), shape: "round", x: 425, y: 845, width: 130, height: 130, seats: 8 },
    { id: "t3", label: tl.hall.table(3), shape: "round", x: 725, y: 845, width: 130, height: 130, seats: 8 },
    { id: "mum", label: tl.keepApart.mumsFamily, shape: "round", x: 125, y: 605, width: 130, height: 130, seats: 8 },
    { id: "t6", label: tl.hall.table(6), shape: "round", x: 725, y: 365, width: 130, height: 130, seats: 8 },
    { id: "dad", label: tl.keepApart.dadsFamily, shape: "round", x: 125, y: 365, width: 130, height: 130, seats: 8 },
  ],
  fixtures: [{ id: "dj", label: tl.hall.djBooth, x: 725, y: 120, width: 180, height: 60 }],
});

/**
 * The sunday-couch cut's room: the hall guest mode opens on by itself -
 * `/wedding/local` seeds `DEFAULT_HALL` when there is none, **unnamed** and a
 * 20x12 m rectangle - laid out over one evening. The canvas's own
 * `hall.empty_state` never shows in that flow, since there is always a hall to
 * draw. The head table faces the dance floor across the room, the bar stands in
 * the top-right corner with Stół 3 beside it, and every seat ring keeps half a
 * metre from the walls, the floor and its neighbours, as in the other rooms.
 * Seven tables and the same 58 seats.
 */
export const COUCH_HALL = withDerived({
  name: "",
  canvas: { width: 1200, height: 720 },
  danceFloor: { x: 600, y: 370, width: 300, height: 160 },
  tables: [
    { id: "head", label: tl.hall.headTable, shape: "rect", x: 600, y: 110, width: 320, height: 80, seats: 10 },
    { id: "t1", label: tl.hall.table(1), shape: "round", x: 160, y: 250, width: 130, height: 130, seats: 8 },
    { id: "t2", label: tl.hall.table(2), shape: "round", x: 160, y: 540, width: 130, height: 130, seats: 8 },
    { id: "t3", label: tl.hall.table(3), shape: "round", x: 1040, y: 250, width: 130, height: 130, seats: 8 },
    { id: "t4", label: tl.hall.table(4), shape: "round", x: 1040, y: 540, width: 130, height: 130, seats: 8 },
    { id: "t5", label: tl.hall.table(5), shape: "round", x: 420, y: 588, width: 130, height: 130, seats: 8 },
    { id: "t6", label: tl.hall.table(6), shape: "round", x: 780, y: 588, width: 130, height: 130, seats: 8 },
  ],
  fixtures: [{ id: "bar", label: tl.hall.bar, x: 1040, y: 60, width: 240, height: 56 }],
});

/**
 * The table-shape cut's room: `TALL_HALL`'s 14x16 m and its arrangement, but
 * set with v1's round preset, *Okrągły 8* - Ø 1.5 m (`TABLE_PRESETS`), where
 * `TALL_HALL`'s 130 units would read 2.1666… m in the table form's
 * *Średnica*. Stół 3 stands against the left wall with its top-left corner -
 * what the app keeps as the table's `position` through every edit - on the
 * metre grid at (1, 8), so the table it becomes, 3x1 m and then turned
 * upright along that wall, clears Stół 1, Stół 5, the dance floor and the
 * wall by the same half metre as the other rooms. The same 58 seats.
 */
export const TABLE_SHAPE_HALL = withDerived({
  name: tl.hall.name,
  canvas: { width: 840, height: 960 },
  danceFloor: { x: 420, y: 420, width: 300, height: 220 },
  tables: [
    { id: "head", label: tl.hall.headTable, shape: "rect", x: 420, y: 110, width: 320, height: 80, seats: 10 },
    { id: "t1", label: tl.hall.table(1), shape: "round", x: 105, y: 285, width: 90, height: 90, seats: 8 },
    { id: "t2", label: tl.hall.table(2), shape: "round", x: 735, y: 285, width: 90, height: 90, seats: 8 },
    { id: "t3", label: tl.hall.table(3), shape: "round", x: 105, y: 525, width: 90, height: 90, seats: 8 },
    { id: "t4", label: tl.hall.table(4), shape: "round", x: 735, y: 525, width: 90, height: 90, seats: 8 },
    { id: "t5", label: tl.hall.table(5), shape: "round", x: 255, y: 825, width: 90, height: 90, seats: 8 },
    { id: "t6", label: tl.hall.table(6), shape: "round", x: 585, y: 825, width: 90, height: 90, seats: 8 },
  ],
  fixtures: [{ id: "bar", label: tl.hall.bar, x: 420, y: 640, width: 240, height: 56 }],
});

/**
 * The ciocie-single cut's room: `TALL_HALL`'s 14x16 m and its exact
 * arrangement - Stół 2 top right at (12, 5.5) m, Stół 5 bottom left at
 * (4.17, 13.33) m, the dance floor centred at (7, 7) m between them - but set
 * with Ø 1.8 m round tables. `TALL_HALL`'s 130 units would read
 * 2.1666666666666665 in the table form's *Średnica*, which the cut opens; and
 * the app truncates a name to the table's width less `px-1`, so v1's Ø 1.5 m
 * preset leaves too little room for *Single* at the whole-room zoom the
 * payoff pulls back to. The tables only shrink, so every clearance grows.
 * The same 58 seats.
 */
export const CIOCIE_HALL = withDerived({
  ...TALL_HALL,
  tables: TALL_HALL.tables.map((table) => (table.shape === "round" ? { ...table, width: 108, height: 108 } : table)),
});

/**
 * `DEFAULT_HALL` at easywed/v1 as `/wedding/local` seeds it on a first visit
 * (`routes/wedding.local.tsx`: no hall, so `addHall(DEFAULT_HALL, { x: 0, y: 0 })`):
 * unnamed, a 20x12 m rectangle, and nothing in it - no tables, no fixtures, no
 * dance floor. The try-now cut opens on it. It seats nobody, and the film never
 * shows a guest count beyond the fresh plan's own *0/0*.
 */
export const SEEDED_HALL = withDerived({
  name: "",
  canvas: { width: 20 * PX_PER_M, height: 12 * PX_PER_M },
  danceFloor: { x: 0, y: 0, width: 0, height: 0 },
  tables: [],
  fixtures: [],
});

/** `HALL_GAP` in the app's `planner.store.ts`: the metres `nextHallPosition` leaves between halls. */
export const HALL_GAP = 3;

/**
 * The long walkthrough's second hall: what *Dodaj salę* makes of
 * `DEFAULT_HALL` at v1 - no name, a 20x12 m rectangle, whatever the screen -
 * once *Piętro* is set to 1, placed where `nextHallPosition` puts a second
 * hall: beside the first, 3 m clear of it. So its position follows the room
 * each format draws first. A dance floor and a bar and **no tables**, so the
 * wedding still seats 58. Both stay clear of the top-right quarter
 * `lShapeVertices` cuts away, since `setHallShape` re-clamps whatever stands
 * there, with the same half-metre clearances as the other rooms.
 */
export const secondHallBeside = (first: HallLayout): HallLayout =>
  withDerived({
    // Empty, as the app stores it: the chip reads `hall.unnamed`, the halls list `hall.unnamed_index`.
    name: "",
    canvas: { width: 1200, height: 720 },
    danceFloor: { x: 300, y: 450, width: 360, height: 240 },
    tables: [],
    fixtures: [{ id: "bar", label: tl.hall.bar, x: 900, y: 630, width: 240, height: 56 }],
    floor: 1,
    position: { x: (first.position?.x ?? 0) + first.meters.width + HALL_GAP, y: first.position?.y ?? 0 },
  });

/** A point or a size in metres, hall-local from the top-left corner, as the app stores `position`. */
export type Metres = { x: number; y: number };

/**
 * `addTables` in the app's `planner.store.ts` at v1, for a rectangular hall:
 * the batch lands row-major from `start` - the canvas menu's snapped click -
 * each table's top-left corner a tile of its footprint plus a 0.5 m gap from
 * the last, as many columns as fit the hall's width from `start` and as many
 * rows as fit its height. The grid is **silently capped**: ask for more than
 * fits and fewer come back, which is why a film's typed count must be checked
 * against what this returns rather than assumed.
 */
export const addTablesGrid = (
  hall: { width: number; height: number },
  footprint: { width: number; height: number },
  count: number,
  start: Metres,
): Metres[] => {
  const gap = 0.5;
  const tileW = footprint.width + gap;
  const tileH = footprint.height + gap;
  const cols = Math.max(1, Math.floor(Math.max(tileW, hall.width - start.x) / tileW));
  const rowsCap = Math.max(1, Math.floor(Math.max(tileH, hall.height - start.y) / tileH));
  return range(Math.min(count, cols * rowsCap)).map((i) => ({
    x: start.x + (i % cols) * tileW,
    y: start.y + Math.floor(i / cols) * tileH,
  }));
};

/**
 * What the ten-tables cut types into *Dodaj stoły*: round, Ø 1.5 m, eight
 * seats, ten of them, opened by a right-click that snaps to (3, 1) m.
 */
export const TEN_TABLES_BATCH = { start: { x: 3, y: 1 }, diameter: 1.5, capacity: 8, count: 10 };

const TEN_TABLES_CELLS = addTablesGrid(
  { width: 14, height: 16 },
  { width: TEN_TABLES_BATCH.diameter, height: TEN_TABLES_BATCH.diameter },
  TEN_TABLES_BATCH.count,
  TEN_TABLES_BATCH.start,
);
if (TEN_TABLES_CELLS.length !== TEN_TABLES_BATCH.count) {
  throw new Error(
    `addTables would cap the batch at ${TEN_TABLES_CELLS.length} of ${TEN_TABLES_BATCH.count} - the film would type a number the app does not deliver`,
  );
}

/**
 * The ten-tables cut's room: `TALL_HALL`'s 14x16 m, empty when the film
 * starts, as it ends. The tables are the batch exactly where `addTables` puts
 * them - x = 3, 5, 7, 9, 11 and y = 1, 3 m - unnamed, as a batch with no name
 * leaves them (the canvas then shows only `0 / 8`). Under them the three
 * fixtures from the add hub (`addPresets.ts`), each dragged to a top-left the
 * 1 m snap allows: *Parkiet* 3x3 m at (6, 6), *Scena* 3x1.5 m behind it at
 * (6, 10), *Wejście* 1x0.3 m on the bottom wall at (11, 15.7) - clamped flush
 * to the wall, since the snap alone would put it at 16. Not a 58-seat room:
 * this film is about the venue's number, and it never shows a guest count.
 */
export const TEN_TABLES_HALL = withDerived({
  name: tl.hall.name,
  canvas: { width: 840, height: 960 },
  danceFloor: { x: 7.5 * PX_PER_M, y: 7.5 * PX_PER_M, width: 3 * PX_PER_M, height: 3 * PX_PER_M },
  tables: TEN_TABLES_CELLS.map((cell, i) => ({
    id: `t${i + 1}`,
    label: tl.hall.table(i + 1),
    shape: "round" as const,
    x: (cell.x + TEN_TABLES_BATCH.diameter / 2) * PX_PER_M,
    y: (cell.y + TEN_TABLES_BATCH.diameter / 2) * PX_PER_M,
    width: TEN_TABLES_BATCH.diameter * PX_PER_M,
    height: TEN_TABLES_BATCH.diameter * PX_PER_M,
    seats: TEN_TABLES_BATCH.capacity,
  })),
  fixtures: [
    { id: "stage", label: tl.app.addHub.fixtures.stage, x: 7.5 * PX_PER_M, y: 10.75 * PX_PER_M, width: 3 * PX_PER_M, height: 1.5 * PX_PER_M },
    { id: "entrance", label: tl.app.addHub.fixtures.entrance, x: 11.5 * PX_PER_M, y: 15.85 * PX_PER_M, width: 1 * PX_PER_M, height: 0.3 * PX_PER_M },
  ],
});
