# easywed-video

A [Remotion](https://remotion.dev) product demo for **easywed** (`../easywed`) - a 28 second
walkthrough of the planner: sketch the hall, add guests, seat everyone. Renders in both 16:9
(1920x1080) and 9:16 (1080x1920).

It is a standalone package on purpose - it sits next to `easywed/` rather than inside it, so it
stays out of that project's tsconfig, ESLint and Vite scope.

## Commands

```bash
npm run dev              # Remotion Studio on http://localhost:3000
npm run render           # -> out/easywed-demo.mp4          (16:9)
npm run render:vertical  # -> out/easywed-demo-vertical.mp4 (9:16)
npm run render:gif       # -> out/easywed-demo.gif (960px wide, every 2nd frame)
npm run render:all       # all three
npm run lint             # eslint + tsc
```

Render a single frame while iterating:

```bash
npx remotion still EasywedDemo out/frame.png --frame=265
```

## Compositions

| id                    | length | what it is                |
| --------------------- | ------ | ------------------------- |
| `EasywedDemo`         | 840f   | the full film, 16:9       |
| `EasywedDemoVertical` | 840f   | the same film, 9:16       |
| `Intro`       | 120f   | logo build                |
| `Hall`        | 210f   | step 01 - sketch the hall |
| `Guests`      | 180f   | step 02 - add your guests |
| `Seating`     | 240f   | step 03 - seat everyone   |
| `Outro`       | 150f   | headline + CTA            |

The scenes are also registered individually (Studio folder "Scenes") so a single beat can be
previewed without scrubbing through the whole timeline.

## Structure

```
src/easywed/
  timeline.ts            scene lengths, fps, dimensions - the single source of truth
  theme.ts               hex mirror of the app's `editorial` palette + brand colors, fonts
  layouts.ts             WIDE_HALL and TALL_HALL - the two room plans
  format.ts              useFormat() - picks hall + type scale from the composition size
  data.ts                the demo wedding: guest list, couple, venue
  geometry.ts            seat positions around round/rectangular tables
  EasywedDemo.tsx        TransitionSeries stitching the five scenes with crossfades
  components/            Backdrop, BrandMark, Wordmark, AppFrame, HallCanvas, PlannerTable, ...
  scenes/                one file per scene
```

## How one set of scenes renders two aspect ratios

There is no second set of components. `useFormat()` reads `useVideoConfig()` and derives
`tall = height > width`, then hands each scene its room plan and type scale - so `Root.tsx` only
registers a second size and the scenes adapt themselves:

- **Room** - portrait gets `TALL_HALL`, a genuinely different plan (two columns of tables
  flanking the dance floor, head table on top), not the landscape hall cropped. Both come to the
  same 58 seats, so the guest count reads identically in either cut.
- **Chrome** - landscape renders the desktop left rail, portrait renders the mobile bottom tab
  bar, mirroring how the app itself adapts.
- **Layout** - the caption sits beside the hall in 16:9 and stacked above it in 9:16.
- **Drag demo** - the table being dragged starts beside the head table in landscape and parked on
  the dance floor in portrait, since "obviously wrong spot" differs per room.

## Staying on brand

- Colors come from `easywed/src/styles.css` (the default `editorial` palette) and
  `easywed/public/easywed-icon.svg`. The icon's green/terracotta pair is the same
  free-seat/taken-seat language the planner uses, so the logo animation in the intro is
  literally the product's core interaction.
- Fonts match the app: Playfair Display for headings, Inter for UI text.
- Copy is lifted from the landing page strings in `easywed/src/i18n/locales/en.json`, so the
  video and the site say the same thing.

If the app's palette or copy changes, `theme.ts` and the scene text are the two places to update.
