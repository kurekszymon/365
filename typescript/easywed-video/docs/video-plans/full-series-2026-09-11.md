# easywed video plan — full series · 2026-09-11 · `easywed/v1`

Produced by `/video-plan` (`365/.claude/skills/video-plan/`), against the product as it exists at
the `easywed/v1` tag and the Remotion project in this repo. Briefs only — nothing here is built yet.

One plan among several in this directory: a later run authors a new dated file rather than revising
this one, so this document stays the record of what was decided on the date above.

## Strategy

**Who:** a Polish couple who already has a date, a hall and a guest list in a spreadsheet, and is now
stuck on who sits where. **Where:** Reels and TikTok for reach, the landing page itself for the
people the ads and posts send there, feed posts for the slower channels, YouTube for the ones who
want to see the whole thing before they touch it. **What action:** open easywed.app and build a
seating plan in guest mode, in this session, with no account. **Why now:** guest mode is the entire
funnel — `/wedding/local` auto-seeds a hall and there is nothing to sign up for — so the distance
between "saw the video" and "has a plan" is one tap. Every video below ends at that tap, and none of
them asks for an email.

The two existing films sell the product in the abstract ("here is a planner"). This series sells five
concrete moments of relief instead, each one a thing the couple is dreading this week.

## Priority

| # | id | hook (the pain) | format | length | channel | effort | ship |
|---|---|---|---|---|---|---|---|
| 1 | `import-excel` | the guest list is already in Excel | 9:16 | 600f / 20s | Reels, TikTok | M | **first** |
| 2 | `kitchen-report` | the venue is asking how many vegan meals | 9:16 | 450f / 15s | Reels, TikTok | M | second |
| 3 | `to-scale` | will these tables even fit | 16:9 loop | 360f / 12s | landing page | S | third |
| 4 | `no-account` | no email, no password, no account | 1:1 | 300f / 10s | FB/IG feed | **L** (see cost) | fourth |
| 5 | `walkthrough-long` | the whole thing, start to print | 16:9 | 2250f / 75s | YouTube | L | last |

Effort is Remotion work, not shoot time — nothing here is filmed.

---

## 1. `import-excel` — "the list is already in Excel"

- **Compositions:** `easywed-import` (16:9), `easywed-import-vertical` (9:16, the cut it is made
  for). Scenes registered individually in a Studio folder "Import", at 9:16.
- **Duration:** 600f = 20s @ 30fps. Scenes 90 + 150 + 180 + 204 = 624; `TRANSITION = 8` across 3
  seams → 624 − 24 = **600**.
- **Aspect:** 9:16 primary, 16:9 free via `useFormat()`.
- **The idea:** the spreadsheet you already maintain becomes a seated hall without being retyped.
- **Hook (0–45f, verbatim):** *„Twoja lista gości mieszka w Excelu.”*

