import { ADD_HUB_HEIGHT, addHubCardCenter, FIXTURE_PRESETS, type FixturePresetKey } from "../../../components/AddHub";
import { hallAspect, PAD as HALL_PAD } from "../../../components/HallCanvas";
import { canvasInsets, chromeScale } from "../../../components/PlannerCanvas";
import type { Point } from "../../../geometry";
import { type Metres, PX_PER_M, TEN_TABLES_HALL } from "../../../layouts";
import { HEIGHT, WIDTH } from "../../../timeline";

/**
 * Where everything sits on the couple's laptop screen, in desk pixels - the
 * landscape cut's own 1920x1080, so its chrome is the 16:9 films'. The camera,
 * the pointer and every overlay aim through these, so a pixel of rounding here
 * moves none of them by more than a pixel.
 */
export const DESK = { width: WIDTH, height: HEIGHT };

/** App CSS px to desk px, as `AppFrame` and `PlannerCanvas` scale their chrome in landscape. */
export const APP_PX = chromeScale(false);

/**
 * `AppFrame`'s content box on the desktop, worked out from its own spec: the
 * 44 px margin and the window's 1 px border, the header (8 px padding either
 * side of its 32 px buttons, and a border) above, the 76 px rail and its border
 * to the left - the sunday-couch cut's arithmetic.
 */
const FRAME_MARGIN = 44 + 1;
const HEADER = (8 * 2 + 32) * APP_PX + 1;
const RAIL_WIDTH = 76 * APP_PX;
export const CONTENT = {
  x: FRAME_MARGIN + RAIL_WIDTH + 1,
  y: FRAME_MARGIN + HEADER,
  width: DESK.width - FRAME_MARGIN * 2 - RAIL_WIDTH - 1,
  height: DESK.height - FRAME_MARGIN * 2 - HEADER,
};

/**
 * The rail's *Elementy sali* tab, the third after *Goście* and *Stoły*:
 * `AppFrame`'s nav pads 14 px, then the 34 px collapse button, then each tab a
 * 34 px icon, a 4 px gap and a one-line 9 px label at `lineHeight: 1.15`,
 * 14 px apart.
 */
const railTab = (index: number): Point => {
  const s = APP_PX;
  const tab = 34 * s + 4 * s + 9 * s * 1.15 + 14 * s;
  return {
    x: FRAME_MARGIN + RAIL_WIDTH / 2,
    y: CONTENT.y + 14 * s + 34 * s + 14 * s + index * tab + (34 * s) / 2,
  };
};
export const FIXTURES_TAB = railTab(2);

/**
 * The canvas viewport: the room's aspect ratio inside the content box, as
 * `PlanScene` sizes it, so the hall fills it and the chrome floats against
 * the walls. The side panel is an overlay in the app (`SidebarRail`), so the
 * canvas never moves when it opens.
 */
const INNER = { x: 28, y: 24 };
const region = {
  x: CONTENT.x + INNER.x,
  y: CONTENT.y + INNER.y,
  width: CONTENT.width - INNER.x * 2,
  height: CONTENT.height - INNER.y * 2,
};
const insets = canvasInsets(false);
const drawWidth = Math.min(
  region.width - insets.left - insets.right,
  (region.height - insets.top - insets.bottom) * hallAspect(TEN_TABLES_HALL),
);
const boxWidth = drawWidth + insets.left + insets.right;
const boxHeight = drawWidth / hallAspect(TEN_TABLES_HALL) + insets.top + insets.bottom;
export const CANVAS_BOX = {
  x: region.x + (region.width - boxWidth) / 2,
  y: region.y + (region.height - boxHeight) / 2,
  width: boxWidth,
  height: boxHeight,
};

/** Desk px per hall unit, and the hall's (0, 0) on the desk. */
export const UNIT = drawWidth / (TEN_TABLES_HALL.canvas.width + HALL_PAD.left + HALL_PAD.right);
const ORIGIN = {
  x: CANVAS_BOX.x + insets.left + HALL_PAD.left * UNIT,
  y: CANVAS_BOX.y + insets.top + HALL_PAD.top * UNIT,
};

export const unitsToDesk = (p: Point): Point => ({ x: ORIGIN.x + p.x * UNIT, y: ORIGIN.y + p.y * UNIT });
export const metresToDesk = (p: Metres): Point => unitsToDesk({ x: p.x * PX_PER_M, y: p.y * PX_PER_M });

/**
 * `SidebarRail`'s content column: `w-[400px]`, the full height of the planner
 * row, sliding out from under the rail. Its header is `px-4 py-3` round a
 * `text-base` title and a border; the body `p-4`, with the list's outline
 * *Dodaj element* (`h-8`) at its top.
 */
export const PANEL = { x: CONTENT.x, y: CONTENT.y, width: 400 * APP_PX, height: CONTENT.height };
export const PANEL_HEADER = 12 + 24 + 12 + 1;
export const PANEL_ADD: Point = { x: PANEL.x + 200 * APP_PX, y: PANEL.y + (PANEL_HEADER + 16 + 16) * APP_PX };

