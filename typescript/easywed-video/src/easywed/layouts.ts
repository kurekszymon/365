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
  canvas: { width: number; height: number };
  danceFloor: { x: number; y: number; width: number; height: number };
  tables: TableSpec[];
  fixtures: FixtureSpec[];
  totalSeats: number;
};

const withTotal = (hall: Omit<HallLayout, "totalSeats">): HallLayout => ({
  ...hall,
  totalSeats: hall.tables.reduce((sum, t) => sum + t.seats, 0),
});

/**
 * The landscape room, for the 16:9 cut. Side columns sit 210 from each wall and
 * the bottom row is centred on the dance floor, so nothing grazes a wall.
 */
export const WIDE_HALL = withTotal({
  canvas: { width: 1200, height: 680 },
  danceFloor: { x: 600, y: 340, width: 380, height: 240 },
  tables: [
    { id: "head", label: "Head table", shape: "rect", x: 600, y: 104, width: 360, height: 84, seats: 10 },
    { id: "t1", label: "1", shape: "round", x: 210, y: 268, width: 130, height: 130, seats: 8 },
    { id: "t2", label: "2", shape: "round", x: 210, y: 486, width: 130, height: 130, seats: 8 },
    { id: "t3", label: "3", shape: "round", x: 990, y: 268, width: 130, height: 130, seats: 8 },
    { id: "t4", label: "4", shape: "round", x: 990, y: 486, width: 130, height: 130, seats: 8 },
    { id: "t5", label: "5", shape: "round", x: 430, y: 560, width: 130, height: 130, seats: 8 },
    { id: "t6", label: "6", shape: "round", x: 770, y: 560, width: 130, height: 130, seats: 8 },
  ],
  fixtures: [
    { id: "bar", label: "Bar", x: 170, y: 622, width: 200, height: 56 },
    { id: "cake", label: "Cake table", x: 1030, y: 622, width: 200, height: 56 },
  ],
});

/**
 * A portrait room for the 9:16 cut. Not the landscape hall cropped - a vertical
 * video needs a vertical room, so the tables are rearranged into two columns
 * flanking the dance floor with the head table at the top. Same 58 seats, so
 * the guest count reads identically in both cuts.
 */
export const TALL_HALL = withTotal({
  canvas: { width: 720, height: 900 },
  danceFloor: { x: 360, y: 330, width: 300, height: 200 },
  tables: [
    { id: "head", label: "Head table", shape: "rect", x: 360, y: 90, width: 300, height: 80, seats: 10 },
    { id: "t1", label: "1", shape: "round", x: 110, y: 270, width: 120, height: 120, seats: 8 },
    { id: "t2", label: "2", shape: "round", x: 610, y: 270, width: 120, height: 120, seats: 8 },
    { id: "t3", label: "3", shape: "round", x: 110, y: 470, width: 120, height: 120, seats: 8 },
    { id: "t4", label: "4", shape: "round", x: 610, y: 470, width: 120, height: 120, seats: 8 },
    { id: "t5", label: "5", shape: "round", x: 250, y: 720, width: 120, height: 120, seats: 8 },
    { id: "t6", label: "6", shape: "round", x: 470, y: 720, width: 120, height: 120, seats: 8 },
  ],
  fixtures: [{ id: "bar", label: "Bar", x: 360, y: 578, width: 220, height: 60 }],
});
