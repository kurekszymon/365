> **Scope:** Instagram-first recurring series, 5 Reels (9:16) + one 1:1 feed variant · **Date:** 2026-09-26 · **Written against:** `easywed/v1`

# „Wesele bez spiny”: five Reels for couples who've never heard of easywed

## Strategy

This is for Polish engaged couples who have a date, a venue and a growing guest list, and have never
heard of easywed. They'll meet it on Instagram, between other wedding content. Every Reel does the
same thing a friend would do by text. It names a small prep moment the couple already knows, shows
the app handling it on screen with real-looking tables, guests and numbers, says what just happened
in plain words, and ends on one thing to do next (open easywed.app, in guest mode, tonight). All
five are a recurring **series** with one on-screen tag, so the grid reads as a set and a viewer who
liked one can find the others. Every beat here is new: nothing a shipped or planned film already
uses (`mama-link` and `sunday-couch` from the 2026-09-25 plan are not re-briefed). All five work
signed out, so every caption can honestly say *bez konta*.

## Series name: three options

The tag is a small pill in the top-left of every Reel, from frame 0 to the CTA: series name · episode
number. Same colour, same place, every time. It's one new component (`SeriesTag`).

| option | on screen | why |
| --- | --- | --- |
| **A (recommended)** | *„Wesele bez spiny · #1”* | Sounds like a friend. It promises the feeling, not a feature, and it's easy to say out loud: "widziałaś to «Wesele bez spiny»?" |
| B | *„Jak to ogarnąć? · #1”* | The question every hook is really asking. Very casual; on its own it doesn't say "wedding". |
| C | *„Jak to zrobić w easywed? · #1”* | Your suggestion. The clearest about what the series is, but it puts the product name ahead of the situation. It reads more like a tutorial and less like a friend. |

None of the three is on the burned-lines list. The briefs below use option A. Swapping names only
changes the tag's string.

## Candidates, ranked

Ranked by **shareability** (would someone tag their partner or leave a comment?) × **teaching
clarity** (does a stranger understand what the app does after one sound-off watch?).

| rank | candidate | shareable | teaches | verdict |
| :---: | --- | --- | --- | --- |
| 1 | **A guest seated straight from the guest list** (`guest_seated` `source: "guest_list"`, `SeatAssignSheet`). The late cousin, full tables greyed out, you see who he'll sit next to. | high: "the cousin who suddenly RSVPs" happens at every wedding | **highest**: tap a name, pick a table, pick a chair, the core job in three taps | **brief** `list-seat` |
| 2 | **Round vs rectangular, and rotating one.** One seated table turned round → rectangular → long → along the wall. | **highest for comments**: "team okrągłe czy team prostokątne?" is a real argument couples have | high: the plan uses your actual furniture, and the guests stay put | **brief** `table-shape`. The *custom* shape is cut, see below |
| 3 | **Several tables at once, then the room** (`tables_batch_added`, then stage / dance floor / entrance). | medium: the "the venue said ten round tables of eight" moment | high: an empty hall to a laid-out room in one form | **brief** `ten-tables` |
| 4 | **"You can start right now"**: easywed.app on a phone, one tap, a hall is already there, first table in. | medium: low drama, but it's the whole acquisition ask in one move | high: removes the "do I have to sign up?" doubt by *showing* there's nothing to sign up for | **brief** `try-now` |
| 5 | **Reminders as a dated to-do list** ("the DJ deposit, did we pay it?"). | medium-high: the list anxiety is very relatable | **low for this objective**: it isn't the seating plan, and the app's own copy leans towards "we'll remind you" (see its claim-check) | **brief** `todo-list`, ships last, with a risk flag |
| 6 | **CSV guest-list export** for the couple's own spreadsheet | low: finishing something isn't a moment people share | medium | **rejected**, see below |
| 7 | **BYO-key AI assistant** asked in Polish to add/move tables | high curiosity | **low, honestly told** | **rejected**, see below |

### Rejected, with reasons

- **CSV export.** `guestsCsv.ts` at v1 joins cells with a **comma** (`cells…join(",")`, line 41),
  with a UTF-8 BOM. Excel in a Polish locale uses a **semicolon** as its list separator, so
  double-clicking the file puts every row into column A for most of the people this series is
  for. The Reel's natural payoff ("open it in your own spreadsheet") would be false on their
  machines. Google Sheets' import detects the comma, but a Reel that has to say "use Sheets, not
  Excel" isn't a one-watch idea. Exporting is also a "done" moment, with little drama to share.
  Worth revisiting if the export ever gets a `;` option.
- **BYO-key AI.** The honest version has to show *„Połącz swoje AI”* (`assistant.setup.title`), an
  endpoint, a key field and a model id before the first message. A stranger can't repeat it without
  an OpenRouter account or a local llama.cpp server. A Reel whose real next step is "get an API
  key" breaks the format (situation → it works → do it tonight), and cutting the setup out implies
  free, built-in AI, which is on the do-not-claim list. **Risk: high. Not briefed.** If you want it
  anyway, it belongs in a long, clearly-labelled walkthrough chapter, not a Reel for strangers.
- **Custom-shaped tables** (the third part of candidate 2). `TableShapeField` at v1 offers only
  *Prostokątny* and *Okrągły*. A custom table exists only from an import and is read-only in the
  form: `tables.shape.custom_readonly` *„Niestandardowy kształt z importu - geometria nie może być
  tu edytowana.”* A couple can't make one, so no Reel shows one. (Custom **fixtures** and **hall
  outlines** are real, but the odd-room loop already spent the hall-outline beat.)