/**
 * The context menu, at CSS px: `p-1`, rows of `py-1` round a 20 px `text-sm`
 * line, a `my-1` separator, a `text-xs` section label. It opens with its
 * top-left at the pointer. Wide enough for its longest row, *Odległość
 * przyciągania* with its value and chevron.
 */
export const MENU = { pad: 4, row: 28, separator: 9, label: 24, width: 256 };
export const menuHeight = MENU.pad * 2 + MENU.row * 7 + MENU.separator + MENU.label;
/** A row's centre from the menu's top, CSS px - `index` counts the three add rows first. */
export const menuRowY = (index: number) => MENU.pad + MENU.row * index + MENU.row / 2;

/**
 * `DialogContent` at `sm:max-w-md`: centred on the screen, `p-4`, `gap-4`
 * between its header and body - `EntityEditDialog`'s header a title and the
 * 36 px check, `AddEntityDialog`'s a `leading-none` title alone.
 */
export const DIALOG = { width: 448, pad: 16, gap: 16 };
const INNER_WIDTH = DIALOG.width - DIALOG.pad * 2;

/** `FieldLabel`: `text-sm` at `leading-snug`, `Field`'s `gap-2`, an `h-8` input or an `xs` button's `h-6`, the form's `gap-4`. */
export const FORM = { label: 14 * 1.375, labelGap: 8, input: 32, buttonXs: 24, gap: 16, submit: 32, dimGap: 12 };
const inputField = FORM.label + FORM.labelGap + FORM.input;
const buttonField = FORM.label + FORM.labelGap + FORM.buttonXs;

export type BatchShape = "rectangular" | "round";

/** Each row's top from the form's top, CSS px: the rectangular form has width, height and a rotation row where the round one has a diameter. */
export const batchRows = (shape: BatchShape) => {
  const heights: [string, number][] =
    shape === "round"
      ? [["name", inputField], ["shape", buttonField], ["size", inputField], ["capacity", inputField], ["count", inputField], ["submit", FORM.submit]]
      : [["name", inputField], ["shape", buttonField], ["size", inputField], ["rotation", buttonField], ["capacity", inputField], ["count", inputField], ["submit", FORM.submit]];
  const tops: Record<string, number> = {};
  let y = 0;
  heights.forEach(([key, height], i) => {
    tops[key] = y;
    y += height + (i < heights.length - 1 ? FORM.gap : 0);
  });
  return { tops, height: y };
};

/** The check in `EntityEditDialog`'s header. */
const BATCH_HEADER = 36;

/** The batch dialog on the desk, and the centres of what the pointer clicks in it. */
export const batchDialog = (shape: BatchShape) => {
  const { tops, height: formHeight } = batchRows(shape);
  const height = DIALOG.pad * 2 + BATCH_HEADER + DIALOG.gap + formHeight;
  const box = {
    width: DIALOG.width * APP_PX,
    height: height * APP_PX,
    x: DESK.width / 2 - (DIALOG.width * APP_PX) / 2,
    y: DESK.height / 2 - (height * APP_PX) / 2,
  };
  const formTop = DIALOG.pad + BATCH_HEADER + DIALOG.gap;
  const at = (x: number, y: number): Point => ({ x: box.x + x * APP_PX, y: box.y + (formTop + y) * APP_PX });
  const fieldY = (row: string, control: number) => tops[row] + FORM.label + FORM.labelGap + control / 2;
  return {
    box,
    formTop,
    targets: {
      round: at(DIALOG.pad + (INNER_WIDTH * 3) / 4, fieldY("shape", FORM.buttonXs)),
      diameter: at(DIALOG.pad + INNER_WIDTH / 2, fieldY("size", FORM.input)),
      count: at(DIALOG.pad + INNER_WIDTH / 2, fieldY("count", FORM.input)),
      submit: at(DIALOG.pad + INNER_WIDTH / 2, tops.submit + FORM.submit / 2),
    },
  };
};

/** `AddEntityDialog`: title, then `AddHubContent`, and a card's centre on the desk. */
const HUB_TITLE = 16;
const HUB_HEIGHT = DIALOG.pad * 2 + HUB_TITLE + DIALOG.gap + ADD_HUB_HEIGHT;
export const HUB = {
  width: DIALOG.width * APP_PX,
  height: HUB_HEIGHT * APP_PX,
  x: DESK.width / 2 - (DIALOG.width * APP_PX) / 2,
  y: DESK.height / 2 - (HUB_HEIGHT * APP_PX) / 2,
  innerWidth: INNER_WIDTH,
  bodyTop: DIALOG.pad + HUB_TITLE + DIALOG.gap,
};
export const hubCard = (key: FixturePresetKey): Point => {
  const index = FIXTURE_PRESETS.findIndex((preset) => preset.key === key);
  const centre = addHubCardCenter(INNER_WIDTH, index);
  // Aimed at the card's icon tile, above its label, so the pointer never covers the name.
  return { x: HUB.x + (DIALOG.pad + centre.x) * APP_PX, y: HUB.y + (HUB.bodyTop + centre.y - 14) * APP_PX };
};
