# easywed-video

[Remotion](https://remotion.dev) promotional film for **easywed.** (`../easywed`), in these cuts:

- **the walkthrough** - 28 seconds of the planner: sketch the hall, add guests, seat everyone.
- **the teaser** - 15 seconds for Reels/TikTok: the question, the pile of spreadsheets it takes
  today, the room filling itself, the CTA.
- **the import** - 20 seconds for Reels/TikTok: the guest list already in Excel, dropped into the
  import wizard, its columns mapped, the room seated, the CTA.
- **the kitchen report** - 18 seconds for Reels/TikTok: the venue, the florist and the kitchen all
  asking at once, the diet tags on the guest list, the printed report with diets beside the names,
  the CTA.
- **the to-scale loop** - 12 seconds for the landing page, 16:9 only: the question beside a seated
  room, the measure tool taking two distances in metres, then back to its first frame. No CTA -
  the page around it is the CTA.
- **the seat-swap loop** - 13 seconds for the landing page, 16:9 only: a room where every chair is
  taken, a guest brought over from another table onto a full one, and the guest she turned out given
  the chair she left. No CTA either.
- **the seat-swap cut** - 17 seconds for Reels/TikTok: the same move with the names typed into the
  seat popover's search, the guest who lost his chair found under *Bez stołu*, the CTA.
- **the odd-room loop** - 12 seconds for the landing page, 16:9 only: a seated room drawn as a
  rectangle, its shape switched to *Kształt L* in the hall's settings, and one corner of the L
  dragged a metre out by hand. No CTA either.
- **the long walkthrough** - 83 seconds for YouTube: the short walkthrough's scenes with a second
  hall added upstairs between them, and the other films' beats as chapters - the L-shaped room, the
  import, the kids counted, a distance measured, a guest moved, the printed report. Its 9:16 twin
  runs 78.5 seconds without the measuring, which a phone at v1 does differently.

All but the loops render in 16:9 (1920x1080) and 9:16 (1080x1920), and all are in Polish.

It is a standalone package on purpose - it sits next to `easywed/` rather than inside it, so it
stays out of that project's tsconfig, ESLint and Vite scope.

## Commands

The package manager is pnpm, pinned in `package.json` (`packageManager`) - `corepack` or pnpm
itself fetches the right version, so `pnpm install` is all the setup there is.

```bash
pnpm run dev              # Remotion Studio on http://localhost:3000
pnpm run dev:en           # the same, in English
pnpm run render           # -> out/pl/easywed-demo.mp4          (16:9)
pnpm run render:vertical  # -> out/pl/easywed-demo-vertical.mp4 (9:16)
pnpm run render:gif       # -> out/pl/easywed-demo.gif (960px wide, every 2nd frame)

pnpm run render:teaser           # -> out/pl/easywed-teaser.mp4          (16:9)
pnpm run render:teaser:vertical  # -> out/pl/easywed-teaser-vertical.mp4 (9:16)

pnpm run render:import-excel           # -> out/pl/easywed-import.mp4          (16:9)
pnpm run render:import-excel:vertical  # -> out/pl/easywed-import-vertical.mp4 (9:16)

pnpm run render:kitchen-report           # -> out/pl/easywed-report.mp4          (16:9)
pnpm run render:kitchen-report:vertical  # -> out/pl/easywed-report-vertical.mp4 (9:16)

pnpm run render:kids-count           # -> out/pl/easywed-kids.mp4          (16:9)
pnpm run render:kids-count:vertical  # -> out/pl/easywed-kids-vertical.mp4 (9:16)

pnpm run render:to-scale         # -> out/pl/easywed-scale.mp4        (16:9, at 960x540 for its page slot)
pnpm run render:to-scale:poster  # -> out/pl/easywed-scale-poster.png (frame 0 at 960x540, the <video> poster)

pnpm run render:seat-swap         # -> out/pl/easywed-swap.mp4        (16:9, at 960x540 for its page slot)
pnpm run render:seat-swap:poster  # -> out/pl/easywed-swap-poster.png (frame 0 at 960x540, the <video> poster)

pnpm run render:seat-swap-cut           # -> out/pl/easywed-swap-cut.mp4          (16:9)
pnpm run render:seat-swap-cut:vertical  # -> out/pl/easywed-swap-cut-vertical.mp4 (9:16)

pnpm run render:odd-room         # -> out/pl/easywed-shape.mp4        (16:9, at 960x540 for its page slot)
pnpm run render:odd-room:poster  # -> out/pl/easywed-shape-poster.png (frame 0 at 960x540, the <video> poster)

pnpm run render:walkthrough-long           # -> out/pl/easywed-walkthrough.mp4          (16:9)
pnpm run render:walkthrough-long:vertical  # -> out/pl/easywed-walkthrough-vertical.mp4 (9:16)

pnpm run render:all     # all of the above
pnpm run render:all:en  # all of the above in English -> out/en/
pnpm run lint           # eslint + tsc
```

## Languages

Every film renders in Polish (the default) or English. All on-screen strings live in
`src/easywed/i18n.ts` as one `pl` object and an `en` object typed `typeof pl`, so a key missing
from either side fails `tsc`. Scenes read the active language through `tl`:

```tsx
<SceneLabel step={tl.demo.hall.step} title={tl.demo.hall.title} subtitle={tl.demo.hall.subtitle} />
```

The language comes from `REMOTION_LANG` - Remotion only forwards `REMOTION_`-prefixed variables to
the bundle - and every render script writes to `out/${REMOTION_LANG:-pl}/`, so the two never
overwrite each other:

```bash
REMOTION_LANG=en pnpm run render:teaser  # -> out/en/easywed-teaser.mp4
```

Strings that redraw the app are its own `pl.json` / `en.json` values at `easywed/v1`, with the
key noted beside them. Guest names stay Polish in both languages - they are demo data.

Render a single frame while iterating:

```bash
pnpm exec remotion still easywed-demo out/frame.png --frame=265
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

| id                        | length | what it is                                          |
| ------------------------- | ------ | --------------------------------------------------- |
| `easywed-kids`            | 510f   | the 17 s kids-count cut, 16:9                       |
| `easywed-kids-vertical`   | 510f   | the same cut, 9:16                                  |
| `KidsHook`                | 96f    | 58 names, not a bracket among them                  |
| `KidsTag`                 | 180f   | two guests given an age bracket, one of them typed  |
| `KidsCount`               | 150f   | the "Dzieci 5" chip pressed; five rows, five badges |
| `KidsCta`                 | 108f   | the panel recedes, logo + easywed.app               |

| id                        | length | what it is                                        |
| ------------------------- | ------ | ------------------------------------------------- |
| `easywed-scale`           | 360f   | the 12 s to-scale landing loop, 16:9              |
| `ScaleHook`               | 120f   | the question; the measure tool switched on        |
| `ScaleMeasure`            | 150f   | Stół 1 across to the dance floor, "3.33 m"        |
| `ScaleGap`                | 120f   | Stół 5 up to the floor, "1.33 m", the seam home   |

| id                        | length | what it is                                        |
| ------------------------- | ------ | ------------------------------------------------- |
| `easywed-swap`            | 390f   | the 13 s seat-swap landing loop, 16:9             |
| `SwapHook`                | 105f   | a full room and the question; one chair pressed    |
| `SwapPick`                | 165f   | the seat popover; a guest taken from another table |
| `SwapReseat`              | 150f   | the chair she left, filled again; the seam home    |

| id                          | length | what it is                                              |
| --------------------------- | ------ | ------------------------------------------------------- |
| `easywed-swap-cut`          | 510f   | the 17 s seat-swap cut, 16:9                            |
| `easywed-swap-cut-vertical` | 510f   | the same cut, 9:16                                      |
| `SwapCutHook`               | 96f    | the full room, the question; a chair at Stół 4 pressed  |
| `SwapCutPick`               | 180f   | "Maria" typed into the search, picked; Stół 1 at 7 / 8  |
| `SwapCutReseat`             | 150f   | "Michał" typed, found under *Bez stołu*; the payoff     |
| `SwapCutCta`                | 108f   | the room recedes, logo + easywed.app                    |

| id                        | length | what it is                                              |
| ------------------------- | ------ | ------------------------------------------------------- |
| `easywed-shape`           | 360f   | the 12 s odd-room landing loop, 16:9                    |
| `ShapeHook`               | 105f   | the rectangle and the question; the hall dialog opened  |
| `ShapeL`                  | 150f   | *Kształt L* picked, *Edytuj obrys* - the handles come up |
| `ShapeEdit`               | 135f   | one corner pulled a metre out; the payoff, the seam home |

| id                             | length | what it is                                              |
| ------------------------------ | ------ | ------------------------------------------------------- |
| `easywed-walkthrough`          | 2490f  | the 83 s tour for YouTube, 16:9                         |
| `easywed-walkthrough-vertical` | 2355f  | the same tour in 9:16, without the measure chapter      |
| `Floors`                       | 240f   | a second hall added on floor 1, both halls in view      |

The long walkthrough's other fifteen chapters are the scenes registered above, from the short
walkthrough and the other cuts; only `Floors` is its own. The 9:16 cut leaves out `ScaleMeasure`:
on a phone at v1 the canvas toolbar isn't there, and measuring is a long-press menu item with no
*Środek* / *Krawędź* switch - the switch that chapter is built on. Its hall forms are the phone's
bottom sheet rather than the desktop's centred dialog.

The scenes are also registered individually (Studio folders "Scenes", "Teaser", "Import",
"Report", "Kids", "Swap-cut" and "Walkthrough-long") so a single beat can be previewed without scrubbing through the
whole timeline. The social cuts' scenes are registered at 9:16, the cut they are made for.

The landing-page loops - `easywed-scale`, `easywed-swap` and `easywed-shape` - sit together in the
Studio folder "Landing-loops", each with its beats in a nested folder ("Scale", "Swap", "Shape") at
16:9, their only size.

## Structure

```
src/easywed/
  timeline.ts            scene lengths, fps, dimensions - the single source of truth
  theme.ts               hex mirror of the app's `editorial` palette + brand colors, fonts
  layouts.ts             WIDE_HALL, TALL_HALL, the odd-room loop's L_HALL and the long
                         walkthrough's second hall, 60 units per metre
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
                         lives in components/PrintSheet.tsx, since the long walkthrough reuses
                         it, and the guest list in components/GuestList.tsx, since the
                         kids-count cut draws it too
  kids-count/            the kids-count cut, in the teaser's shape; guests.ts puts five
                         children on the roster without changing its 58, and
                         components/EditGuestDrawer.tsx redraws the edit-guest form. The
                         guest list itself is components/GuestList.tsx, shared with the
                         kitchen-report cut
  to-scale/              the to-scale landing loop - three scenes drawn off one shared clock
                         (script.ts), closed by components/LoopSeam.tsx, which the other
                         landing loops reuse
  seat-swap/             the seat-swap landing loop, in the to-scale loop's shape; seating.ts
                         works out who sits where at each frame and what the seat popover
                         (components/SeatPopover.tsx) therefore lists. The social cut of the
                         same move lives beside it - SeatSwapCut.tsx, cutScript.ts, the
                         SwapCut* scenes and components/SwapCutPlanner.tsx - and shares
                         seating.ts and the popover
  odd-room/              the odd-room landing loop, in the to-scale loop's shape, drawn on
                         L_HALL (layouts.ts) with HallCanvas's `walls` polygon; script.ts
                         derives the outline from the frame, and its components redraw the
                         shape-edit pill and the vertex handles. The hall dialog lives in
                         components/HallPanel.tsx, since the long walkthrough draws it too
  walkthrough-long/      the 83 s YouTube tour: its timeline reads each chapter's length from
                         the film it comes from; FloorsScene adds secondHallBeside()
                         (layouts.ts) through components/HallsPanel.tsx, the *Sale* list,
                         and the odd-room chapters then shape that hall rather than L_HALL
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
- Copy is lifted from the landing page strings in `easywed/src/i18n/locales/pl.json` and
  `en.json`, so the video and the site say the same thing.

If the app's palette or copy changes, `theme.ts` and `i18n.ts` are the two places to update.