| frames | on screen | copy |
|---|---|---|
| 0–90 | `ImportHook` — a cold spreadsheet grid of Polish surnames, diacritics visible, scrolling slowly past the bottom of the frame; a file chip `goscie.xlsx` | *„Twoja lista gości mieszka w Excelu.”* |
| 82–232 | `ImportDrop` — `AppFrame` + `PlannerCanvas`, the import dialog open, the chip dragged into the drop zone | *„Przeciągnij plik tutaj”* (the app's own `guests.import.drop_here`) |
| 224–404 | `ImportMap` — the column-mapping wizard: four field rows, each snapping to a spreadsheet column; `Ł`, `ż`, `ś` land intact | *„Dopasuj każde pole do kolumny z Twojego pliku.”* (app's own `guests.import.map_columns`) · *„Do zaimportowania: 58 gości”* |
| 396–600 | `ImportLanded` — the wizard closes, `HallCanvas` fills as named tables take their guests, progress card ticking to 58/58 | *„Rozsadzeni 58/58”* · then the CTA card: *„easywed.app”* / *„bez zakładania konta”* |

- **CTA:** easywed.app + *„bez zakładania konta”*.
- **App surface:** the guest-import dialog and the planner canvas (guest mode — import works without
  an account).
- **Reuses:** `AppFrame`, `PlannerCanvas`, `HallCanvas`, `PlannerTable`, `Backdrop`, `Cursor`,
  `SceneLabel`, `BrandMark`, `Wordmark`, `GUESTS`/`WEDDING` from `data.ts`, `TALL_HALL`/`WIDE_HALL`.
- **Genuinely new:** `ImportDialog.tsx` (drop zone + mapping rows, a redraw of the real wizard) and
  `Spreadsheet.tsx` (the cold grid in the hook). `teaser/components/Scraps.tsx` is the closest
  precedent for the paper feel but not reusable as-is.
- **Caption (Reels/TikTok):** *Lista gości w Excelu? Wczytaj plik, dopasuj kolumny, gotowe — plan
  sali bez przepisywania ani jednego nazwiska. easywed.app, bez zakładania konta.*
  `#planwesela #rozsadzeniegosci #weselektorewybieram #slub2026 #listagosci #weddingplanning`
- **Claim check:**
  - CSV **and** XLSX, with a mapping wizard → `guests_imported { format: "csv" | "xlsx" }` in
    `track.ts`; changelog `i3`; `guests.import.map_columns` / `guests.import.col.*` in `pl.json`.
  - Polish diacritics survive → import parses in-browser, `guests.import.*` copy is Polish; demo
    names in `data.ts` already carry `ą ś ż`.
  - Table names joined to existing tables → changelog `i3` („połączy nazwy stołów z tymi, które już
    masz”); `guests_imported.seated` and `.overflowed` exist as properties.
  - Works with no account → `docs/guest-vs-account.md`, feature matrix row "Guest list, CSV/XLSX
    import & export" ✅ guest.
  - 58/58 is the repo's own `totalSeats` in both halls (`layouts.ts`), not a claim about users.

---

## 2. `kitchen-report` — "how many vegan meals?"

- **Compositions:** `easywed-report`, `easywed-report-vertical`.
- **Duration:** 450f = 15s. Scenes 84 + 120 + 150 + 120 = 474; `TRANSITION = 8` × 3 → **450**.
- **Aspect:** 9:16 primary, 16:9 free.
- **The idea:** the diets you typed next to each name come back out as a sheet the kitchen can cook
  from.
- **Hook (0–45f, verbatim):** *„Kuchnia pyta, ile dań wege.”*

| frames | on screen | copy |
|---|---|---|
| 0–84 | `ReportHook` — a phone-message shape on the `Backdrop`, no app chrome yet | *„Kuchnia pyta, ile dań wege.”* |
| 76–196 | `ReportTags` — the guest panel, diet chips lighting up row by row on real names | *„Wege”* · *„Vegan”* · *„Bez glutenu”* (the app's own `guests.dietary.*`) |
| 188–338 | `ReportSheet` — the print view assembling: hall plan on top, table-by-table list under it, diets printed beside the surnames, headcount in the corner | *„Plan rozsadzenia”* · *„Stół 1 · 8 miejsc”* |
| 330–450 | `ReportCta` — the sheet settles, mark + wordmark | *„Wydrukuj i oddaj dalej.”* · *„easywed.app”* |

- **CTA:** easywed.app + *„bez zakładania konta”*.
- **App surface:** the guest panel's diet tags and the export/print dialog.
- **Reuses:** `AppFrame`, `HallCanvas`, `PlannerTable`, `Backdrop`, `BrandMark`, `Wordmark`, `Icon`,
  `SceneLabel`, `data.ts` (three of the nine demo guests already carry diets).
- **Genuinely new:** `PrintSheet.tsx` — a paper-white report page with the plan and the grouped
  guest list. This is the one component with no precedent in the repo; budget most of the effort
  here.
- **Caption:** *Diety przy nazwiskach, a potem jeden wydruk dla sali i kuchni — z planem stołów i
  listą gość po gościu. easywed.app*
  `#planwesela #weselnestoly #catering #slub2026 #rozsadzeniegosci`
- **Claim check:**
  - Printable report with diets and headcount → `plan_printed { trigger, include_seats }`;
    changelog `i6`; `export.pdf.*` and `export.col.dietary` in `pl.json`.
  - The three diet tags shown are exactly `guests.dietary.vegetarian|vegan|gluten-free`.
  - **Careful:** the video shows the *print dialog*, and says *„Wydrukuj”*, never "download a PDF".
    Export opens the browser print sheet — `plan_printed`'s own comment says "(which is also how PDF
    export works)".
  - Works with no account → matrix row "Print / PDF export" ✅ guest.

---

## 3. `to-scale` — "will they even fit?" (landing loop)

- **Compositions:** `easywed-scale` (16:9 only for now; a 9:16 twin is free but not needed on the
  page).
- **Duration:** 360f = 12s. Scenes 120 + 150 + 120 = 390; `TRANSITION = 15` × 2 → **360**.
- **Aspect:** 16:9. **No CTA card** — this sits under the hero on the landing page, and the page is
  the CTA. It must also loop: frame 359 has to hand back to frame 0, so the hall ends where it
  started.
- **The idea:** the plan is in real metres, so it tells you the truth before the day.
- **Hook (0–45f, verbatim):** *„Zmieszczą się te stoły?”*

| frames | on screen | copy |
|---|---|---|
| 0–120 | `ScaleGrid` — `WIDE_HALL` on the 1 m grid with its firmer 5 m ruling, dimension labels outside the walls | *„Zmieszczą się te stoły?”* · *„22 × 14 m”* |
| 105–255 | `ScaleMeasure` — the measuring tool drawn from a table edge to the dance floor, the distance label following the cursor; snap stepper visible top-right | *„Miejsca”* · the distance chip, e.g. *„1,2 m”* — **computed from `WIDE_HALL` coordinates at build time, not typed** |
| 240–360 | `ScaleSnap` — a table dragged into the gap, snapping onto the grid, its occupancy chip settling; the room returns to its opening state | *„Sala główna · 22 × 14 m”* |

- **CTA:** none. The last beat holds the planner, and the page's own *„Wypróbuj bez konta”* sits
  under it.
- **App surface:** the planner canvas — measure tool, snap stepper, grid, dimension labels.
- **Reuses:** `PlannerCanvas`, `HallCanvas`, `PlannerTable`, `Cursor`, `WIDE_HALL`, `PX_PER_M`.
  Almost all of it exists; this is why it is the cheapest video in the series.
- **Genuinely new:** `MeasureOverlay.tsx` — the measure line plus its distance chip. Small.
- **Caption:** n/a (silent page loop, no caption surface).
- **Claim check:**
  - To-scale metric plan → `PX_PER_M = 60` in `layouts.ts`; `WIDE_HALL.meters` derived, not typed by
    hand; `measure.*`, `canvas.snap.*`, `canvas.grid.spacing` in `pl.json`.
  - Distances shown must be computed from `layouts.ts` coordinates, not written by hand — the
    landscape hall's own comment states the half-metre clearances, so the number on screen can be
    real.
  - No claim is made about what the venue's own dimensions are; the couple types those.

---

## 4. `no-account` — "no email, no password" (1:1 feed)

> ⚠️ **This video carries the `useFormat()` cost.** `src/easywed/format.ts` branches on a binary
> `tall = height > width` and returns `TALL_HALL` or `WIDE_HALL`. A 1080×1080 composition is neither:
> it would fall to the landscape branch and render a 22 × 14 m room letterboxed into a square. Doing
> this properly means a third branch (`square`), a third type scale, and a **third hall plan** —
> `SQUARE_HALL`, which must also come to 58 seats so counts stay consistent across cuts, and which
> every scene's stacked-vs-beside layout then has to be re-checked against. That is the L in the
> priority table, and it is why this is fourth despite being the shortest film.

- **Compositions:** `easywed-start-square` (1080×1080), plus `easywed-start-vertical` for free once
  the branch exists.
- **Duration:** 300f = 10s. Scenes 96 + 120 + 100 = 316; `TRANSITION = 8` × 2 → **300**.
- **The idea:** you are in the planner before you would have finished a sign-up form.
- **Hook (0–45f, verbatim):** *„Bez maila. Bez hasła.”*

| frames | on screen | copy |
|---|---|---|
| 0–96 | `StartHook` — an empty sign-up form dissolving away field by field | *„Bez maila. Bez hasła.”* |
| 88–208 | `StartLanding` — the landing hero, the cursor going straight for the secondary button | *„Wypróbuj bez konta”* (the app's own `landing.hero.try_local`) |
| 200–300 | `StartHall` — `/wedding/local`: the planner opens on a hall that is already there, head table labelled; mark + wordmark settle | *„Sala już czeka.”* · *„easywed.app”* |

- **CTA:** easywed.app, with *„bez zakładania konta”* as the closing line.
- **App surface:** the landing hero and the first frame of `/wedding/local`.
- **Reuses:** `Backdrop`, `BrandMark`, `Wordmark`, `AppFrame`, `HallCanvas`, `Cursor`.
- **Genuinely new:** `SQUARE_HALL` in `layouts.ts`, the `square` branch in `format.ts`, a
  `SignupForm.tsx` throwaway for the hook, and a small `LandingHero.tsx` redraw.
- **Caption:** *Wchodzisz i planujesz. Bez rejestracji, bez maila — plan sali zapisuje się na Twoim
  urządzeniu, a konto założysz później, jeśli zechcesz. easywed.app*
  `#planwesela #slub2026 #weselnestoly #planersali`
- **Claim check:**
  - Full planner with no account → `/wedding/local` has no `requireAuth` (`docs/guest-vs-account.md`,
    "Routing and guards"); `PUBLIC_PATHS` includes it.
  - A hall is already there → the same doc's entry-point row; guest default name is
    `wedding.default_local_name`.
  - Free → `terms.fees.c1` (nieodpłatne dla Konsumentów), and `landing.hero.local_hint`.
  - "later, if you want" → `local_wedding_migrated` exists as an event; the caption must not imply
    the plan syncs anywhere before that.
  - **Not claimed:** cross-device access. The plan lives in `localStorage` on that browser
    (`guest_mode.banner` says so), so the caption says *„na Twoim urządzeniu”*.

---

## 5. `walkthrough-long` — the 75-second tour (YouTube)

Seeded from the existing 840f film rather than built new: its five scenes stay, five new ones are
inserted before the outro.

- **Composition:** `easywed-walkthrough` (16:9). A vertical twin is not worth rendering at this
  length.
- **Duration:** 2250f = 75s. Scenes `intro 120 + hall 210 + guests 180 + seating 240` (existing) `+
  import 330 + print 300 + floors 255 + collab 300 + ai 300 + outro 150` (outro existing) = 2385;
  `TRANSITION = 15` across 9 seams → 2385 − 135 = **2250**.
- **The idea:** an empty room becomes a printed plan, in one take, with nothing signed up for.
- **Hook (0–45f, verbatim):** *„Od pustej sali do wydruku.”* (replaces the intro's current copy; the
  logo build itself is reused unchanged.)

| frames | scene | what it adds |
|---|---|---|
| 0–120 | `Intro` (reused) | logo build, new hook line |
| 105–315 | `Hall` (reused) | sketch the room |
| 300–480 | `Guests` (reused) | the guest list — **the plus-one line in `GuestsScene.tsx` must be replaced, see Findings** |
| 465–705 | `Seating` (reused) | seating the room |
| 690–1020 | `ImportLong` (new) | the mapping wizard, at a pace you can read — reuses `ImportDialog` from video 1 |
| 1005–1305 | `PrintLong` (new) | the printable report — reuses `PrintSheet` from video 2 |
| 1290–1545 | `Floors` (new) | a second hall on another floor; the floor chip switching. Copy: *„Piętro”* / *„p. 1”* |
| 1530–1830 | `Collab` (new) | one invite link, three roles. Copy: *„Właściciel · Edytujący · Przeglądający”*, plus the honest caveat on screen: *„Zaproszenia wymagają konta.”* **No sync claim.** |
| 1815–2115 | `Assistant` (new) | the AI panel adding two tables. Copy must carry *„własny klucz API”* |
| 2100–2250 | `Outro` (reused) | headline + CTA |

- **CTA:** the existing outro, unchanged.
- **App surface:** effectively all of it — planner, guest panel, import, export, hall list, members
  dialog, assistant.
- **Reuses:** every existing scene and component, plus the two new components from videos 1 and 2 —
  which is the argument for shipping this last.
- **Genuinely new:** `FloorSwitcher.tsx`, `MembersPanel.tsx`, `AssistantPanel.tsx`.
- **Caption (YouTube description):** *easywed. to planer rozsadzenia gości weselnych w przeglądarce.
  W 75 sekundach: rysujesz salę w jej wymiarach, wczytujesz listę gości z CSV lub Excela, sadzasz
  wszystkich i drukujesz plan dla sali i kuchni. Tryb gościa działa bez zakładania konta i jest
  bezpłatny dla par. easywed.app*
- **Claim check:**
  - Multi-hall and multi-floor → `hall.floor`, `hall.floor_short`, `hall.add`, `hall.list_title` in
    `pl.json`; the assistant's `add_hall`/`update_hall` tools.
  - Invite links with roles → `members.role.owner|editor|viewer`, `members.create_invite`,
    `invite_claimed` event.
  - **The collab caveat is mandatory.** `canInvite = Boolean(session) && !isLocalWedding(...)` —
    inviting is account-gated (`docs/guest-vs-account.md`, "The members gate"). And there is **no
    Realtime**: collaborators see changes on reload. The scene shows a link being copied and a role
    being set, never two cursors moving at once.
  - AI → `ai_chat_message_sent`; `assistant.api_key_hint`, `assistant.setup.llamacpp_*`. It needs
    the viewer's own key, and the scene says so.
  - Free for couples → `terms.fees.c1`. The description does **not** say "free for wedding
    planners" — `terms.technical.c6` puts commercial use on the venue plan.

---

## Build order

| step | work | effort | unblocks |
|---|---|---|---|
| 1 | `ImportDialog.tsx` + `Spreadsheet.tsx`, then ship `import-excel` | M — the mapping rows are the fiddly part | video 1, and `ImportLong` in video 5 |
| 2 | `PrintSheet.tsx`, then ship `kitchen-report` | M — no precedent in the repo for paper | video 2, and `PrintLong` in video 5 |
| 3 | `MeasureOverlay.tsx`, then ship `to-scale` | S — everything else already exists | video 3 |
| 4 | `square` branch in `format.ts` + `SQUARE_HALL` (58 seats) + re-check every scene's layout, then ship `no-account` | **L** — touches the one file all scenes depend on | video 4, and every future 1:1 |
| 5 | `FloorSwitcher` / `MembersPanel` / `AssistantPanel`, then assemble `walkthrough-long` | L, but mostly assembly by then | video 5 |

Do step 4 on its own branch: `format.ts` is the single seam every scene reads, so a regression there
breaks both existing films at once. `npm run lint` (eslint + tsc) after each step, and
`npx remotion still <id> out/frame.png --frame=N` on the seams before rendering anything full.

## Findings to fix in the existing films

1. **`src/easywed/scenes/GuestsScene.tsx:173`** carries the landing page's plus-one line:
   *"Diety, osoby towarzyszące i przypisane miejsca są zawsze przy nazwisku…"*. There is no
   plus-one field on the guest model at v1, so this is an on-screen over-claim in a film that is
   already published. Suggested replacement, same shape, all of it true: *„Diety, przedziały wieku i
   przypisane miejsca są zawsze przy nazwisku - koniec z trzema arkuszami naraz.”*
2. The landing page itself over-claims three things — live sync
   (`landing.features.collab.desc`), plus-ones (`landing.features.guests.desc`) and importing the
   venue's floor plan (`landing.steps.one.desc`). Out of scope for this plan, but no video may
   amplify them, and the copy sitting in `pl.json` is not a safe source of video lines.

## Open questions

1. **Channel priority.** Is this Reels-first, TikTok-first, or paid-first? It changes whether the
   hooks should be written for sound-off autoplay in a feed (they are now) or for a thumbnail.
2. **Budget for distribution.** All five are organic-shaped. If there is ad spend, video 4 should
   probably become a 6-second bumper instead, and the 1:1 work reprioritised above video 3.
3. **Cadence.** One a week for five weeks, or all five before the first post? The build order assumes
   ship-as-you-go.
4. **Is the plus-one line in `GuestsScene.tsx` fixed and re-rendered before any new video ships?**
   The published walkthrough currently contradicts the constraint every new video is being held to.
5. **Is 1:1 worth the `format.ts` cost at all**, or should feed posts just use the 9:16 cut cropped
   by the platform? The honest answer may be "skip video 4 for now" — it is the only item in this
   plan whose cost is structural rather than creative.
