# easywed-video

[Remotion](https://remotion.dev) promotional film for **easywed.** (`../easywed`), in three cuts:

- **the walkthrough** - 28 seconds of the planner: sketch the hall, add guests, seat everyone.
- **the teaser** - 15 seconds for Reels/TikTok: the question, the pile of spreadsheets it takes
  today, the room filling itself, the CTA.
- **the import** - 20 seconds for Reels/TikTok: the guest list already in Excel, dropped into the
  import wizard, its columns mapped, the room seated, the CTA.
- **the kitchen report** - 18 seconds for Reels/TikTok: the venue, the florist and the kitchen all
  asking at once, the diet tags on the guest list, the printed report with diets beside the names,
  the CTA.

All render in 16:9 (1920x1080) and 9:16 (1080x1920), and all are in Polish.

It is a standalone package on purpose - it sits next to `easywed/` rather than inside it, so it
stays out of that project's tsconfig, ESLint and Vite scope.

## Commands

```bash
npm run dev              # Remotion Studio on http://localhost:3000
npm run render           # -> out/easywed-demo.mp4          (16:9)
npm run render:vertical  # -> out/easywed-demo-vertical.mp4 (9:16)
npm run render:gif       # -> out/easywed-demo.gif (960px wide, every 2nd frame)

npm run render:teaser            # -> out/easywed-teaser.mp4          (16:9)
npm run render:teaser:vertical   # -> out/easywed-teaser-vertical.mp4 (9:16)

npm run render:import-excel            # -> out/easywed-import.mp4          (16:9)
npm run render:import-excel:vertical   # -> out/easywed-import-vertical.mp4 (9:16)

npm run render:kitchen-report            # -> out/easywed-report.mp4          (16:9)
npm run render:kitchen-report:vertical   # -> out/easywed-report-vertical.mp4 (9:16)

npm run render:all       # all of the above
npm run lint             # eslint + tsc
```

Render a single frame while iterating:

```bash
npx remotion still easywed-demo out/frame.png --frame=265
```

`/video-plan` (in the monorepo root, `.claude/skills/video-plan/`) plans the next videos in this
series against what `easywed/v1` actually does. Each run authors a new dated brief under
`docs/video-plans/{scope}-{date}.md` rather than revising the last one. Its two reference files -
the confirmed v1 selling points, and the beats and lines the finished films already used - are what
to update when a new video ships.

`/video-build <id>` (`.claude/skills/video-build/`) then builds one brief from such a plan: it
re-checks the brief's copy, claims and frame maths against `easywed/v1`, adds the film under
`src/easywed/{id}/` in the teaser's shape, registers it in `Root.tsx` and `package.json`, checks
stills, and adds the new on-screen lines to the burned list so the next plan won't reuse them.

## Compositions

| id                      | length | what it is                |
| ----------------------- | ------ | ------------------------- |
| `easywed-demo`          | 840f   | the full film, 16:9       |
| `easywed-demo-vertical` | 840f   | the same film, 9:16       |
| `Intro`                 | 120f   | logo build                |
| `Hall`                  | 210f   | step 01 - sketch the hall |
| `Guests`                | 180f   | step 02 - add your guests |
| `Seating`               | 240f   | step 03 - seat everyone   |
| `Outro`                 | 150f   | headline + CTA            |

| id                        | length | what it is                        |
| ------------------------- | ------ | --------------------------------- |
| `easywed-teaser`          | 450f   | the 15 s social cut, 16:9         |
| `easywed-teaser-vertical` | 450f   | the same cut, 9:16                |
| `Hook`                    | 90f    | the question                      |
| `Chaos`                   | 100f   | the spreadsheets, swept off       |
| `Plan`                    | 176f   | the room filling, 58/58           |
| `Cta`                     | 108f   | logo + easywed.app                |

| id                        | length | what it is                                  |
| ------------------------- | ------ | ------------------------------------------- |
| `easywed-import`          | 600f   | the 20 s import cut, 16:9                   |
| `easywed-import-vertical` | 600f   | the same cut, 9:16                          |
| `ImportHook`              | 90f    | the list in a spreadsheet                   |
| `ImportDrop`              | 150f   | the file dropped into the import dialog     |
| `ImportMap`               | 180f   | columns mapped, "Do zaimportowania: 58"     |
| `ImportLanded`            | 204f   | the room seats 58/58, then the CTA          |

| id                        | length | what it is                                     |
| ------------------------- | ------ | ---------------------------------------------- |
| `easywed-report`          | 540f   | the 18 s kitchen-report cut, 16:9              |
| `easywed-report-vertical` | 540f   | the same cut, 9:16                             |
| `ReportHook`              | 174f   | messages from the venue, florist and kitchen   |
| `ReportTags`              | 120f   | diet tags landing on the guest list            |
| `ReportSheet`             | 150f   | the printed report, pushed in on the diets     |
| `ReportCta`               | 120f   | the pages settle, logo + easywed.app           |

The scenes are also registered individually (Studio folders "Scenes", "Teaser", "Import" and
"Report") so a single beat can be previewed without scrubbing through the whole timeline. The
social cuts' scenes are registered at 9:16, the cut they are made for.

## Structure

```
src/easywed/
  timeline.ts            scene lengths, fps, dimensions - the single source of truth
  theme.ts               hex mirror of the app's `editorial` palette + brand colors, fonts
  layouts.ts             WIDE_HALL and TALL_HALL - the two room plans, 60 units per metre
  format.ts              useFormat() - picks hall + type scale from the composition size
  data.ts                the demo wedding: guest list, couple
  geometry.ts            seat positions around round/rectangular tables
  Film.tsx               TransitionSeries stitching the five scenes with crossfades
  components/            Backdrop, BrandMark, Wordmark, Icon, AppFrame, PlannerCanvas,
                         HallCanvas, PlannerTable, ...
  scenes/                one file per scene
  teaser/                the social cut - its own timeline, Teaser.tsx and scenes,
                         drawn with the same theme, layouts and components
  import-excel/          the import cut, in the teaser's shape; its dialog redraw lives in
                         components/ImportDialog.tsx, since the long walkthrough reuses it
  kitchen-report/        the kitchen-report cut, in the teaser's shape; the printed report
                         lives in components/PrintSheet.tsx, since the long walkthrough reuses it
```

The teaser reuses `useFormat()`, `HallCanvas` and `PlannerCanvas`, so it adapts to both aspect
ratios the same way the walkthrough does. Its own beats and its shorter crossfade live in
`teaser/timeline.ts` rather than the shared one - a teaser cuts where a walkthrough dissolves.

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

## Matching the app's UI

The chrome is a redraw of the real planner, not a generic app frame, so a viewer recognises the
product the moment they open it:

- **Header** - mark + wordmark, divider, back arrow, the wedding name in the heading face, then
  the member stack, "Configure hall", import, export and account buttons (`Header/*` in the app).
- **Rail** - the 60px strip: collapse chevron, then a circle-in-a-label per tab with the active
  one inverted to `bg-primary` and accent badge counts (`Sidebar/TabBadgeIcon`). Portrait renders
  the same circles in the mobile tab bar.
- **Canvas** - `PlannerCanvas` floats the chrome the app floats: snap stepper, grid, measure and
  seats toggles top-right, the zoom pill bottom-left, the minimap bottom-right. The hall itself
  carries its drag-handle label chip and the dimension labels outside the walls.
- **Hall** - hairline outline, slate-400 ruled grid at 1 m with a firmer 5 m ruling, slate
  fixtures, tables labelled name-over-occupancy, and the logo's green/terracotta seat markers.
- **Guest panel** - progress card, search, filter chips, add/import buttons and secondary-filled
  guest rows, as `Guests/GuestListContent` renders them.

If the app's chrome moves, `AppFrame.tsx`, `PlannerCanvas.tsx` and `HallCanvas.tsx` are where the
video follows it.

## Staying on brand

- Colors come from `easywed/src/styles.css` (the default `editorial` palette) and
  `easywed/public/easywed-icon.svg`. The icon's green/terracotta pair is the same
  free-seat/taken-seat language the planner uses, so the logo animation in the intro is
  literally the product's core interaction.
- Fonts match the app: Playfair Display for headings, Inter for UI text.
- Copy is lifted from the landing page strings in `easywed/src/i18n/locales/en.json`, so the
  video and the site say the same thing.

If the app's palette or copy changes, `theme.ts` and the scene text are the two places to update.