- **`mama-link`, `sunday-couch`**: already briefed on 2026-09-25. Not re-briefed. Overlap notes
  are in `ten-tables` and `try-now`.

## Prioritised table

| ship | id | hook (first 1.5 s) | format | length | channel | effort |
| :---: | --- | --- | --- | --- | --- | --- |
| 1 | `list-seat` | *„Kuzyn Tomek jednak przyjedzie.”* | 9:16 | 480f / 16.0 s | Reels (also TikTok) | **M**: new phone shell, phone guest list, the seat sheet |
| 1b | `list-seat` (feed) | same | **1:1** | 480f / 16.0 s | IG feed | **M**: the `useFormat()` third branch + `SQUARE_HALL`, see its section |
| 2 | `table-shape` | *„Okrągłe stoły czy jeden długi?”* | 9:16 | 480f / 16.0 s | Reels | **S–M**: reuses the phone shell. New: the edit sheet and a table-shape tween |
| 3 | `ten-tables` | *„Sala mówi: dziesięć okrągłych po osiem.”* | 9:16 | 540f / 18.0 s | Reels | **M**: context menu, the batch form, the grid landing, the add dialog |
| 4 | `try-now` | *„Chcesz tylko zerknąć, jak to wygląda?”* | 9:16 | 450f / 15.0 s | Reels | **M**: a phone-browser landing crop, the add-hub sheet |
| 5 | `todo-list` | *„Zaliczka dla DJ-a… zapłaciliśmy czy nie?”* | 9:16 | 450f / 15.0 s | Reels | **S**: reuses the phone shell. New: the reminders panel |

**`list-seat` ships first.** It is the clearest lesson in what the app is for, its beat is new
(every seated guest so far went through the canvas popover or the import), and it's the one worth
cutting a second time for the feed. `table-shape` follows because it's the best one for comments.

**Out of scope this run, at your call:** 16:9 landing loops and the YouTube walkthrough. The
skill's format list is otherwise complete: 9:16 for all five, 1:1 for the strongest.

### Shared across the series

- **`SeriesTag`**: pill, top-left, *„Wesele bez spiny · #N”*, from frame 0 until the CTA scene
  begins. Numbered in posting order, so the number is a prop, not baked in.
- **The format**: four scenes (hook, then two scenes of the app working, then the CTA). All at
  `…_TRANSITION = 8`, so each brief's arithmetic is `Σ scenes − 8 × 3`. The payoff always lands in
  Playfair at the end of the last app scene, just before the CTA. The same shape every time is what
  makes it read as a series.
- **Captions on screen** reuse `CaptionLine` (built for `keep-apart`), one line at a time. Every
  line is short enough to read out loud.
- **`PhoneShell`**: four of the five are drawn as the planner **on a phone** (`useIsMobile`,
  `MobileTabBar` with *Goście / Stoły / Elementy sali / Przypomnienia*, bottom sheets via
  `ui/responsive-dialog.tsx`), because the viewer is holding a phone. `ten-tables` is the exception:
  the batch form's only entry point is the **desktop** right-click menu, so it is drawn on the desktop
  `AppFrame` in the tall frame, as `keep-apart` was. `mama-link`'s planned `PhoneViewer` is the
  same shell in read-only mode, so whichever gets built first, the other reuses it.
- **Names.** `data.ts`'s whole roster is spent (existing-films.md), as are the kids-count five and
  *Halina Pawlak* (mama-link). New people here: the *Lis* and *Wrona* families and the *Nowiccy*,
  listed in each brief.

---

## Brief 1: `list-seat`

- **Compositions:** `easywed-listseat-vertical` (1080×1920) and, as the feed variant,
  `easywed-listseat-square` (1080×1080). Folder `src/easywed/list-seat/`.
- **Duration:** scenes `hook 96 + tables 150 + seat 150 + cta 108 = 504`, at
  `LIST_SEAT_TRANSITION = 8` × 3 seams → **480f (16.0 s)**. Scene starts: 0, 88, 230, 372.
- **Aspect ratio:** 9:16; 1:1 variant below.
- **Single idea:** a guest turns up late on the list, and you seat him from the list itself.
  Tap his name, full tables are already greyed out, and you can see who he'll sit next to before
  you pick his chair.
- **Hook, first 1.5 s (frames 0–45), verbatim:** *„Kuzyn Tomek jednak przyjedzie.”*

| frames | on screen | on-screen copy |
| --- | --- | --- |
| 0–45 | Phone planner, *Goście* tab open. One row stands out: *Tomasz Lis* with the *Bez miejsca* pill. Chips above read *Wszyscy 58* · *Bez miejsca 1* (chrome). `SeriesTag`. Hook in Playfair, top third. | *„Kuzyn Tomek jednak przyjedzie.”* · row: *„Tomasz Lis”*, *„Bez miejsca”* |
| 45–96 | His row's utensils button pulses (`seatHint`'s `animate-pulse` ring). The hook gives way to a caption. | *„Gdzie go posadzić?”* |
| 88–170 | A thumb taps the utensils button. The sheet rises, titled *„Posadź: Tomasz Lis”*: a list of tables with their counts. *Stół pary młodej 10/10* and *Stół 1–4, 6 8/8* are disabled (greyed), and *Stół 5 7/8* is the only live one. | *„Posadź: Tomasz Lis”* · rows *„Stół 5 … 7/8”* etc. · caption *„Pełne stoły odpadają same.”* |
| 170–238 | The thumb taps *Stół 5*. | (caption stays) |
| 230–300 | The sheet title becomes *„Stół 5”*, with a back arrow. A 4-column seat grid: seven taken seats, each with initials and a name (*Ewa Lis*, *Marek Lis*, *Zuzanna Lis*, *Paweł Nowicki*, *Karolina Nowicka*, *Adam Wrona*, *Beata Wrona*), and one dashed empty seat, **6**, between *Marek Lis* and *Zuzanna Lis*. | *„Stół 5”* · *„Wolne miejsce”* · caption *„Widzisz, obok kogo siądzie.”* |
| 300–340 | Seat 6 is tapped and selected. The footer button changes from *„Wybierz miejsce”* to *„Posadź na miejscu 6”*. | *„Posadź na miejscu 6”* |
| 340–380 | The button is tapped and the sheet drops. Tomasz's row now reads *Przy stole: Stół 5* (chrome), and the chip reads *Bez miejsca 0*. Payoff in Playfair. | *„Tomek siedzi przy swoich. Reszta nawet nie drgnęła.”* |
| 372–480 | `CallToAction`. | *„Posadź gościa prosto z listy”* + *easywed.app* pill |

