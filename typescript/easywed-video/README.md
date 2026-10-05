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
- **the keep-apart cut** - 17 seconds for Reels/TikTok, 9:16 only: Stół 6 taken away from the DJ
  booth, then the couple's two family tables one behind the other, one of them dragged across the
  dance floor with its guests, the CTA.
- **the mama-link cut** - 18 seconds for Reels/TikTok, 9:16 only: mum's third question about
  where the uncle sits, a view-only invite link made on the couple's laptop, mum signing in on her
  phone and finding his table herself in the guest list, the CTA.
- **the sunday-couch cut** - 22.7 seconds for Reels/TikTok, 9:16 only: one Sunday evening on one
  laptop, told by a clock and two voices - the empty hall at 19:40, the room laid out by 20:10,
  everyone seated by 22:30, the CTA.
- **the list-seat cut** - 16 seconds for Reels, 9:16 for now, episode 1 of the Instagram series
  *Wesele bez spiny*: a cousin who is coming after all, seated on the couple's phone straight from
  the guest list - the full tables greyed out, the free chair beside his family - the CTA.
- **the table-shape cut** - 16 seconds for Reels, 9:16 only, episode 2 of *Wesele bez spiny*: one
  seated round table on the couple's phone turned square, stretched to a 3x1 m long table and
  stood up along the wall in its form, its eight guests staying put - the CTA.
- **the ten-tables cut** - 18 seconds for Reels, 9:16 only, episode 3 of *Wesele bez spiny*: the
  venue's "ten round tables of eight" typed once into the batch form on the couple's laptop, the
  ten tables landing in two rows, then the dance floor, the stage and the door dragged into place
  from the add hub - the CTA.
- **the try-now speedrun** - 25.5 seconds for Reels, 9:16 only, episode 4 of *Wesele bez spiny*:
  a stopwatch from easywed.app's landing page on the couple's phone - *Wypróbujcie bez konta* into
  guest mode, the seeded hall, *Okrągły 8* from the add hub, *Babcia Jadzia* typed in and seated
  from the table's form - stopping at 0:18 with no cut in the run, then the CTA.
- **the todo-list cut** - 15 seconds for Reels, 9:16 only, episode 5 of *Wesele bez spiny*: "did we
  pay the DJ?" answered by the couple's dated list on the phone - the deposit red because it is
  overdue, ticked off, one more thing added - the CTA. A list, not an alarm: nothing on screen says
  the app will remind anyone.

All but the loops, the keep-apart, mama-link, sunday-couch, list-seat, table-shape, ten-tables, try-now and todo-list cuts render in 16:9 (1920x1080) and 9:16 (1080x1920), and all
are in Polish.

It is a standalone package on purpose - it sits next to `easywed/` rather than inside it, so it
stays out of that project's tsconfig, ESLint and Vite scope.

## Commands

The package manager is pnpm, pinned in `package.json` (`packageManager`) - `corepack` or pnpm
itself fetches the right version, so `pnpm install` is all the setup there is.

