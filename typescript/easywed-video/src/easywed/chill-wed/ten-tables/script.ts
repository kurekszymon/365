import { tl } from "../../i18n";
import type { Metres } from "../../layouts";
import { PX_PER_M, TEN_TABLES_BATCH, TEN_TABLES_HALL } from "../../layouts";

/**
 * What happens on the ten-tables cut's clock (`TEN_TABLES_STARTS`), shared by
 * its scenes: the laptop's state, the pointer, the camera and the lines over
 * it. Frames are cut-global, so a scene reads them at
 * `frame + TEN_TABLES_STARTS.{scene}`.
 *
 * Three jump cuts skip what v1 does between the beats and the film does not
 * need: *Dodaj 10 stołów* hands the dialog to *Edytuj stół* for the first new
 * table (`openTableEdit(ids[0])`) rather than closing it; a card in the add hub
 * opens *Edytuj element* for the new fixture (`openFixtureEdit`), and the
 * *Elementy sali* panel stays open until it is shut. Each is closed off-screen,
 * between two shots.
 */

/** The hook is up on frame 0 and stays until the batch dialog has opened. */
export const HOOK_OUT = [84, 92] as const;

/** A right-click on the empty hall near (3, 1) m opens the canvas menu there. */
export const RIGHT_CLICK = 50;
export const MENU_IN = [51, 54] as const;
/** The pointer comes to rest on *Dodaj stoły*, which lights up (`focus:bg-accent`), and clicks it. */
export const MENU_HOVER = 70;
export const CLICK_MENU = 78;
export const MENU_OUT = [79, 82] as const;
export const DIALOG_IN = [80, 84] as const;

/** *Okrągły*: the form swaps *Szerokość*, *Wysokość* and *Orientacja* for *Średnica*, keeping the width - 2. */
export const CLICK_ROUND = 110;
export const ROUND_LINE_IN = [114, 122] as const;
export const ROUND_LINE_OUT = [160, 166] as const;

/**
 * A field is clicked, its value selected and typed over, one key at a time -
 * `NumberInput` shows the raw draft, so *1.* is on screen for a beat, and only
 * parseable drafts reach the form: the button follows *Ile* through *1*.
 */
export type Key = { frame: number; text: string };
export const CLICK_DIAMETER = 126;
export const DIAMETER_KEYS: Key[] = [
  { frame: 130, text: "" },
  { frame: 134, text: "1" },
  { frame: 138, text: "1." },
  { frame: 142, text: String(TEN_TABLES_BATCH.diameter) },
];
export const CLICK_COUNT = 162;
export const COUNT_KEYS: Key[] = [
  { frame: 166, text: "" },
  { frame: 170, text: "1" },
  { frame: 174, text: String(TEN_TABLES_BATCH.count) },
];
export const TYPED_LINE_IN = [174, 182] as const;
export const TYPED_LINE_OUT = [206, 212] as const;

/** *Dodaj 10 stołów*, then the first jump cut: the room, the ten tables landing row by row. */
export const CLICK_SUBMIT = 198;
export const JUMP_TABLES = 202;
export const TABLE_IN_FROM = 204;
/** Frames between one table's landing and the next, in the order `addTables` places them. */
export const TABLE_STAGGER = 1.5;
export const LANDED_LINE_IN = [216, 224] as const;
export const LANDED_LINE_OUT = [264, 270] as const;

/** The rail's *Elementy sali*, its panel sliding in (`duration-300`), then the panel's *Dodaj element*. */
export const CLICK_RAIL = 250;
export const PANEL_IN = [251, 260] as const;
export const CLICK_ADD = 270;
export const HUB_IN = [271, 275] as const;
/** *Parkiet* - then the second jump cut, onto the plan with the dance floor in its middle. */
export const HUB_HOVER = 286;
export const CLICK_PARKIET = 294;
export const JUMP_FLOOR = 298;
export const FIXTURES_LINE_IN = [302, 310] as const;
export const FIXTURES_LINE_OUT = [384, 390] as const;

/**
 * A fixture as the add hub inserts it, centred in the hall (`AddHubContent`'s
 * `centerPosition`), then dragged: it follows the pointer from `grab`, is let
 * go at `release` - off the grid, as a hand leaves it - and settles on its
 * place in `TEN_TABLES_HALL`, the top-left `snapPositionToGrid` rounds to.
 */
export type FixtureMove = {
  id: "floor" | "stage" | "entrance";
  label: string;
  size: Metres;
  /** The jump cut that shows it inserted. */
  from: number;
  grab: number;
  drag: readonly [number, number];
  drop: number;
  /** Top-lefts, in metres. */
  inserted: Metres;
  release: Metres;
  to: Metres;
};

const HALL_METRES = { width: TEN_TABLES_HALL.meters.width, height: TEN_TABLES_HALL.meters.height };
const centred = (size: Metres): Metres => ({
  x: HALL_METRES.width / 2 - size.x / 2,
  y: HALL_METRES.height / 2 - size.y / 2,
});
/** A top-left in metres from a layout's centre-and-size in units. */
const topLeft = (spec: { x: number; y: number; width: number; height: number }): Metres => ({
  x: (spec.x - spec.width / 2) / PX_PER_M,
  y: (spec.y - spec.height / 2) / PX_PER_M,
});
const sizeOf = (spec: { width: number; height: number }): Metres => ({ x: spec.width / PX_PER_M, y: spec.height / PX_PER_M });
const fixture = (id: string) => {
  const spec = TEN_TABLES_HALL.fixtures.find((f) => f.id === id);
  if (!spec) throw new Error(`No fixture ${id} in the ten-tables hall`);
  return spec;
};
/** A hand lets go a little off the grid. */
const offGrid = (p: Metres): Metres => ({ x: p.x + 0.18, y: p.y - 0.14 });

const move = (
  id: FixtureMove["id"],
  label: string,
  spec: { x: number; y: number; width: number; height: number },
  from: number,
): FixtureMove => {
  const size = sizeOf(spec);
  const to = topLeft(spec);
  return {
    id,
    label,
    size,
    from,
    grab: from + 4,
    drag: [from + 6, from + 20],
    drop: from + 22,
    inserted: centred(size),
    release: offGrid(to),
    to,
  };
};

/** *Parkiet*, *Scena* and *Wejście*, each shown inserted by a jump cut and dragged into place. */
export const FIXTURE_MOVES: FixtureMove[] = [
  move("floor", tl.app.addHub.fixtures.danceFloor, TEN_TABLES_HALL.danceFloor, JUMP_FLOOR),
  move("stage", fixture("stage").label, fixture("stage"), 330),
  move("entrance", fixture("entrance").label, fixture("entrance"), 358),
];

/** How long a fixture takes to settle onto the grid once it is let go. */
export const SNAP = 4;

/** The pointer stays this long on a fixture after dropping it, then fades. */
export const POINTER_LINGER = 6;

/** The camera pulls back over the whole room and the payoff lands over it, staying through the call to action. */
export const CAMERA_BACK = [384, 414] as const;
export const PAYOFF_IN = [392, 404] as const;

/** A click reads as held for this long, as `active:` would show it. */
export const PRESS_HELD = 4;

/** The series tag is up from frame 0 and goes as the call to action comes in. */
export const TAG_OUT = [432, 440] as const;