- **CTA:** *„Posadź gościa prosto z listy”* over the *easywed.app* pill.
- **App surface:** the phone guest list (`GuestListContent`: row, *Bez miejsca* pill, the utensils
  button `guests.assign.action`), and `Guests/SeatAssignSheet.tsx` in its bottom-sheet form (table
  list → seat grid → confirm).
- **Reuses:** `CaptionLine`, `CallToAction`, `Cursor` (as a thumb-tap), the chips row of
  `GuestList`, the bottom-sheet look from `walkthrough-long/components/HallsPanel.tsx`.
- **New:** `PhoneShell` (shared). `SeatAssignSheet` redraw: the disabled outline rows with
  `count/capacity`, and the `grid-cols-4` seat cards (occupied = muted initials + truncated name,
  empty = dashed number + *Wolne miejsce*, selected = `border-primary bg-primary/10`). `SeriesTag`.
  A roster file `list-seat/guests.ts`: 57 seated and one unseated = **58**, matching the 58 seats.
- **Success signal:** `guest_seated` with `source: "guest_list"`, `displaced: false`
  (`SeatAssignSheet.tsx:92`).
- **Caption (IG, PL):**
  > Kuzyn jednak przyjedzie, a wszystkie stoły już rozplanowane? 😅
  > Klikasz jego nazwisko na liście gości, wybierasz stół (pełne same się wyszarzają) i widzisz, obok kogo usiądzie, zanim go posadzisz. Nikogo nie trzeba przesadzać.
  > Oznacz osobę, która na pewno dopisze kogoś tydzień przed weselem 👇
  > Plan stołów w przeglądarce, za darmo dla par, bez zakładania konta - easywed.app