```bash
pnpm run dev              # Remotion Studio on http://localhost:3000
pnpm run dev:en           # the same, in English
pnpm run render           # -> out/pl/showcase/easywed-demo.mp4 (16:9)
pnpm run render:vertical  # -> out/pl/showcase/easywed-demo-vertical.mp4 (9:16)
pnpm run render:gif       # -> out/pl/showcase/easywed-demo.gif (960px wide, every 2nd frame)

pnpm run render:teaser           # -> out/pl/showcase/easywed-teaser.mp4 (16:9)
pnpm run render:teaser:vertical  # -> out/pl/showcase/easywed-teaser-vertical.mp4 (9:16)

pnpm run render:import-excel           # -> out/pl/features/easywed-import.mp4 (16:9)
pnpm run render:import-excel:vertical  # -> out/pl/features/easywed-import-vertical.mp4 (9:16)

pnpm run render:kitchen-report           # -> out/pl/features/easywed-report.mp4 (16:9)
pnpm run render:kitchen-report:vertical  # -> out/pl/features/easywed-report-vertical.mp4 (9:16)

pnpm run render:kids-count           # -> out/pl/features/easywed-kids.mp4 (16:9)
pnpm run render:kids-count:vertical  # -> out/pl/features/easywed-kids-vertical.mp4 (9:16)

pnpm run render:to-scale         # -> out/pl/landing-loops/easywed-scale.mp4 (16:9, at 960x540 for its page slot)
pnpm run render:to-scale:poster  # -> out/pl/landing-loops/easywed-scale-poster.png (frame 0 at 960x540, the <video> poster)

pnpm run render:seat-swap         # -> out/pl/landing-loops/easywed-swap.mp4 (16:9, at 960x540 for its page slot)
pnpm run render:seat-swap:poster  # -> out/pl/landing-loops/easywed-swap-poster.png (frame 0 at 960x540, the <video> poster)

pnpm run render:seat-swap-cut           # -> out/pl/features/easywed-swap-cut.mp4 (16:9)
pnpm run render:seat-swap-cut:vertical  # -> out/pl/features/easywed-swap-cut-vertical.mp4 (9:16)

pnpm run render:odd-room         # -> out/pl/landing-loops/easywed-shape.mp4 (16:9, at 960x540 for its page slot)
pnpm run render:odd-room:poster  # -> out/pl/landing-loops/easywed-shape-poster.png (frame 0 at 960x540, the <video> poster)

pnpm run render:walkthrough-long           # -> out/pl/showcase/easywed-walkthrough.mp4 (16:9)
pnpm run render:walkthrough-long:vertical  # -> out/pl/showcase/easywed-walkthrough-vertical.mp4 (9:16)

pnpm run render:keep-apart:vertical  # -> out/pl/stories/easywed-apart-vertical.mp4 (9:16, its only size)

pnpm run render:mama-link:vertical   # -> out/pl/stories/easywed-mama-vertical.mp4 (9:16, its only size)

pnpm run render:sunday-couch:vertical  # -> out/pl/stories/easywed-couch-vertical.mp4 (9:16, its only size)

pnpm run render:list-seat:vertical  # -> out/pl/chill-wed/easywed-listseat-vertical.mp4 (9:16; the 1:1 feed cut is still to come)

pnpm run render:table-shape:vertical  # -> out/pl/chill-wed/easywed-tableshape-vertical.mp4 (9:16, its only size)

pnpm run render:ten-tables:vertical  # -> out/pl/chill-wed/easywed-batch-vertical.mp4 (9:16, its only size)

pnpm run render:todo-list:vertical  # -> out/pl/chill-wed/easywed-todo-vertical.mp4 (9:16, its only size)

pnpm run render:try-now:vertical  # -> out/pl/chill-wed/easywed-trynow-vertical.mp4 (9:16, its only size)

pnpm run render:all     # all of the above
pnpm run render:all:en  # all of the above in English -> out/en/
pnpm run lint           # eslint + tsc
```

## Languages

Every film renders in Polish (the default) or English. The app's own strings live in
`src/easywed/i18n.ts`, and each group's film lines in its own `src/easywed/{group}/i18n.ts`; every
file has a `pl` object and an `en` object typed `typeof pl`, so a key missing from either side
fails `tsc`. `i18n.ts` merges them into one `tl`. Scenes read the active language through `tl`:

```tsx
<SceneLabel step={tl.demo.hall.step} title={tl.demo.hall.title} subtitle={tl.demo.hall.subtitle} />
```

The language comes from `REMOTION_LANG` - Remotion only forwards `REMOTION_`-prefixed variables to
the bundle - and every render script writes to `out/${REMOTION_LANG:-pl}/<group>/`, so the two never
overwrite each other:

