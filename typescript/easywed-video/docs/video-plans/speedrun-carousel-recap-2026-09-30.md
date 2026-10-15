> **Scope:** follow-up to `instagram-reels-series-2026-09-26.md`: a redone #4 (`try-now` as a speedrun), a #1–#5 carousel, a standalone #6 recap Reel · **Date:** 2026-09-30 · **Written against:** `easywed/v1.1.2`

# „Wesele bez spiny”: finishing the series

## Strategy

The audience hasn't changed: Polish engaged couples who have a date, a venue and a list, and have
never heard of easywed. Episodes #1, #2, #3 and #5 are built. The first #4 (`try-now`) was the
only episode with no situation behind it. It asked a passive question (*„chcesz tylko
zerknąć?”*) and paid off on an empty hall with one table in it. This run fixes #4 by giving it a
challenge: a **stopwatch race from the landing page to the first seated guest**. That way the "no
account" point gets proven on screen instead of just stated. The run then closes the series with
two posts. A **carousel** of #1–#5 is the save-it-for-later post, and a **#6 recap Reel** is a new
film with its own hook, one that sells the whole series as one idea: *the plan changes, you don't
start over*. Everything here works signed out, so every caption can honestly say *bez konta*.

## Prioritised table

| ship | id | hook (first 1.5 s) | format | length | channel | effort |
| :---: | --- | --- | --- | --- | --- | --- |
| 1 | `try-now` (redo, #4) | *„Macie 60 sekund?”* | 9:16 | 765f / 25.5 s | Reels (also TikTok) | **M**. Most of it is in `stash@{0}` (see below). New: `RunClock`, the guest-add sheet, the table form's guest picker |
| 2 | `carousel` (#1–#5) | cover slide: *„Wesele bez spiny”* | **4:5** stills (1080×1350), 7 slides | n/a | IG feed carousel | **S–M**. PNG stills from the 9:16 renders plus one slide layout. **No `useFormat()` third branch needed**, see its section |
| 3 | `recap` (#6) | *„Myślicie, że plan stołów robi się raz?”* | 9:16 | 630f / 21.0 s | Reels | **S–M**. Built from the five built stages. New: a `bare` mode on each stage, a tally chip |

**`try-now` ships first.** The carousel's slide 5 and the recap's #4 clip both need its render.

**Out of scope this run, at your call:** 16:9 landing loops (all three `LoopName` slots stay as
they are: `swap`, `scale`, `shape`), the YouTube walkthrough, and a 1:1 cut of any of these. The
square `useFormat()` branch is still unbuilt. Nothing here needs it, so it stays priced where the
2026-09-26 plan put it (build-order step 3, about a day).

### Shared across the three

- **`SeriesTag`**: *„Wesele bez spiny · #4”* on the speedrun and *„· #6”* on the recap. In the
  carousel it's the episode's own number on each slide. The tag string stays as coded
  (`i18n.ts:650`). See open question 1 on "luźne wesele".
- **Four-scene shape** for both Reels, `…_TRANSITION = 8`, so the arithmetic is
  `Σ scenes − 8 × 3`. The payoff lands in Playfair at the end of the last app scene.
- **Names.** New for this run: *Babcia Jadzia* (a name the couple types, so it's user data). Every
  other name here comes from films that are already built, and appears only inside their own clips
  or stills.

---

## Brief 1: `try-now` (redo): the speedrun

- **Composition:** `easywed-trynow-vertical` (1080×1920). Folder `src/easywed/try-now/`. It keeps
  the id and replaces the first brief.
- **Starting point:** `stash@{0}` (*WIP on main: 3cedc40*) holds the first build:
  `LandingScreen`, `TryNowPhone`, `SeededCanvas`, `AddHubSheet`, `OnboardingCard`, `script.ts`, and
  edits to `PhoneShell`, `layouts.ts`, `i18n.ts` and `table-shape/`. Pop it on a branch, keep the
  components, and replace `script.ts`, `timeline.ts` and the copy. The stash also touches
  `table-shape/components/TableEditSheet.tsx` and `shape.ts`. Diff those against the shipped
  table-shape cut before keeping them.
- **Duration:** scenes `hook 96 + table 225 + seat 360 + cta 108 = 789`, at
  `TRY_NOW_TRANSITION = 8` × 3 seams → **765f (25.5 s)**. Scene starts: 0, 88, 305, 657.
  It's longer than the other episodes on purpose. The clock only means something if it runs at
  film speed with **no jump cuts inside the run** (frames 50–614), and a name typed at a believable
  thumb pace (about 8f per character) takes 3.5 s.
- **Aspect ratio:** 9:16.
- **Single idea:** a stopwatch runs from the landing page to the first guest sitting at a table,
  and the minute isn't even half gone.
- **Hook, first 1.5 s (frames 0–45), verbatim:** *„Macie 60 sekund?”*

| frames | on screen | on-screen copy |
| --- | --- | --- |
| 0–45 | A phone browser. A neutral address bar reading *easywed.app*, and the landing hero at v1.1.2 in full: eyebrow, title, the button. `SeriesTag` top-left. **`RunClock`** top-right reads *0:00*. Hook in Playfair. | *„Macie 60 sekund?”* · app: *„Planer gości weselnych i plan sali”*, *„Narysujcie salę i rozsadźcie gości weselnych przy stołach”*, *„Wypróbujcie bez konta”* |
| 45–100 | The thumb taps *Wypróbujcie bez konta* at 50, and the **clock starts at 50**. The planner opens by 70. | caption *„Start.”* |
| 88–150 | The seeded hall: the chip *„Sala · 20×12 m”*, the 1 m grid, `GuestModeBanner` above the header, and the onboarding card top-right at 0 of 3. | *„Sala · 20×12 m”* · *„Zacznij tutaj”* · caption *„Sala już czeka.”* |
| 150–270 | `AddFab` (160) → the *Dodaj do sali* sheet on *Stoły* (170) → *Okrągły 8* (200). The sheet swaps to *Edytuj stół* (205) and shows *Liczba miejsc 8*. Check at 260: the table stands in the middle of the hall reading `0 / 8`, and the card's first step ticks, *„1 stół”*. | *„Dodaj do sali”* · *„Stoły”* · *„Okrągły 8”* · *„Edytuj stół”* · caption *„Stół na ośmioro.”* |
| 270–345 | *Goście* in the tab bar (315). The guest sheet rises on an empty list. *Dodaj gościa* (335). | *„Dodaj gościa”* |
| 305–470 | The *Dodaj gościa* sheet. *Imię i nazwisko* is typed from 350 to 455, *Babcia Jadzia*, 13 characters at about 8f each. *Zapisz* (465). Her row lands with the *Bez miejsca* pill. | *„Imię i nazwisko”* · typed *„Babcia Jadzia”* · *„Zapisz”* · caption *„Babcia na liście.”* |
| 470–600 | The sheet drops. The table is tapped (505): ring and toolbar. Pen (520) → *Edytuj stół*. The thumb scrolls the form to *Przypisz gości* (530–545), then *Wybierz gości* (555). The popover lists one guest, *Babcia Jadzia*. Tapped (570), it fills, and the footer reads *„Wybrani goście: 1 / 8”*. | *„Przypisz gości”* · *„Wybierz gości”* · *„Babcia Jadzia”* · *„Wybrani goście: 1 / 8”* · caption *„Babcia przy stole.”* |
| 600–614 | Check. The drawer drops onto the plan. The table reads `1 / 8`, and the onboarding card fills to 3 of 3 and turns into its done state. **The clock stops at 614 and reads 0:18** ((614 − 50) / 30 = 18.8 s, shown truncated). | *„Gdy plan będzie gotowy”* (chrome) |
| 615–665 | The clock holds and pulses once. Payoff in Playfair. | *„Babcia siedzi. Zostało 41 sekund.”* |
| 657–765 | `CallToAction`. | *„Włączcie stoper i sprawdźcie sami”* + *easywed.app* pill |

- **The payoff's number is arithmetic, not copy.** 60 − 18.8 = 41.2 → *41*, and Polish plurals it
  *sekund*. If build timing moves the stop frame, recompute it from `RunClock`'s own value (use the
  shared `plural()` in `i18n.ts`), never by hand.
- **Why guest-then-seat goes through the table form** and not the guest list's seat sheet: seating
  from the list is `list-seat`'s spent beat. The table form's *Przypisz gości* picker has never been
  a beat (in `table-shape` its label was chrome only), and it keeps the order you asked for: hall →
  table → guest → seated.
- **CTA:** *„Włączcie stoper i sprawdźcie sami”* over the *easywed.app* pill.
- **App surface:** the landing hero (`LocaleLanding`'s hero at v1.1.2), `/wedding/local` and its
  seeded hall, `GuestModeBanner`, `OnboardingChecklist` on a phone, `AddFab` → `AddHubContent` in the
  drawer, `TablePanelContent` in `MobilePanelDrawer` with `GuestAssignmentPicker`, and
  `AddGuestDialog` as a drawer.
- **Reuses:** from the stash `LandingScreen`, `TryNowPhone`, `SeededCanvas`, `AddHubSheet` and
  `OnboardingCard`. From main `PhoneShell`, `PlannerTable`, `CaptionLine`, `CallToAction`,
  `SeriesTag`, `Cursor` (as thumb), and the table-shape cut's `TableEditSheet`.
- **New:** `RunClock` (a mono-digit chip, `m:ss`, driven by `(frame − CLOCK_START) / fps` so it
  can't drift from film time). An `AddGuestSheet` redraw (title, *Imię i nazwisko* with its
  *Jan Kowalski* placeholder visible before typing, *Zapisz*). A `GuestPickerPopover` redraw
  (search field, one outline row that fills to `variant="default"`, the
  `guests_selected_of_capacity` footer). The onboarding card's three states (0/3, 1/3, 3/3 → done).
- **Success signals:** `table_added { shape: "round" }` and `guest_added { age_group: "adult" }`.
  **Not** `guest_seated`: the table-form picker fires nothing (only `SeatAssignPopover.tsx:91` and
  `SeatAssignSheet.tsx:92` track it).
- **Caption (IG, PL):**
  > Macie minutę? Tyle wystarczy, żeby pierwsza osoba siedziała przy stole ⏱️
  > Wchodzicie na easywed.app, klikacie „Wypróbujcie bez konta” i sala już czeka. Stół, gość, miejsce - gotowe. Bez rejestracji i bez maila: plan zapisuje się na tym urządzeniu, a konto możecie założyć później.
  > Ile Wam to zajmie? Wrzućcie swój czas w komentarzu 👇
  > Za darmo dla par - easywed.app
- **Hashtags:** `#wesele #ślub #planstołów #organizacjaślubu #narzeczeni #ślub2027 #pannamłoda`
- **Claim-check:**
  - No account: `/wedding/local` is in `AuthGate`'s `PUBLIC_PATHS` and has no `requireAuth`.
    The button is `landing.hero.try_local` *„Wypróbujcie bez konta”*.
  - The hero title at v1.1.2 is `landing.hero.title` *„Narysujcie salę i rozsadźcie gości weselnych
    przy stołach”*, which isn't burned (the burned *„Każdy gość na właściwym miejscu”* was v1's), so
    the first brief's crop is no longer needed. The eyebrow is `landing.hero.eyebrow`.
  - The hall is waiting: `DEFAULT_HALL` is seeded by `routes/wedding.local.tsx`, and its chip is
    *„Sala · 20×12 m”* (`hall.unnamed`).
  - A preset card opens the table form: `AddHubContent.tsx:110` `openTableEdit(tableId)`.
    `tables.preset.round_8` *„Okrągły 8”*, Ø 1.5 m.
  - Adding a guest: `AddGuestDialog.tsx` saves with `tableId: null`, and the row reads
    `guests.status.unseated` *„Bez miejsca”*. `guests.add.name` *„Imię i nazwisko”*, `common.save`
    *„Zapisz”*.
  - Seating from the table form: `GuestAssignmentPicker.tsx`, with `tables.guests` *„Przypisz
    gości”*, `tables.guests_pick` *„Wybierz gości”*, and `tables.guests_selected_of_capacity`
    *„Wybrani goście: {{count}} / {{capacity}}”*.
  - The onboarding card: `OnboardingChecklist.tsx` derives its steps from the plan, and a session
    that started unfinished keeps it on screen at 3/3 in the done state (`onboarding.done.title`
    *„Gdy plan będzie gotowy”*). Its *Udostępnij* is never tapped. Inviting is account-only.
  - The clock is film time: no cuts between frames 50 and 614, and every tap and keystroke drawn at
    thumb pace. *„Tyle wystarczy”* in the caption refers to the minute, not to 18 s.
  - **Burned-line hazard, open question 3:** step 3 of the onboarding card is
    `onboarding.seats.title` *„Posadź wszystkich”*, a burned line, drawn here as chrome.
  - **Verify at build:** that the picker's choice is applied by the drawer's check (`applyToStore`),
    not saved on the tap. The phone hero's exact layout below `md`. Where the onboarding card sits
    relative to the seeded hall on a phone (`top-3`, `w-[17.5rem]`). That *Gotowe* / the check is
    what closes `MobilePanelDrawer`.

---

## Brief 2: `carousel`: #1–#5 as one post

- **Compositions:** seven `<Still>`s, `easywed-carousel-1` … `easywed-carousel-7`, at
  **1080×1350 (4:5)**. Folder `src/easywed/carousel/`. Rendered with `remotion still`, one PNG
  per slide.
- **Why 4:5, and why it costs less than the square branch:** a 4:5 slide takes 25% more feed height
  than 1:1, and a carousel's slides must all share one ratio. None of the slides draws the planner at
  4:5. Each episode slide places a **PNG still of its 9:16 render** inside a slide layout. So
  `useFormat()` is never asked about 1080×1350, and the third branch stays unbuilt. (Rendering the
  stages live inside the slide would make `useVideoConfig` report 1080×1350, send them down the
  `tall` branch and lay them out wrong. Don't.)
- **Stills** (first guesses, pick by eye in the studio). Each slide uses its episode's clearest
  "it worked" frame:

| slide | source composition | frame | what the still shows |
| :---: | --- | ---: | --- |
| 2 | `easywed-listseat-vertical` | 320 | the seat grid, seat 6 selected, *Posadź na miejscu 6* |
| 3 | `easywed-tableshape-vertical` | 300 | the plan, the long table along the wall |
| 4 | `easywed-batch-vertical` | 268 | the ten tables standing in the room |
| 5 | `easywed-trynow-vertical` | 620 | the table at `1 / 8`, the clock stopped on 0:18 |
| 6 | `easywed-todo-vertical` | 220 | the DJ deposit struck through |

  Render them **without their own overlays**: tag, captions and hook off (the same `bare` prop the
  recap needs, see brief 3). The slide draws its own.

| slide | layout | on-screen copy |
| :---: | --- | --- |
| 1 (cover) | Playfair title over a soft crop of slide 4's room. Swipe hint bottom-right. | *„Wesele bez spiny”* · *„Pięć sytuacji z przygotowań do wesela”* · *„przesuń →”* |
| 2–6 | `SeriesTag` *#N* top-left. The phone still, rounded and shadowed, in the upper two-thirds. The episode's hook as a small line, the payoff under it in Playfair. | #1 *„Kuzyn Tomek jednak przyjedzie.”* / *„Tomek siedzi przy swoich. Reszta nawet nie drgnęła.”* · #2 *„Okrągłe stoły czy jeden długi?”* / *„Ci sami goście, inny stół.”* · #3 the built hook / the built payoff (`i18n.ts` `hook(10, 8)` / `payoff(10, 80)`) · #4 *„Macie 60 sekund?”* / *„Babcia siedzi. Zostało 41 sekund.”* · #5 *„Zaliczka dla DJ-a… zapłaciliśmy czy nie?”* / the built payoff, both halves |
| 7 (close) | The five tags in a column, `CallToAction`'s pill. | *„Zapiszcie, zanim usiądziecie do planu”* + *easywed.app* pill |

- **Burned lines, by your call:** slides 2–6 **quote** each episode's hook and payoff, which
  `existing-films.md` marks as burned. A carousel of the series is a summary by definition, so
  quoting is the point, and nothing new is claimed. Pull every quoted string from `i18n.ts`
  (`t.listSeat.payoff` and so on), never retype it, so the slides can't drift from the films. The
  cover, slide 7 and the CTA are new lines.
- **CTA:** *„Zapiszcie, zanim usiądziecie do planu”* over the *easywed.app* pill.
- **App surface:** the planner as each episode drew it. Nothing new.
- **Reuses:** every episode's stage (as a PNG), `SeriesTag`, `CallToAction`'s pill, `theme.ts`.
- **New:** `CarouselSlide` (layout), the seven `<Still>` registrations, a `bare` prop on five stages,
  and a `render:carousel` script that renders the five source stills into `public/carousel/`, then
  the seven slides into `out/pl/carousel/`.
- **Success signal:** none of its own. It's a save post, and IG saves aren't in `AnalyticsEvents`.
  Downstream: `table_added` / `guest_added` from guest mode.
- **Caption (IG, PL):**
  > Pięć sytuacji, które przytrafiają się przy planie stołów - i jak je ogarnąć bez spiny 📌
  > Kuzyn, który jednak przyjedzie. Kłótnia o okrągłe czy długie. Dziesięć stołów od sali. Minuta na start. Zaliczki, o których łatwo zapomnieć.
  > Zapiszcie ten post na dzień, w którym siądziecie do planu 👇
  > Za darmo dla par, bez konta - easywed.app
- **Hashtags:** `#wesele #ślub #planstołów #organizacjaślubu #narzeczeni #ślub2027 #poradyślubne`
- **Claim-check:**
  - Every slide claim is one an episode already made and checked in `instagram-reels-series-2026-09-26.md`, except #4's, which is in brief 1 here.
  - *„Zaliczki, o których łatwo zapomnieć”* in the caption says the list holds them. It doesn't say
    easywed reminds anyone (no notifications: section 4).
  - *„Minuta na start”* refers to brief 1's clock, film time.

---

## Brief 3: `recap`: #6

- **Composition:** `easywed-recap-vertical` (1080×1920). Folder `src/easywed/recap/`.
- **Duration:** scenes `hook 96 + early 234 + late 216 + cta 108 = 654`, at
  `RECAP_TRANSITION = 8` × 3 seams → **630f (21.0 s)**. Scene starts: 0, 88, 314, 522.
  *early* is three 78f clips (#1–#3). *late* is two 78f clips (#4, #5) plus a 60f finale. Clips
  inside a scene hard-cut, with no transitions.
- **Aspect ratio:** 9:16.
- **Single idea:** a seating plan is never done once, and each of the five things that change it is
  one move in easywed.
- **Hook, first 1.5 s (frames 0–45), verbatim:** *„Myślicie, że plan stołów robi się raz?”*

| frames | on screen | on-screen copy |
| --- | --- | --- |
| 0–45 | A slow push over a still of the seated `TALL_HALL`, drawn as `list-seat`'s plan. `SeriesTag` *#6*. A tally chip top-right reads *0/5*. Hook in Playfair. | *„Myślicie, że plan stołów robi się raz?”* |
| 45–96 | The hook gives way to a caption. | *„Przez pięć odcinków zmienialiśmy go ciągle.”* |
| 88–166 | Clip #1: `list-seat` stage, `bare`, around frames 250–328. The chip reads *#1*, and the tally goes to *1/5*. | *„Ktoś dopisany w ostatniej chwili.”* |
| 166–244 | Clip #2: `table-shape` stage, `bare`, around 160–238. Tally *2/5*. | *„Okrągły czy długi - oba na planie.”* |
| 244–322 | Clip #3: `ten-tables` stage, `bare`, around 190–268. Tally *3/5*. | *„Dziesięć stołów jednym wpisem.”* |
| 314–392 | Clip #4: `try-now` stage, `bare`, around 540–618, with its clock stopping in shot. Tally *4/5*. | *„Babcia przy stole, zanim minęła minuta.”* |
| 392–470 | Clip #5: `todo-list` stage, `bare`, around 160–238. Tally *5/5*. | *„Zaliczki i przymiarki na jednej liście.”* |
| 470–530 | The five clips' last frames in a 5-up strip, each under its *#N*. Payoff in Playfair. | *„Plan się zmienia. Nie zaczynacie od nowa.”* |
| 522–630 | `CallToAction`. | *„Zróbcie plan, który zniesie każdą zmianę”* + *easywed.app* pill |

- **Beat reuse, by your call:** a recap reuses the series' five beats by design, the same way
  `walkthrough-long` reuses the odd-room loop's scenes. What's new, and has to stay new, is the copy:
  the hook, the seven lines above, the payoff and the CTA. All of them were checked against
  `existing-films.md`. The nearest spent lines are *„Ci sami goście, inny stół.”*, *„Goście zostają
  na swoich miejscach.”* and *„Zapłacone. Odhaczone.”*, which is why #2 and #5 are phrased as they
  are.
- **How the clips are cut:** each `Clip` is `<Sequence from={-sourceStart} durationInFrames={78}>`
  wrapping the source episode's **stage** with a new `bare` prop (no `SeriesTag`, no `CaptionLine`,
  no hook or payoff). The recap draws its own lines over it. All five stages are 1080×1920 and read
  `useFormat()`'s `tall` branch, which is correct here. The stages that run on their own cut-global
  clocks (`TRY_NOW_STARTS` and so on) need their `frame + STARTS.scene` offset honoured inside the
  `Sequence`. Check each stage's clock at build.
- **CTA:** *„Zróbcie plan, który zniesie każdą zmianę”* over the *easywed.app* pill.
- **App surface:** as in each episode, and nothing new.
- **Reuses:** the five stages, `SeriesTag`, `CaptionLine`, `CallToAction`.
- **New:** `bare` on five stages (shared with the carousel). A `TallyChip` (*N/5*). A `ClipStrip` for
  the finale (five frozen frames via `<Freeze>`).
- **Success signal:** as the carousel, none of its own. Downstream `table_added`.
- **Caption (IG, PL):**
  > Plan stołów nigdy nie jest gotowy za pierwszym razem 😅
  > Ktoś się dopisze, sala zmieni stoły, a Wy się pokłócicie o okrągłe czy długie. W easywed każda z tych zmian to jeden ruch, a reszta planu zostaje, jak była.
  > Który odcinek był o Was? Napiszcie numer w komentarzu 👇
  > Za darmo dla par, bez konta - easywed.app
- **Hashtags:** `#wesele #ślub #planstołów #organizacjaślubu #narzeczeni #ślub2027 #salaweselna`
- **Claim-check:**
  - Every clip shows exactly what its episode showed and checked (2026-09-26 plan, briefs 1, 2, 3
    and 5; brief 1 here).
  - *„Ktoś dopisany w ostatniej chwili”* is the couple adding a name, not an RSVP.
  - *„Dziesięć stołów jednym wpisem”*: `tables.add_many`, `addTables` (desktop right-click, as that
    cut draws it).
  - *„Babcia przy stole, zanim minęła minuta”* is brief 1's clock, film time.
  - *„Nie zaczynacie od nowa”*: `list-seat` (`displaced: false`), `table-shape` (`applyToStore`
    keeps guests within capacity). No claim of undo/redo, which doesn't exist.
  - *„a reszta planu zostaje, jak była”* (caption) is the same evidence.

---

## Do not claim (carried verbatim from `SKILL.md` §4)

- ❌ **Live sync.** There is no Realtime. Collaborators see changes on reload - the landing now
  says so itself: `landing.features.invite.desc`, *„Wasze zmiany zobaczą przy kolejnym otwarciu
  strony.”*
- ❌ **Plus-ones / "osoby towarzyszące".** No such field on the guest model.
- ❌ RSVP, sending invitations, collecting guest replies.
- ❌ Offline or installable. A manifest exists; there is no service worker.
- ❌ Venue templates, or "import the venue's floor plan". That is manual founder work.
  `landing.venues_banner.subtitle` (*„Pary planują na odwzorowaniu Twojej prawdziwej sali”*) is
  venue-facing copy, out of scope under section 1 - never carry it into a couple's video.
- ❌ A generated PDF *file*. Export opens the browser print dialog (`plan_printed` says as much),
  and at the tag the app now says so too: *„Wydruk”* → *„Wydrukuj plan”* → *„Otwórz okno
  drukowania”*. `export.pdf.landscape_hint` mentions saving as PDF from that dialog - that is the
  browser's feature, not easywed's; do not claim it.
- ❌ Free or included AI. It needs the user's own API key.
- ❌ Reminders that notify. No push, no email, no calendar. It is a dated to-do list.
- ❌ A mobile app. Budget, vendors, timeline, registry, place cards, an auto-seat button. Undo/redo.
- ❌ **Any social proof.** No counts, logos, reviews or testimonials exist, so none may be shown,
  implied, or mocked up.
- ⚠️ Free use covers planning **your own** reception. Planners and venues working commercially need
  the paid plan (`terms.technical.c6`) — so "for wedding planners" framing is off-limits.

Specific to this run: the speedrun's clock is **the film's own time**, not a claim about how long a
viewer will take. The caption promises the minute, not 18 s. The done card's *Udostępnij* is never
tapped in guest mode. No slide or caption counts viewers, saves or couples.

## Build order

1. **`try-now` redo** (M). `git stash show -p stash@{0}` onto a branch, keep the stash's components,
   write the new `timeline.ts` / `script.ts` / copy, and add `RunClock`, `AddGuestSheet`,
   `GuestPickerPopover` and the onboarding card's three states. Register `easywed-trynow-vertical`
   and `render:try-now:vertical`.
2. **`bare` prop on the five stages** (S). It hides tag, captions, hook and payoff. The carousel and
   the recap both need it.
3. **`carousel`** (S–M). `CarouselSlide`, seven `<Still>`s at 1080×1350, and `render:carousel` (the
   five source stills, then the seven slides).
4. **`recap`** (S–M). `Clip`, `TallyChip`, `ClipStrip`, and the four scenes. Register
   `easywed-recap-vertical` and `render:recap:vertical`.
5. After each ships, update `references/existing-films.md` with its beats and lines. `/video-build`
   does this.

Each is `/video-build <id>` against this file. `pnpm run lint` must pass.

## Open questions for you

1. **Series name.** You called it *„luźne wesele”* in passing. The four built episodes carry
   *„Wesele bez spiny · #N”* (`i18n.ts:650`). Keep it (my default: renaming means re-rendering four
   posted-or-ready Reels), or rename for #4–#6 onwards?
2. **The clock.** 25.5 s is longer than the other episodes (15–18 s). That's the price of an honest
   uncut run at thumb pace. Fine, or should I tighten typing to about 5f per character (clock ≈
   0:17, film ≈ 24 s)? I wouldn't go further, or the clock stops looking like a real person's.
3. **The onboarding card** shows step 3's title *„Posadź wszystkich”*, a burned line, as app chrome.
   The card filling 1/3 → 3/3 is the best "finish line" the app has. Allow it as chrome (my
   recommendation, same precedent as the guest panel), or dismiss the card on the first frame
   in the planner, as the stash's `DISMISS_AT` did?
4. **Carousel ratio.** 4:5 (recommended: more feed space and no `useFormat()` work) or 1:1?
5. **Posting order and cadence.** My suggestion: #4 speedrun → the carousel 2–3 days later → #6 a
   week after the carousel. Or the carousel right after #6 as the "save it" closer?
6. **Trending audio / boosting.** The same questions as the 2026-09-26 plan's open questions 2 and 6.
   If the speedrun gets boosted, the clock and the guest-mode banner have to stay readable at the
   feed's crop.