- **Hashtags:** `#wesele #ślub #planstołów #rozsadzeniegości #organizacjaślubu #ślub2027 #narzeczeni`
- **Claim-check:**
  - Seat from the list: `guests.assign.action` *„Posadź gościa”*, `guests.assign.title`
    *„Posadź: {{name}}”*, `SeatAssignSheet.tsx` ("Guest-first counterpart to
    `Canvas/SeatAssignPopover`").
  - Full tables are disabled: `disabled={count >= table.capacity}` in the table list.
  - You see who's already there: occupied seat cards render `getInitials(occupant.name)` and the
    name. Empty ones show the number and `seats.empty` *„Wolne miejsce”*.
  - "Reszta nawet nie drgnęła": the sheet only offers free seats, so it can't bump anyone
    (`displaced: false`, with the code comment beside it).
  - Button copy: `guests.assign.pick_seat` *„Wybierz miejsce”* → `seats.assign_at` *„Posadź na
    miejscu {{n}}”*.
  - Phone layout: `ResponsiveDialog` is a drawer below `md`. `MobileTabBar` `TABS` includes
    `guests`.
  - Free, no account (caption only): `terms.fees.c1`, `/wedding/local`, `landing.hero.try_local`.
  - Not claimed: RSVP. *„jednak przyjedzie”* is the couple's news, not something the app
    collected.

### 1:1 feed variant: `easywed-listseat-square`

Same scenes, same 480f, same copy. Rendered at 1080×1080.

**What `useFormat()` costs, honestly.** At v1 of the video repo, `format.ts` branches on one
boolean, `tall = height > width`. A square frame is `height === width`, so it silently falls into
the **wide** branch: `WIDE_HALL` (22×14 m), the 16:9 type scale (title 62, subtitle width 520), and
`pad`/`gap` sized for 1920 px. It won't crash, but it will look wrong: small type, and a wide hall
squeezed into a square. Doing it properly is:

1. **`format.ts`**: add `shape: "wide" | "tall" | "square"` (keep `tall` as a derived boolean so
   the ~140 existing `tall` reads across 34 `useFormat()` callers keep compiling), a square type
   scale (a first guess is title ~68, subtitle ~28 / width ~760, pad 40, gap 32, tuned by eye in the
   studio), and `hall: SQUARE_HALL` for `square`. **S**.
2. **`SQUARE_HALL` in `layouts.ts`**: a third hall plan, **58 seats** like the other two, about
   16×16 m (960×960 canvas at `PX_PER_M = 60`): head table 10 + six rounds of 8. It shows behind the
   sheet as the phone's canvas strip. **S–M**: it's a data file, but every table has to fit around
   the dance floor, and *Stół 5* has to sit where the sheet doesn't cover it.
3. **Layout audit of this film's own tree**: `PhoneShell`, `CaptionLine`, `CallToAction`,
   `SeriesTag`, the sheet. In a square, the phone can't fill the frame the way it does at 9:16, so
   the phone sits left of centre at ~62% of the frame height, with the hook and captions to its
   right instead of above it. That's a composition change in two scenes. **S–M**.
4. **Not in scope:** making the other 30-odd `useFormat()` callers square-aware. They keep the wide
   behaviour, which is what they do today, and no other film registers a square composition.

**Total: M, about a day,** and it can't start before the 9:16 cut is locked. Only the first
square film pays for it. Any later 1:1 reuses the branch and `SQUARE_HALL`.

- **Caption (IG feed, PL):** the Reel's caption, with the first line swapped for one that works in
  a still preview: *„Tomek jednak przyjedzie. Gdzie go posadzić?”*, then the same body, question
  and hashtags. A feed post shows the cover frame first, so the **cover frame** is frame 300
  (the seat grid with the dashed seat 6), not frame 0.

---

## Brief 2: `table-shape`

- **Compositions:** `easywed-tableshape-vertical` (1080×1920). Folder `src/easywed/table-shape/`.
- **Duration:** scenes `hook 96 + shape 150 + turn 150 + cta 108 = 504`, at
  `TABLE_SHAPE_TRANSITION = 8` × 3 seams → **480f (16.0 s)**. Scene starts: 0, 88, 230, 372.
- **Aspect ratio:** 9:16.
- **Single idea:** you can't agree on round or long tables, so you try both on the plan in
  seconds. The same eight guests stay at the table every time.
- **Hook, first 1.5 s (frames 0–45), verbatim:** *„Okrągłe stoły czy jeden długi?”*

| frames | on screen | on-screen copy |
| --- | --- | --- |
| 0–45 | Phone planner, canvas zoomed onto *Stół 3*: round, Ø 1.5 m, eight initialled seat markers. `SeriesTag`. Hook in Playfair. | *„Okrągłe stoły czy jeden długi?”* |
| 45–96 | The table is tapped. Its edit sheet rises over the bottom half, with the table still visible above. | *„Edytuj stół”* · caption *„Sprawdźmy oba.”* |
| 88–160 | *Kształt stołu*: *Prostokątny* is tapped. The table becomes a **1.5 × 1.5 m square** (the form keeps its width and depth), and the eight seats rearrange around it. | *„Kształt stołu”* · *„Prostokątny”* · *„Okrągły”* · caption *„Klik - i już kanciasty.”* |
| 160–238 | *Szerokość* is typed to 3, *Wysokość* to 1. The table stretches into a long table, four markers on each side, and the initials go with them. | *„Szerokość”* · *„Wysokość”* · values *„3”*, *„1”* · caption *„Trzy metry, osiem osób.”* |
| 230–300 | *Orientacja*: *Obróć o 90°*. The long table turns upright, along the wall. | *„Orientacja”* · *„Obróć o 90°”* · caption *„I wzdłuż ściany.”* |
| 300–380 | The sheet drops. The camera pulls back a little: the long table beside the round ones, every seat still initialled. Payoff in Playfair. | *„Ci sami goście, inny stół.”* |
| 372–480 | `CallToAction`. | *„Sprawdźcie oba warianty na planie”* + *easywed.app* pill |

- **CTA:** *„Sprawdźcie oba warianty na planie”* over the *easywed.app* pill.
- **App surface:** the table edit form (`EntityForms/TablePanelContent.tsx`) in the phone's
  `MobilePanelDrawer`, with the live canvas preview above it.
- **Reuses:** `PhoneShell`, `PlannerTable` (seat markers + initials, rendered from `TALL_HALL`'s
  *Stół 3*), `CaptionLine`, `CallToAction`, `SeriesTag`.
- **New:** a `TableEditSheet` redraw (name, shape buttons, *Szerokość*/*Wysokość* or *Średnica*,
  *Orientacja*, *Liczba miejsc*). A `PlannerTable` shape tween (round → square → 3×1 → rotated)
  that recomputes seat positions each step.
- **Success signal:** none for the change itself. Editing a table fires **no** event at v1 (there
  is no `table_updated` in `AnalyticsEvents`). The downstream signal is `table_added` (`shape`),
  from viewers who go on to add their own tables.
- **Caption (IG, PL):**
  > Okrągłe czy prostokątne? Ta kłótnia trwa w każdym domu 😄
  > Na planie zmieniasz kształt stołu jednym kliknięciem, ustawiasz długość i obracasz go wzdłuż ściany - a goście zostają przy nim.
  > Team okrągłe czy team prostokątne? Napiszcie w komentarzu 👇 i oznaczcie drugą połówkę, która ma inne zdanie.
  > Za darmo dla par, bez konta - easywed.app
- **Hashtags:** `#wesele #ślub #planstołów #salaweselna #dekoracjeślubne #organizacjaślubu #ślub2027`
- **Claim-check:**
  - Only round and rectangular are offered: `TableShapeField.tsx` (two buttons),
    `tables.shape.round` / `tables.shape.rectangular`. **Custom is not shown**
    (`tables.shape.custom_readonly`).
  - Round → rectangular keeps the size: `form.width`/`form.height` persist across the shape change,
    and a round table is stored `width = height = Ø` (`getSizeForShape`), so it becomes a square
    first. That's why the beat has the typed 3 × 1.
  - Rotation is only 90°: `tables.rotation.flip` *„Obróć o 90°”*, `TableRotation` `0 | 90`.
  - Guests stay: `applyToStore` passes `editedAssignedGuestIds.slice(0, capacity)`. Capacity is
    unchanged at 8, so all eight stay. On rotation, `updateTable` resets only seat **position
    overrides** (`seats: []`), not the guests.
  - Shape changes are saved on the spot (`updateAndCommit`). Dimensions preview live, then save.
  - Labels: `common.width` *„Szerokość”*, `common.height` *„Wysokość”*, `tables.edit`,
    `tables.shape`, `tables.rotation`.

---

## Brief 3: `ten-tables`

- **Compositions:** `easywed-batch-vertical` (1080×1920). Folder `src/easywed/ten-tables/`.
- **Duration:** scenes `hook 96 + batch 180 + room 180 + cta 108 = 564`, at
  `TEN_TABLES_TRANSITION = 8` × 3 seams → **540f (18.0 s)**. Scene starts: 0, 88, 260, 432.
- **Aspect ratio:** 9:16 (desktop `AppFrame` in the tall frame. The batch form's only entry point
  is the desktop right-click menu).
- **Single idea:** the venue tells you "ten round tables of eight", so you type 10 once, and then
  put the dance floor, the stage and the door where they really are.
- **Hook, first 1.5 s (frames 0–45), verbatim:** *„Sala mówi: dziesięć okrągłych po osiem.”*

| frames | on screen | on-screen copy |
| --- | --- | --- |
| 0–45 | An **empty** 14×16 m hall (`TALL_HALL`'s outline, no tables or fixtures), 1 m grid. `SeriesTag`. Hook in Playfair. | *„Sala mówi: dziesięć okrągłych po osiem.”* |
| 45–96 | Cursor right-clicks near the top-left (3 m, 1 m). The context menu opens. | *„Dodaj stół”* · *„Dodaj stoły”* · *„Dodaj element”* |
| 88–150 | *Dodaj stoły*. The centred dialog: *Kształt stołu* → *Okrągły*; *Średnica* retyped from 2 to 1.5. | *„Dodaj stoły”* · *„Okrągły”* · *„Średnica”* · value *„1.5”* · caption *„Okrągłe, półtora metra.”* |
| 150–210 | *Liczba miejsc* stays at 8. *Ile* goes from 2 to 10. The button reads *„Dodaj 10 stołów”*. | *„Liczba miejsc”* · *„Ile”* · *„Dodaj 10 stołów”* · caption *„Wpisujesz 10.”* |
| 210–268 | Click. The dialog closes, and ten round tables land in two rows of five, *Stół 1* to *Stół 10*, each reading `0 / 8`. | caption *„Stoją. Wszystkie dziesięć.”* |
| 260–330 | *Dodaj element* → the *Dodaj do sali* dialog, *Elementy sali* tab. *Parkiet* is picked, lands centred, and is dragged below the tables. | *„Dodaj do sali”* · *„Elementy sali”* · *„Parkiet”* |
| 330–390 | *Scena* (3 × 1.5 m) lands behind the dance floor. *Wejście* is dragged to the bottom wall. | *„Scena”* · *„Wejście”* · caption *„Parkiet, scena, drzwi.”* |
| 390–440 | The camera pulls back over the whole room. Payoff in Playfair. | *„Dziesięć stołów, osiemdziesiąt miejsc, parkiet przed sceną.”* |
| 432–540 | `CallToAction`. | *„Rozstaw wszystkie stoły naraz”* + *easywed.app* pill |

**The grid, worked out** (so the film matches `addTables` exactly): round Ø 1.5 m + `gap` 0.5 m →
tile 2 m. Start (3, 1) in a 14 m-wide hall → `availableW = 11` → `cols = floor(11 / 2) = 5`;
`rowsCap = floor(15 / 2) = 7`. So 10 tables land at x = 3, 5, 7, 9, 11 and y = 1, 3: **all 10
created**, and the right edge is at 12.5 m, inside the 14 m hall. The dance floor (3×3), the stage
and the entrance fit in the 11 m left below them. Pick different numbers and the silent cap would
deliver fewer tables than typed, so keep these.

- **CTA:** *„Rozstaw wszystkie stoły naraz”* over the *easywed.app* pill.
- **App surface:** the canvas context menu (`Canvas.tsx`), `EntityForms/TableBatchPanelContent.tsx`
  in `EntityEditDialog`, `Sidebar/AddEntityDialog` → `AddHubContent` (the fixtures tab).
- **Reuses:** `AppFrame`, `PlannerCanvas`, `HallCanvas`, `PlannerTable`, `Cursor`, `CaptionLine`,
  `CallToAction`, `SeriesTag`. `TALL_HALL`'s outline and dimensions.
- **New:** `ContextMenu` redraw (three rows with icons). `TableBatchDialog` redraw. An
  `AddHubDialog` redraw (the tabs and preset cards). An empty-hall variant of `TALL_HALL` that ends
  as a **new 80-seat room plan** (not 58: this film is about the venue's number, and it never shows
  a guest count, so the 58-seat rule for comparisons across cuts doesn't bite).
- **Overlap to be honest about:** `sunday-couch` (planned) and the walkthrough both show a room
  being laid out. What's new here is the **batch form**: typing *10* once instead of placing ten
  tables. The hall build has never been told through that form. The burned *„Naszkicuj salę”* is
  avoided.
- **Success signal:** `tables_batch_added` `{ shape: "round", requested: 10, created: 10 }`.
- **Caption (IG, PL):**
  > „Dziesięć okrągłych po osiem” - i co teraz, rysować każdy osobno? 🙃
  > Wpisujesz, ile stołów chcesz, i wszystkie stają na sali naraz. Potem parkiet, scena i wejście tam, gdzie są naprawdę - w metrach.
  > Ile stołów macie na swojej sali? Dajcie znać w komentarzu 👇
  > Za darmo dla par, bez konta - easywed.app
- **Hashtags:** `#wesele #ślub #planstołów #salaweselna #organizacjaślubu #narzeczeni #ślub2027`
- **Claim-check:**
  - Batch add: `tables.add_batch` *„Dodaj stoły”*, `tables.batch_count` *„Ile”*,
    `tables.add_many` *„Dodaj {{count}} stołów”* (`_many` = *stołów* for 10), `MAX_BATCH_COUNT = 50`.
  - Grid placement: `addTables` in `planner.store.ts` (row-major from the click point, 0.5 m gap,
    silently capped; see the working above).
  - Unnamed tables read *Stół N*: `tables.unnamed_index`. Batch names are empty by default.
  - Desktop only: the batch form is opened only by `panel.openTablesBatchAdd` from the canvas
    context menu (`Canvas.tsx:430`).
  - Fixtures: `fixtures.preset.dance_floor` *Parkiet* 3×3, `…stage` *Scena* 3×1.5, `…entrance`
    *Wejście* (`addPresets.ts`). They're inserted centred, then dragged (`hall.add_hub.hint`).
  - "Osiemdziesiąt miejsc" is 10 × 8 of what's on screen, not a readout the app shows.
  - Not claimed: the venue sending its floor plan. The hall is drawn by the couple.

---

## Brief 4: `try-now`

- **Compositions:** `easywed-trynow-vertical` (1080×1920). Folder `src/easywed/try-now/`.
- **Duration:** scenes `hook 96 + open 120 + first 150 + cta 108 = 474`, at
  `TRY_NOW_TRANSITION = 8` × 3 seams → **450f (15.0 s)**. Scene starts: 0, 88, 200, 342.
- **Aspect ratio:** 9:16.
- **Single idea:** you only wanted to look, so you tap once, the hall is already there, and your
  first table is in. There's no form in the way.
- **Hook, first 1.5 s (frames 0–45), verbatim:** *„Chcesz tylko zerknąć, jak to wygląda?”*

| frames | on screen | on-screen copy |
| --- | --- | --- |
| 0–45 | A phone browser with *easywed.app* in a neutral address bar (no browser branding). The landing hero is **cropped** to its eyebrow and button. `SeriesTag`. Hook in Playfair. | *„Chcesz tylko zerknąć, jak to wygląda?”* · app: *„Planer sali weselnej”* · *„Wypróbuj bez konta”* |
| 45–96 | A thumb taps the button. | caption *„Jeden klik.”* |
| 88–208 | The phone planner opens. An unnamed hall is already on the canvas, with the chip *„Sala · 20×12 m”*, the 1 m grid and the guest-mode banner at the top. | *„Sala · 20×12 m”* · caption *„Sala już stoi. 20 na 12 metrów.”* |
| 200–270 | The add button is tapped. The *Dodaj do sali* sheet opens on *Stoły*, with three preset cards. | *„Dodaj do sali”* · *„Stoły”* · *„Elementy sali”* · *„Okrągły 8”* · *„Prostokąt 6”* · *„Owalny 10”* |
| 270–320 | *Okrągły 8* is tapped. It lands in the middle of the hall, and a finger drags it into place, where it snaps. | caption *„Pierwszy stół. Na ośmioro.”* |
| 312–350 | Payoff in Playfair over the canvas. | *„Żadnego formularza. Od razu planujesz.”* |
| 342–450 | `CallToAction`. | *„Wejdź i rozejrzyj się po sali”* + *easywed.app* pill |

- **CTA:** *„Wejdź i rozejrzyj się po sali”* over the *easywed.app* pill. (The walkthrough's
  *„Ustaw pierwszy stół”* is burned, and so is anything close to it. *„Rozstaw pierwszy stół”* was
  rejected as too close.)
- **App surface:** the landing hero (cropped), `/wedding/local` and its seeded hall, the guest-mode
  banner, the phone add-hub drawer (`AddHubContent`).
- **Reuses:** `PhoneShell`, `HallCanvas` (an empty 20×12 hall), `PlannerTable`, `CaptionLine`,
  `CallToAction`, `SeriesTag`.
- **New:** a minimal `PhoneBrowser` chrome (address bar only). A landing-hero crop. An `AddHubSheet`
  redraw (tabs, preset cards with their swatches, `hall.add_hub.hint`).
- **Burned-line hazard:** the landing hero's title is `landing.hero.title` *„Każdy gość na
  właściwym miejscu”*, which is **burned**. The crop must leave it out: the eyebrow and the button
  only.
- **Overlap:** `sunday-couch` opens on the empty planner too, but as a story of the evening. Here
  the beat is the step from the landing page into a ready hall, which no film has shown.
- **Success signal:** `table_added` `{ shape: "round" }`. (`wedding_created` is `source:
  "wedding_list"`, a signed-in action, so it can't be this film's signal.)
- **Caption (IG, PL):**
  > Nie chcesz zakładać konta, żeby tylko popatrzeć? Nie musisz 🙌
  > Wchodzisz na easywed.app, klikasz „Wypróbuj bez konta” i sala już na Ciebie czeka. Plan zapisuje się w tej przeglądarce - konto możesz założyć później, jeśli zechcesz mieć go na kilku urządzeniach.
  > Wyślij to osobie, z którą w końcu macie usiąść do planu stołów 👇
  > Za darmo dla par - easywed.app
- **Hashtags:** `#wesele #ślub #planstołów #organizacjaślubu #narzeczeni #ślub2027 #pannamłoda`
- **Claim-check:**
  - No account: `/wedding/local` has no `requireAuth`, and `AuthGate`'s `PUBLIC_PATHS` lists it.
    `landing.hero.try_local` *„Wypróbuj bez konta”*.
  - A hall is ready: `wedding.local.tsx:83` `planner.addHall(DEFAULT_HALL, { x: 0, y: 0 })`.
    `DEFAULT_HALL` is unnamed, a 20×12 m rectangle, and its chip reads *„Sala · 20×12 m”*
    (`hall.unnamed`, `Canvas/HallView.tsx`).
  - Saved only in this browser (caption): `guest_mode.banner`, `landing.hero.local_hint`,
    `docs/guest-vs-account.md`.
  - Presets: `tables.preset.round_8` / `rect_6` / `oval_10`. *Owalny 10* is a rectangular table
    drawn as a pill in the picker only (`addPresets.ts`). No oval shape is claimed.
  - Free: `terms.fees.c1`.
  - **Verify at build:** the exact phone hero (which buttons render below `md`, and whether the
    guest-mode banner shows on a phone). Draw what the tag renders.

---

## Brief 5: `todo-list`

- **Compositions:** `easywed-todo-vertical` (1080×1920). Folder `src/easywed/todo-list/`.
- **Duration:** scenes `hook 96 + list 150 + add 120 + cta 108 = 474`, at
  `TODO_TRANSITION = 8` × 3 seams → **450f (15.0 s)**. Scene starts: 0, 88, 230, 342.
- **Aspect ratio:** 9:16.
- **Single idea:** "did we pay the DJ?" gets answered by a dated list next to the plan. Red means
  overdue, and you tick it when it's done.
- **Hook, first 1.5 s (frames 0–45), verbatim:** *„Zaliczka dla DJ-a… zapłaciliśmy czy nie?”*

| frames | on screen | on-screen copy |
| --- | --- | --- |
| 0–45 | The phone planner's tab bar, and a thumb on the last tab. `SeriesTag`. Hook in Playfair. | *„Zaliczka dla DJ-a… zapłaciliśmy czy nie?”* |
| 45–96 | The reminders tab opens on four items, each with a clock and a date. One is red. | *„Zaliczka dla DJ-a”* · *„20 wrz 2026, 18:00”* (red) · *„Wysłać sali plan stołów”* · *„Przymiarka garnituru”* · *„Odebrać obrączki”* with their dates |
| 88–170 | The red row is close up. | caption *„Jest. Na czerwono, bo po terminie.”* |
| 170–238 | The ✓ is tapped. The line is struck through and the date turns grey. | caption *„Zapłacone. Odhaczone.”* |
| 230–300 | *Dodaj przypomnienie* opens the *Nowe przypomnienie* popover, **already filled in**: text *„Dopytać o menu dla dzieci”* and a date and time. The empty-field placeholders are never on screen (see the claim-check). | *„Nowe przypomnienie”* · typed *„Dopytać o menu dla dzieci”* · *„15 paź 2026, 12:00”* · *„Dodaj przypomnienie”* |
| 300–350 | Added. The list now has five rows. Payoff in Playfair. | *„Co załatwione, a co jeszcze nie - w jednym miejscu.”* |
| 342–450 | `CallToAction`. | *„Wpiszcie, co jeszcze do załatwienia”* + *easywed.app* pill |

- **CTA:** *„Wpiszcie, co jeszcze do załatwienia”* over the *easywed.app* pill.
- **App surface:** the *Przypomnienia* tab (`components/reminders/`: `ReminderList`,
  `ReminderPreview`, `CreateReminderPopover`) on the phone.
- **Reuses:** `PhoneShell`, `CaptionLine`, `CallToAction`, `SeriesTag`.
- **New:** a `RemindersPanel` redraw (`bg-muted` rows, the clock icon, the date as `d MMM yyyy,
  HH:mm` in the `pl` locale, `text-destructive` when overdue, `line-through` when done). A popover
  redraw.
- **⚠️ Risk, and why this ships last:** the product's own copy leans towards notifications it
  doesn't send. The tab is *„Przypomnienia”*, and the empty fields read *„O czym mamy Wam
  przypomnieć?”* (`reminders.create.content_placeholder`) and *„Kiedy Wam przypomnieć?”*
  (`reminders.create.date_prompt`). Nothing notifies: no push, no email, no calendar
  (`SKILL.md` §4). So the film **never shows the two placeholders** (the popover appears already
  filled). The on-screen lines talk about a **list** (*lista*, *odhaczone*, *w jednym miejscu*) and
  never *przypomni*. The caption says outright that nothing is sent. The tab title can't be avoided,
  since it's chrome. If you think the tab name alone implies an alert, drop this brief. It is also
  the one furthest from the seating-plan objective.
- **Success signal:** `reminder_created` `{ has_due_date: true }`.
- **Caption (IG, PL):**
  > Zaliczka dla DJ-a, przymiarka, obrączki… a gdzie to wszystko zapisaliście? 📝
  > W easywed obok planu stołów macie listę spraw z datami - po terminie robi się czerwona, a zrobione odhaczacie. Uwaga: to lista, nie budzik - easywed nie wysyła powiadomień, zaglądacie do niej sami.
  > Oznacz osobę, która pamięta o wszystkich zaliczkach (każda para ma jedną taką 😉) 👇
  > Za darmo dla par, bez konta - easywed.app
- **Hashtags:** `#wesele #ślub #organizacjaślubu #listaślubna #ślub2027 #narzeczeni`
- **Claim-check:**
  - Dated list: `CreateReminderPopover` (`DatePicker withTime`), `ReminderPreview` (`format(due,
    "d MMM yyyy, HH:mm", { locale: pl })`).
  - Red when overdue: `isOverdue` → `text-destructive`.
  - Ticked = struck through: `completeReminder` sets `status: "completed"`, rendered `line-through`.
    `reminders.complete` *„Oznacz jako zrobione”*.
  - On a phone: `MobileTabBar` `TABS` ends with `reminders`.
  - Works in guest mode: `docs/guest-vs-account.md` (reminders ✅ for guest).
  - **Not claimed:** any notification. See the risk note. `#listaślubna` means a checklist here, not
    a gift registry (which is also on the do-not-claim list), and the caption doesn't mention gifts.
    If that hashtag reads as "registry" to you, swap it for `#checklistaślubna`.
  - **Verify at build:** `date-fns` `pl` month abbreviations (*wrz*, *paź*), and that the film's
    "today" falls after 20 Sep 2026 so the red row is honestly overdue.

---

## Do not claim (carried verbatim from `SKILL.md` §4)

- ❌ **Live sync.** There is no Realtime. Collaborators see changes on reload.
  `landing.features.collab.desc` says *"zmiany synchronizują się od razu"* — the landing page
  over-claims this. Do not amplify it.
- ❌ **Plus-ones / "osoby towarzyszące".** No such field on the guest model.
  `landing.features.guests.desc` over-claims this too.
- ❌ RSVP, sending invitations, collecting guest replies.
- ❌ Offline or installable. A manifest exists; there is no service worker.
- ❌ Venue templates, or "import the venue's floor plan". That is manual founder work — a third
  landing over-claim, in `landing.steps.one.desc` (*"lub zaimportuj jej plan"*).
- ❌ A generated PDF *file*. Export opens the browser print dialog (`plan_printed` says as much).
- ❌ Free or included AI. It needs the user's own API key.
- ❌ Reminders that notify. No push, no email, no calendar. It is a dated to-do list.
- ❌ A mobile app. Budget, vendors, timeline, registry, place cards, an auto-seat button. Undo/redo.
- ❌ **Any social proof.** No counts, logos, reviews or testimonials exist, so none may be shown,
  implied, or mocked up.
- ⚠️ Free use covers planning **your own** reception. Planners and venues working commercially need
  the paid plan (`terms.technical.c6`) — so "for wedding planners" framing is off-limits.

Specific to this plan: the phone in four of these Reels is **the website in a phone browser**, not
an app. `try-now` shows the address bar to make that visible. *„jednak przyjedzie”* in `list-seat`
is news the couple got themselves, not an RSVP the app collected. `todo-list` never shows or says
*przypomni*. No series tag, caption or cover may show a view count, a follower count or "X par już
planuje".

## Build order

1. **Shared: `SeriesTag` + `PhoneShell`** (S). `PhoneShell` is the phone planner frame: status
   area, canvas, `MobileTabBar` (*Goście / Stoły / Elementy sali / Przypomnienia*), a bottom-sheet
   slot. If `mama-link` is built first, take its `PhoneViewer` and add the edit affordances instead.
2. **`list-seat` 9:16** (M). The phone guest list, the `SeatAssignSheet` redraw, and the new
   58-guest roster (the *Lis*, *Nowiccy*, *Wrona* families + fillers).
3. **`list-seat` 1:1** (M, about a day). The `useFormat()` third branch, `SQUARE_HALL` (58 seats),
   and the square composition of this film's own scenes. Only after step 2 is locked.
4. **`table-shape`** (S–M). The `TableEditSheet` and the `PlannerTable` shape tween.
5. **`ten-tables`** (M). The context menu, the batch dialog, the add-hub dialog, and the 80-seat room.
6. **`try-now`** (M). `PhoneBrowser`, the hero crop (no burned title), and the add-hub **sheet**
   (reuses step 5's cards).
7. **`todo-list`** (S), only if you're happy with the risk note.
8. After each one ships, update `references/existing-films.md` with its beats and lines.
   `/video-build` does this.

Each is `/video-build <id>` against this file. `pnpm run lint` must pass.

## Open questions for you

1. **Posting cadence.** Five Reels plus a feed post: one a week (five weeks, series number = week),
   or two a week to fill the grid quickly? I'd go with two a week for the first two weeks
   (`list-seat` → `table-shape` → `ten-tables` → `try-now`), and the 1:1 feed post a few days after
   `list-seat`, so it lands on followers who already saw the Reel.
2. **Trending audio.** The renders stay silent (there's no audio in the project). Will you add
   trending audio in Instagram when you post? If so, I'd keep the timing as it is. The captions
   already carry every meaning, so the sound is decoration. If not, is sound-off on its own fine
   for Reels reach?
3. **A carousel companion post.** Worth planning? A natural fit is a 5-slide carousel of the
   series' payoff lines over stills (one per episode, with the series tag), posted after episode 5
   as a "zapisz na później" post. It would need the same 1:1 branch, so it's cheap once step 3
   exists. Plan it, or skip it?
4. **Series name:** A *„Wesele bez spiny”*, B *„Jak to ogarnąć?”* or C *„Jak to zrobić w
   easywed?”*?
5. **`todo-list`:** ship with the risk note (no placeholders shown, a "not an alarm" caption), or
   drop it for a four-episode run?
6. **Budget:** organic only, or will any of these be boosted? A boosted `try-now` should probably
   keep the guest-mode banner readable on screen, not only in the caption.
7. **`ten-tables` on desktop** inside an otherwise phone-first series: fine, or would you rather
   have a phone-only series and drop the batch beat? (The phone has no batch form at v1.)