```bash
REMOTION_LANG=en pnpm run render:teaser  # -> out/en/showcase/easywed-teaser.mp4
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
`src/easywed/{group}/{id}/` in the teaser's shape, registers it in its group's `Compositions.tsx`
and `package.json`, checks
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

| id                        | length | what it is                                                  |
| ------------------------- | ------ | ----------------------------------------------------------- |
| `easywed-apart-vertical`  | 510f   | the 17 s keep-apart cut, 9:16 only                          |
| `ApartHook`               | 96f    | close on the DJ booth, the uncle's line up on frame 0       |
| `ApartUncle`              | 150f   | Stół 6 taken to the far corner; push-in on the family tables |
| `ApartParents`            | 180f   | Rodzina taty dragged over the dance floor, guests and all   |
| `ApartCta`                | 108f   | the room recedes, the payoff, logo + easywed.app            |

| id                        | length | what it is                                                     |
| ------------------------- | ------ | -------------------------------------------------------------- |
| `easywed-mama-vertical`   | 540f   | the 18 s mama-link cut, 9:16 only                              |
| `MamaHook`                | 96f    | mum's thread - the photo of the paper plan, her three questions |
| `MamaInvite`              | 180f   | the laptop: the invite circle, *Podgląd*, the link created, copied |
| `MamaPhone`               | 180f   | mum taps the link, signs in, opens *Goście* and types his name |
| `MamaCta`                 | 108f   | the phone recedes, the payoff, logo + easywed.app              |

| id                        | length | what it is                                                          |
| ------------------------- | ------ | ------------------------------------------------------------------- |
| `easywed-couch-vertical`  | 682f   | the 22.7 s sunday-couch cut, 9:16 only                              |
| `CouchHook`               | 96f    | 19:40, the laptop on the empty seeded hall, the first line on frame 0 |
| `CouchHall`               | 180f   | 20:10, the dance floor, the bar and seven tables land; "Siedem"     |
| `CouchSeating`            | 210f   | 21:05, the guest panel open, the room seated table by table         |
| `CouchDone`               | 120f   | 22:30, back over the laptop, every chair taken, 58/58               |
| `CouchCta`                | 108f   | the laptop recedes, the payoff, logo + easywed.app                  |

| id                          | length | what it is                                                       |
| --------------------------- | ------ | ---------------------------------------------------------------- |
| `easywed-listseat-vertical` | 480f   | the 16 s list-seat cut, 9:16 - series episode 1                  |
| `ListSeatHook`              | 96f    | the guest list on a phone, Tomek *Bez miejsca*, the hook on frame 0 |
| `ListSeatTables`            | 150f   | his seat button; the table list, every full table greyed out     |
| `ListSeatSeat`              | 150f   | Stół 5's seats, the free chair picked and confirmed; the payoff  |
| `ListSeatCta`               | 108f   | the phone recedes under the payoff, logo + easywed.app           |

| id                            | length | what it is                                                        |
| ----------------------------- | ------ | ----------------------------------------------------------------- |
| `easywed-tableshape-vertical` | 480f   | the 16 s table-shape cut, 9:16 only - series episode 2            |
| `TableShapeHook`              | 96f    | Stół 3 round on a phone, the hook on frame 0; tapped, its form up |
| `TableShapeShape`             | 150f   | *Prostokątny*, then 3 and 1 typed; the diagram goes square, long  |
| `TableShapeTurn`              | 150f   | *Obróć o 90°*; the form closed on the long table along the wall   |
| `TableShapeCta`               | 108f   | the phone recedes under the payoff, logo + easywed.app            |

| id                       | length | what it is                                                           |
| ------------------------ | ------ | -------------------------------------------------------------------- |
| `easywed-batch-vertical` | 540f   | the 18 s ten-tables cut, 9:16 only - series episode 3                |
| `TenTablesHook`          | 96f    | an empty hall on a laptop, the hook on frame 0; the canvas menu      |
| `TenTablesBatch`         | 180f   | *Dodaj stoły*: round, 1.5, 10 typed; ten tables land in two rows     |
| `TenTablesRoom`          | 180f   | *Elementy sali*, the add hub; floor, stage and door dragged; payoff  |
| `TenTablesCta`           | 108f   | the laptop recedes under the payoff, logo + easywed.app              |

| id                      | length | what it is                                                        |
| ----------------------- | ------ | ----------------------------------------------------------------- |
| `easywed-todo-vertical` | 450f   | the 15 s todo-list cut, 9:16 only - series episode 5              |
| `TodoHook`              | 96f    | the planner on a phone, the hook on frame 0; *Przypomnienia* up   |
| `TodoRows`              | 150f   | close on the rows, the deposit red; ticked, struck through        |
| `TodoAdd`               | 120f   | a jump cut onto the filled-in popover; the fifth row; the payoff  |
| `TodoCta`               | 108f   | the phone recedes under the payoff, logo + easywed.app            |

| id                        | length | what it is                                                              |
| ------------------------- | ------ | ----------------------------------------------------------------------- |
| `easywed-trynow-vertical` | 765f   | the 25.5 s try-now speedrun, 9:16 only - series episode 4               |
| `TryNowHook`              | 96f    | the landing page on a phone, the hook on frame 0; the tap starts the clock |
| `TryNowTable`             | 225f   | guest mode, the card at 0 of 3; the add hub, *Okrągły 8*, pinched in    |
| `TryNowSeat`              | 360f   | a guest typed and saved; seated from the table's form; the clock stops  |
| `TryNowCta`               | 108f   | the phone recedes under the payoff, logo + easywed.app                  |

The long walkthrough's other fifteen chapters are the scenes registered above, from the short
walkthrough and the other cuts; only `Floors` is its own. The 9:16 cut leaves out `ScaleMeasure`:
on a phone at v1 the canvas toolbar isn't there, and measuring is a long-press menu item with no
*Środek* / *Krawędź* switch - the switch that chapter is built on. Its hall forms are the phone's
bottom sheet rather than the desktop's centred dialog.

The scenes are also registered individually (Studio folders "Scenes", "Teaser", "Import",
"Report", "Kids", "Swap-cut", "Keep-apart", "Mama-link", "Sunday-couch", "List-seat", "Table-shape", "Ten-tables", "Try-now" and "Walkthrough-long") so a single beat can be previewed without scrubbing through the
whole timeline. The social cuts' scenes are registered at 9:16, the cut they are made for.

The landing-page loops - `easywed-scale`, `easywed-swap` and `easywed-shape` - sit together in the
Studio folder "Landing-loops", each with its beats in a nested folder ("Scale", "Swap", "Shape") at
16:9, their only size.

## Structure

```
src/easywed/
  timeline.ts            scene lengths, fps, dimensions - the single source of truth
  theme.ts               hex mirror of the app's `editorial` palette + brand colors, fonts
  layouts.ts             WIDE_HALL, TALL_HALL, the odd-room loop's L_HALL, the keep-apart
                         cut's KEEP_APART_HALL, the sunday-couch cut's COUCH_HALL, the
                         table-shape cut's TABLE_SHAPE_HALL, the ten-tables cut's
                         TEN_TABLES_HALL (laid out by addTablesGrid, v1's addTables), the
                         try-now speedrun's SEEDED_HALL (v1's empty DEFAULT_HALL) and the long
                         walkthrough's second hall, 60 units per metre
  format.ts              useFormat() - picks hall + type scale from the composition size
  data.ts                the demo wedding: guest list, couple
  geometry.ts            seat positions around round/rectangular tables
  lang.ts                LANG, locale and the helpers the string files share - plurals,
                         spelled-out numbers, months
  i18n.ts                the app's own strings, merged with each group's i18n.ts into `tl`
  components/            Backdrop, BrandMark, Wordmark, Icon, AppFrame, PlannerCanvas,
                         HallCanvas, PlannerTable, ... - and the phone: PhoneFrame (the
                         handset, the thumb's touch and the browser's address bar) and
                         PhoneShell (the planner on it, as a viewer, or as the couple in
                         guest mode or signed in, its canvas fitted or a film's own zoomed
                         view), shared
                         by the mama-link, list-seat and table-shape cuts; SeriesTag, the
                         Instagram series' pill; AddHub, the *Dodaj do sali* picker's body,
                         for the ten-tables cut's dialog and the try-now cut's sheet

  Each group below has its own Compositions.tsx (its Studio registrations, rendered by
  src/Root.tsx) and, apart from animations/, an i18n.ts with its films' lines.

  showcase/              the overview films
    demo/                the full film: Film.tsx stitches scenes/ (one file per scene) with crossfades
    teaser/              the social cut - its own timeline, Teaser.tsx and scenes,
                         drawn with the same theme, layouts and components
    walkthrough-long/    the 83 s YouTube tour: its timeline reads each chapter's length from
                         the film it comes from; FloorsScene adds secondHallBeside()
                         (layouts.ts) through components/HallsPanel.tsx, the *Sale* list,
                         and the odd-room chapters then shape that hall rather than L_HALL
  features/              the single-feature cuts
    import-excel/        the import cut, in the teaser's shape; its dialog redraw lives in
                         components/ImportDialog.tsx, since the long walkthrough reuses it
    kitchen-report/      the kitchen-report cut, in the teaser's shape; the printed report
                         lives in components/PrintSheet.tsx, since the long walkthrough reuses
                         it, and the guest list in components/GuestList.tsx, since the
                         kids-count cut draws it too
    kids-count/          the kids-count cut, in the teaser's shape; guests.ts puts five
                         children on the roster without changing its 58, and
                         components/EditGuestDrawer.tsx redraws the edit-guest form. The
                         guest list itself is components/GuestList.tsx, shared with the
                         kitchen-report cut
  landing-loops/         the 16:9 landing loops
    to-scale/            the to-scale landing loop - three scenes drawn off one shared clock
                         (script.ts), closed by components/LoopSeam.tsx, which the other
                         landing loops reuse
    seat-swap/           the seat-swap landing loop, in the to-scale loop's shape; seating.ts
                         works out who sits where at each frame and what the seat popover
                         (components/SeatPopover.tsx) therefore lists. The social cut of the
                         same move lives beside it - SeatSwapCut.tsx, cutScript.ts, the
                         SwapCut* scenes and components/SwapCutPlanner.tsx - and shares
                         seating.ts and the popover
    odd-room/            the odd-room landing loop, in the to-scale loop's shape, drawn on
                         L_HALL (layouts.ts) with HallCanvas's `walls` polygon; script.ts
                         derives the outline from the frame, and its components redraw the
                         shape-edit pill and the vertex handles. The hall dialog lives in
                         components/HallPanel.tsx, since the long walkthrough draws it too
  stories/               the 9:16 story cuts
    keep-apart/          the keep-apart cut, 9:16 only, in the seat-swap cut's shape: every
                         planner scene draws components/ApartPlanner.tsx off one clock
                         (script.ts) - the two table drags, the pointer and a camera that
                         zooms the canvas. Its lines use components/CaptionLine.tsx, shared
                         with the story cuts still to come
    mama-link/           the mama-link cut, 9:16 only: mum's phone (components/MamaPhone.tsx)
                         and the couple's laptop (components/InviteDesk.tsx) both run off
                         one clock (script.ts). Its components are the film's own - a generic
                         chat thread, the members dialog and the sign-in page; the planner
                         on her phone is the shared PhoneShell in its `viewer` mode.
                         guests.ts seats the uncle without changing the roster's 58. The laptop is AppFrame's `desktop` frame, and the
                         viewer's guest list is GuestList with `readOnly` and a `query`
    sunday-couch/        the sunday-couch cut, 9:16 only, in the keep-apart cut's shape: every
                         scene draws components/CouchPlanner.tsx off one clock (script.ts) -
                         the time chip, the two voices (SpeechLine, over CaptionLine) and a
                         camera on the couple's laptop (CouchDesk: AppFrame's `desktop` frame
                         with its rail badges counted off the plan). The room is COUCH_HALL,
                         the 20x12 m hall guest mode seeds; the guest panel's progress card
                         is components/SeatingProgress.tsx, shared with the import cut
  chill-wed/             „Wesele bez spiny”, the Instagram series
    list-seat/           the list-seat cut, 9:16 only so far, in the mama-link cut's shape:
                         every scene draws components/ListSeatStage.tsx off one clock
                         (script.ts) - the series tag, the line in the band, and a camera
                         on the couple's phone (ListSeatPhone: PhoneShell in `guest` mode,
                         with the SeatAssignSheet redraw over it). guests.ts seats the Lis,
                         Nowicki and Wrona families at Stół 5 and leaves Tomek last on the
                         list, still 58
    table-shape/         the table-shape cut, 9:16 only, in the list-seat cut's shape: every
                         scene draws components/TableShapeStage.tsx off one clock
                         (script.ts), with shape.ts working out Stół 3 and its form at each
                         frame - round, square, 3x1, turned - on the canvas and in the form's
                         seat diagram. The phone (TableShapePhone) is PhoneShell in `owner`
                         mode with its canvas zoomed onto Stół 3 and the table toolbar, and
                         components/TableEditSheet.tsx redraws the table form in its drawer
    ten-tables/          the ten-tables cut, 9:16 only, in the table-shape cut's shape, on the
                         couple's laptop as the sunday-couch cut draws it: every scene draws
                         components/TenTablesStage.tsx off one clock (script.ts), with
                         state.ts reading the form, the fixtures and the pointer off it and
                         components/desk.ts placing everything on the desk. Its redraws are
                         the canvas menu, the batch dialog, the *Elementy sali* panel and the
                         add-hub dialog; jump cuts skip the dialogs v1 opens between beats
    todo-list/           the todo-list cut, 9:16 only, in the table-shape cut's shape: every
                         scene draws components/TodoListStage.tsx off one clock (script.ts),
                         the add scene and the close with `jumped` so the seam into the
                         add scene is the cut past the typing. reminders.ts is the couple's
                         list, red computed from its due dates against SEEN_ON. The phone
                         is PhoneShell in `owner` mode, and components/RemindersSheet.tsx
                         redraws the *Przypomnienia* drawer and its create popover
    try-now/             the try-now speedrun, 9:16 only, in the table-shape cut's shape:
                         every scene draws components/TryNowStage.tsx off one clock
                         (script.ts), which also drives the stopwatch (RunClock) - nothing
                         between its start and stop is cut. plan.ts works out v1's fit of
                         the seeded hall on the phone, the pan, the pinch and what the store
                         holds at each frame. Its redraws are the landing hero at v1.1.2
                         (LandingScreen), the canvas and the first-run card (SeededCanvas,
                         OnboardingCard), the add-hub sheet, the empty guest drawer, the
                         add-guest drawer and the table form's guest picker; the form itself
                         is the table-shape cut's TableEditSheet, fresh
    carousel/            CarouselEpisode - a finished 9:16 episode scaled into a 4:5 slide
  animations/            standalone animations
    stress-away/         StressAway, a looping 9:16 Reel
```

The teaser reuses `useFormat()`, `HallCanvas` and `PlannerCanvas`, so it adapts to both aspect
ratios the same way the walkthrough does. Its own beats and its shorter crossfade live in
`showcase/teaser/timeline.ts` rather than the shared one - a teaser cuts where a walkthrough dissolves.

## How one set of scenes renders two aspect ratios

There is no second set of components. `useFormat()` reads `useVideoConfig()` and derives
`tall = height > width`, then hands each scene its room plan and type scale - so a group's
`Compositions.tsx` only registers a second size and the scenes adapt themselves:

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

If the app's palette or copy changes, `theme.ts` and the `i18n.ts` files are the places to update.
