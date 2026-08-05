import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";

const inter = loadInter();
const playfair = loadPlayfair();

export const fonts = {
  heading: playfair.fontFamily,
  sans: inter.fontFamily,
};

/**
 * Hex mirrors of the app's `editorial` palette (`src/styles.css`) plus the two
 * brand colors taken straight out of `public/easywed-icon.svg`. Hex rather than
 * the app's oklch() so `interpolateColors` can animate the seat fill.
 */
export const colors = {
  bg: "#f4f1e9",
  bgDeep: "#eae5d9",
  card: "#fdfbf6",
  ink: "#241f1a",
  inkSoft: "#7b736b",
  border: "#e6e1d8",

  /** `--secondary` / `--primary`: the app's card fills and its black pills. */
  secondary: "#efe9dd",
  primary: "#2b2621",
  primaryInk: "#faf7f0",

  hall: "#5b544c",
  table: "#efebe0",
  tableBorder: "#c9c2b4",
  tableInk: "#3a352f",

  /** Canvas grid - `gridBackground()` draws slate-400 at half alpha. */
  grid: "#94a3b8",

  /** Fixtures are the one slate-toned thing on the canvas, as in the app. */
  fixture: "#e2e8f0",
  fixtureBorder: "#94a3b8",
  fixtureInk: "#334155",

  accent: "#8f4f80",
  accentSoft: "#f3e3ef",
  /** `--planner-selected` / `--planner-soft`: active toolbar + selection. */
  selected: "#9c4f89",
  selectedSoft: "#f6e8f2",

  brandGreen: "#43684b",
  brandGreenSoft: "#9ec2a2",
  brandGreenMist: "#d9ead9",
  terracotta: "#a9592b",

  seatEmpty: "#9ec2a2",
  seatEmptyBorder: "#6f9a79",
  seatFilled: "#a9592b",
  seatFilledBorder: "#7f4220",
};

export const shadow = {
  card: "0 24px 60px rgba(60, 50, 40, 0.10)",
  chip: "0 6px 18px rgba(60, 50, 40, 0.14)",
};
