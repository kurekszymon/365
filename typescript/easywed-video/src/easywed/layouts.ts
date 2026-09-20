import { tl } from "./i18n";

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
