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
  name: "Main hall",
  canvas: { width: 1320, height: 840 },
  danceFloor: { x: 660, y: 430, width: 380, height: 220 },
  tables: [
    { id: "head", label: "Head table", shape: "rect", x: 660, y: 120, width: 360, height: 84, seats: 10 },
    { id: "t1", label: "Table 1", shape: "round", x: 200, y: 330, width: 140, height: 140, seats: 8 },
    { id: "t2", label: "Table 2", shape: "round", x: 200, y: 570, width: 140, height: 140, seats: 8 },
    { id: "t3", label: "Table 3", shape: "round", x: 1120, y: 330, width: 140, height: 140, seats: 8 },
    { id: "t4", label: "Table 4", shape: "round", x: 1120, y: 570, width: 140, height: 140, seats: 8 },
    { id: "t5", label: "Table 5", shape: "round", x: 490, y: 690, width: 140, height: 140, seats: 8 },
    { id: "t6", label: "Table 6", shape: "round", x: 830, y: 690, width: 140, height: 140, seats: 8 },
  ],
  fixtures: [
    { id: "bar", label: "Bar", x: 200, y: 780, width: 200, height: 56 },
    { id: "cake", label: "Cake table", x: 1120, y: 780, width: 200, height: 56 },
  ],
});

/**
 * A portrait room for the 9:16 cut. Not the landscape hall cropped - a vertical
 * video needs a vertical room, so the tables are rearranged into two columns
 * flanking the dance floor with the head table at the top. Same 58 seats, so
 * the guest count reads identically in both cuts.
 */
export const TALL_HALL = withDerived({
  name: "Main hall",
  // A 14x16 m room rather than 12x15: a seated round table is ~3 m across, so
  // the columns need the extra metre either side to stop neighbouring seat
  // rings from touching each other, the walls and the dance floor.
  canvas: { width: 840, height: 960 },
  danceFloor: { x: 420, y: 420, width: 300, height: 220 },
  tables: [
    { id: "head", label: "Head table", shape: "rect", x: 420, y: 110, width: 320, height: 80, seats: 10 },
    { id: "t1", label: "Table 1", shape: "round", x: 120, y: 330, width: 130, height: 130, seats: 8 },
    { id: "t2", label: "Table 2", shape: "round", x: 720, y: 330, width: 130, height: 130, seats: 8 },
    { id: "t3", label: "Table 3", shape: "round", x: 120, y: 560, width: 130, height: 130, seats: 8 },
    { id: "t4", label: "Table 4", shape: "round", x: 720, y: 560, width: 130, height: 130, seats: 8 },
    { id: "t5", label: "Table 5", shape: "round", x: 250, y: 800, width: 130, height: 130, seats: 8 },
    { id: "t6", label: "Table 6", shape: "round", x: 590, y: 800, width: 130, height: 130, seats: 8 },
  ],
  fixtures: [{ id: "bar", label: "Bar", x: 420, y: 620, width: 240, height: 56 }],
});
