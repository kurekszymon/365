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

  /** `--destructive` (red-600 in every palette): a dialog's required-field asterisk. */
  destructive: "#e7000b",
  /** `DialogOverlay`'s `bg-black/10` - the scrim behind a dialog or drawer. */
  scrim: "rgba(0, 0, 0, 0.1)",

  /** `MeasureOverlay`'s hard-coded `#0d9488` (teal-600): the measuring line, its dots and its label. */
  measure: "#0d9488",

  /**
   * `SeatAssignPopover`'s *elsewhere* rows - the amber "this moves them" tone:
   * `border-amber-300/80 bg-amber-50/70 text-amber-900`, Tailwind v4's own
   * oklch amber converted to hex.
   */
  amber50: "#fffbeb",
  amber300: "#ffd230",
  amber900: "#7b3306",

  brandGreen: "#43684b",
  brandGreenSoft: "#9ec2a2",
  brandGreenMist: "#d9ead9",
  terracotta: "#a9592b",

  seatEmpty: "#9ec2a2",
  seatEmptyBorder: "#6f9a79",
  seatFilled: "#a9592b",
  seatFilledBorder: "#7f4220",

  /** `--tag-green` / `--tag-teal` / `--tag-amber` (`styles.css`, oklch as hex): the diet tags' reserved tones. */
  tagGreen: "#337344",
  tagTeal: "#157171",
  tagAmber: "#915c08",
  /**
   * `--tag-violet`, the one tone `lib/ageGroup.ts` reserves for every child
   * bracket (`AGE_GROUP_TONE`). `oklch(0.5 0.11 300)` as hex - a blue-violet,
   * two hue families away from `accent` (336deg), so a bracket badge never
   * reads as a selection.
   */
  tagViolet: "#6d5398",

  /** The print view (`PlannerPrintView`): `bg-white text-black` and Tailwind v4's gray-500..800. */
  paper: "#ffffff",
  paperInk: "#000000",
  paperGray500: "#6a7282",
  paperGray600: "#4a5565",
  paperGray700: "#364153",
  paperGray800: "#1e2939",
};

export const shadow = {
  card: "0 24px 60px rgba(60, 50, 40, 0.10)",
  chip: "0 6px 18px rgba(60, 50, 40, 0.14)",
};
