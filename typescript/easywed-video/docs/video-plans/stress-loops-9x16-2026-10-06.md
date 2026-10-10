> **Scope:** 9:16 looping Reels in the style of `stress-away`: a static three-line motto and the easywed signature, with only the table mark moving and an empty stage at both ends · **Date:** 2026-10-06 · **Written against:** `easywed/v1.2.0`

# Brand loops: more Reels like `stress-away`

## Strategy

The audience is the same: Polish engaged couples who have a date, a venue and a guest list, scrolling Reels.
These loops are the series' quiet register. The app screen-recordings (*Wesele bez spiny*) show the
product doing the work. These posts are 4–5 s and show one idea through the logo's own table. They're
easy to watch twice, which is what a short Reel needs, and they repeat the mark until it's recognisable.
Each loop shows one true mechanic of the planner. The table slides in empty, the mechanic plays, and
the table slides out, so every replay reads as the next table arriving. There's no CTA card on screen.
The signature stays on screen throughout, and the caption carries the action line and the link.

**Two deliberate departures from the skill, at your request (2026-10-05/06):**

- **No app screen.** Section 8 rules out "abstract motion graphics standing in for a screen". These
  loops are motion graphics by design. Each one still has to map to a real mechanic, and its
  claim-check line names that mechanic.
- **No `CallToAction` card.** The signature (*easywed.*) is the only brand element on screen. The
  action line moves to the first line of the caption.

**Out of scope this run, at your request:** 16:9 landing loops, 1:1 cuts, the YouTube walkthrough.

## Prioritised table

| ship | id | hook (first 1.5 s, on screen from frame 0) | format | length | channel | effort |
| :---: | --- | --- | --- | --- | --- | --- |
| 0 | `loop-kit` (shared) | - | - | - | - | **S**. Lift `Mark`, the slides and the motto/stage/signature layout out of `StressAway.tsx` |
| 1 | `extra-chair` | *„Jeszcze dwie osoby?”* | 9:16 | 138f / 4.6 s | Reels (also TikTok) | **S**. `Mark` takes a seat count, with angles interpolated |
| 2 | `seat-number` | *„Przy którym stole”* | 9:16 | 148f / 4.9 s | Reels | **S**. Seat numerals around the ring, plus a guest dot that lands on one chair |
| 3 | `by-the-metre` | *„Stół tuż przy parkiecie?”* | 9:16 | 118f / 3.9 s | Reels | **S–M**. A static 1 m grid and a dance floor on the stage, with an overshoot-and-snap |
| 4 | `nobody-standing` | *„Sadzajcie gości,”* | 9:16 | 146f / 4.9 s | Reels | **S–M**. A queue of guest dots under the table that hop into chairs |

**`extra-chair` ships first.** It's the smallest step from `stress-away` (the same mark with a seat count),
and it proves out `loop-kit`. `nobody-standing` ships last because its payoff, a table filling up, is
closest to `stress-away`'s. See open question 3.

### Shared across the four

- **Stage.** `Backdrop`, the motto at `PAD_TOP = 320`, the mark in the flexible middle, and the signature
  above `PAD_BOTTOM = 360`. Exactly `stress-away`'s layout, which sits inside the feed's 4:5 crop (y
  285–1635) and clears the Reels chrome.
- **Motto.** Three lines in Playfair at 88 px. The middle line is italic in terracotta. It's static from
  frame 0, with no fade.
- **Loop seam.** The mark enters with `Easing.out(cubic)` over frames 0–18 from `-(width/2 + mark/2 +
  40)`, and leaves with `Easing.in(cubic)` over the last 18 frames, ending off-canvas on `D − 1`. The
  frame 0 and last-frame stages are therefore identical (only motto, signature and any static stage
  elements). This is `stress-away`'s rule.
- **Arithmetic.** These loops are single compositions with no `TransitionSeries`, so
  `D = slide in + Σ beats + slide out`, with no seam subtraction.
- **Seat geometry is the app's.** A round table at v1.2.0 seats evenly from 12 o'clock clockwise:
  `angle = −π/2 + (i / capacity) · 2π` (`Canvas/seatLayout.ts` `computeSeatPositions`). The mark
  already uses exactly this, so *Miejsce N* is index `N − 1`.
- **Languages.** Polish by default, English via `REMOTION_LANG=en`, with the lines in the group's
  `i18n.ts`. `stress-away` hard-codes English today; see open question 1.
- **Cover frame.** Frame 0 is an empty stage. Each brief names a better cover frame to pick at upload.

---

## Brief 0: `loop-kit`, the shared pieces

- `animations/components/TableMark.tsx`: `stress-away`'s `Mark`, plus `seats` (a number that can be
  fractional while seats are being added), an optional `labels` render prop for per-seat numerals, and
  `highlight` (a seat index that gets the breathing ring without filling).
- `animations/components/LoopReel.tsx`: the motto / stage / signature layout and the slide-through
  wrapper (`slideIn`, `slideOut`, given `D`). `StressAway` is rewritten on top of it with no visible
  change (frames 0, 60 and 147 diff to zero against the current render).
- `animations/i18n.ts`: the mottos in both languages.
- Effort **S** (half a day), including re-rendering `stress-away` to prove nothing moved.

---

## Brief 1: `extra-chair`

- **Composition:** `easywed-extra-chair-vertical` (1080×1920), folder `animations/extra-chair/`.
- **Duration:** `18 in + 18 hold + 30 chairs added + 10 beat + 30 two guests sit + 14 hold + 18 out`
  = **138f (4.6 s)**.
- **Single idea:** a table with every chair taken gets two more, the ring re-spaces itself, and two
  more guests sit down.
- **Hook, verbatim:** *„Jeszcze dwie osoby?”*
- **Motto (pl):** *„Jeszcze dwie osoby?”* / *„dwa krzesła”* (italic) / *„więcej przy tym samym stole”*
- **Motto (en):** *"Two more coming?"* / *"two more chairs"* / *"at the same table"*

| frames | on screen | copy |
| --- | --- | --- |
| 0–18 | Empty stage. The mark slides in from the left, **full**: 8 of 8 in terracotta. | motto (static) |
| 18–36 | Hold on the full table. | - |
| 36–66 | `seats` interpolates 8 → 10. The eight chairs glide round to their 10-seat angles, and two new chairs grow in soft green at the gaps, after seats 4 and 8 (indices from the new 10-seat layout). | - |
| 66–76 | Beat: 8 seated, 2 free. | - |
| 76 / 92 | The two new chairs fill one after the other with `stress-away`'s spring and ring. Settled by about 106. | - |
| 106–120 | Hold, 10 of 10. | - |
| 120–138 | The mark slides out to the right. Empty stage on 137. | - |

- **Cover frame:** about 110.
- **CTA (caption, first line):** *„Dostawcie krzesło na planie - easywed.app”*
- **App surface it stands for:** the table form's *Liczba miejsc* (`tables.capacity`), which isn't drawn.
- **Reuses:** `loop-kit`. **New:** fractional `seats` in `TableMark` (angle lerp per index).
- **Caption:** *„Dwie osoby więcej, a stół ten sam. W easywed zmieniasz liczbę miejsc i krzesła same
  rozstawiają się wokół stołu - nikt z już posadzonych nie traci miejsca. Za darmo dla par, bez
  zakładania konta.”* · `#wesele #planstołów #rozsadzeniegości #ślub2027 #organizacjawesela`
- **Success signal:** `guest_seated` (the two chairs get filled).
- **Claim-check:** capacity is editable on any table (`tables.capacity`, `TablePanelContent.tsx`).
  Round seats are evenly re-spaced for any capacity (`seatLayout.ts` `computeSeatPositions`, round
  branch). Seated guests stay when capacity grows: `applyToStore` slices to capacity, so it only drops
  guests when capacity shrinks (`v1-facts.md`, *How a table changes shape*). Free for couples:
  `terms.fees.c1`. Guest mode: `docs/guest-vs-account.md`. **Do not** say the table grows: the
  diameter is unchanged and the chairs just sit closer. That's why the motto says *the same table*.
  The animation is accurate here: the mark's table radius doesn't change.

---

## Brief 2: `seat-number`

- **Composition:** `easywed-seat-number-vertical`, folder `animations/seat-number/`.
- **Duration:** `18 in + 6 hold + 36 numerals + 10 hold + 16 highlight + 20 guest lands + 10 settle +
  14 hold + 18 out` = **148f (4.9 s)**.
- **Single idea:** easywed seats a guest on a specific chair, not just at a table.
- **Hook, verbatim:** *„Przy którym stole”*
- **Motto (pl):** *„Przy którym stole”* / *„i na którym”* (italic) / *„krześle”*
- **Motto (en):** *"Which table"* / *"and which"* / *"chair"*

| frames | on screen | copy |
| --- | --- | --- |
| 0–18 | The mark slides in with all 8 chairs empty (soft green). | motto |
| 18–24 | Hold. | - |
| 24–60 | Numerals **1–8** fade in just outside each chair, clockwise from 12 o'clock, one every 4f (24, 28 … 52), each over 8f. Inter, `inkSoft`. | *1 … 8* (numerals only) |
| 60–70 | Hold. | - |
| 70–86 | Chair **5** (index 4, 6 o'clock) gets the breathing ring without filling. Its numeral turns terracotta. | - |
| 86–106 | A terracotta guest dot drops from above the table's centre in an arc onto chair 5, which fills. | - |
| 106–116 | The spring settles. The other seven chairs stay empty. | - |
| 116–130 | Hold. | - |
| 130–148 | The mark slides out, numerals with it. | - |

- **Cover frame:** about 120.
- **Why chair 5 and not 6:** *„Posadź na miejscu 6”* is burned (list-seat). The numeral alone isn't a
  line, but avoiding 6 keeps the frame from echoing that cut.
- **CTA (caption):** *„Wybierzcie gościowi krzesło - easywed.app”*
- **App surface it stands for:** seat markers on the canvas and the seat popover (*Miejsce N*,
  `seats.numbered`), which aren't drawn.
- **Reuses:** `loop-kit`. **New:** `labels` on `TableMark`, and a dot travelling on an arc.
- **Caption:** *„Nie tylko «stół 4». W easywed każde krzesło ma swój numer, a gość siada na
  konkretnym - prosto z planu albo z listy gości. Za darmo dla par, bez zakładania konta.”* ·
  `#wesele #planstołów #rozsadzeniegości #ślub2027 #młodapara`
- **Success signal:** `guest_seated` (`source: "canvas_seat" | "guest_list"`).
- **Claim-check:** seat-level assignment from the canvas (`SeatAssignPopover.tsx`, `assignGuestToSeat`)
  and from the list (`SeatAssignSheet.tsx`, `seats.assign_at`). Seats are numbered (`seats.numbered`
  *„Miejsce {{n}}”*). Numbering starts at 12 o'clock clockwise (`seatLayout.ts`, round branch, with
  `seatIdForIndex`). **Caveat:** the app draws chairs with initials, not numbers (`TableSeats.tsx`).
  The numerals are the film's abstraction of *Miejsce N*. That's the same register as the rest of the
  loop, not a claim about the canvas.

---

## Brief 3: `by-the-metre`

- **Composition:** `easywed-by-the-metre-vertical`, folder `animations/by-the-metre/`.
- **Duration:** `24 in with overshoot + 6 pause + 12 snap + 12 hold + 18 nudge + 12 snap + 16 hold +
  18 out` = **118f (3.9 s)**.
- **Single idea:** a table dropped near the dance floor lands on the metre grid, not wherever the
  thumb let go.
- **Hook, verbatim:** *„Stół tuż przy parkiecie?”*
- **Motto (pl):** *„Stół tuż przy parkiecie?”* / *„co do metra”* (italic) / *„na planie sali”*
- **Motto (en):** *"Right by the dance floor?"* / *"to the metre"* / *"on the floor plan"*

| frames | on screen | copy |
| --- | --- | --- |
| static | The stage carries a faint **1 m grid** (`colors.border`, every fifth line firmer, like the app's 5 m ruling) and a **dance floor**, a plain square at the top-right of the stage, cropped by the right edge, drawn as the app draws a fixture. Both are present on frame 0 and on the last frame. | - |
| 0–24 | The logo mark (12 and 3 o'clock seated) slides in and **overshoots** its grid cell by about 0.4 m. | motto |
| 24–30 | It rests off the grid. | - |
| 30–42 | It **snaps** back by spring so its footprint aligns to the grid, and the grid lines under it brighten for 8f. | - |
| 42–54 | Hold: one clear metre (one grid square) between the table and the dance floor. | - |
| 54–72 | It's nudged half a metre diagonally towards the floor, off-grid again. | - |
| 72–84 | It snaps again, one cell closer, and the grid flashes. | - |
| 84–100 | Hold. | - |
| 100–118 | It slides out to the right, under the dance floor's corner. | - |

- **Cover frame:** about 90.
- **CTA (caption):** *„Ustawcie stoły na swojej sali - easywed.app”*
- **App surface it stands for:** a dragged table snapping to `snapStep` on the canvas, which isn't drawn.
- **Reuses:** `loop-kit`. **New:** a `GridStage` (static SVG grid plus a fixture square), and the snap
  spring.
- **Scale:** the mark's table is drawn as *Okrągły 8*'s Ø 1.5 m, so the grid's metre is
  `tableDiameterPx / 1.5`. At a 436 px mark the table is about 240 px, so 1 m ≈ 160 px, and the dance
  floor (*Parkiet*, 3×3 m) is 480 px, shown about two-thirds in frame.
- **Caption:** *„Sala w prawdziwych metrach, a stół ląduje równo na siatce - co do metra od parkietu.
  Za darmo dla par, bez zakładania konta.”* · `#wesele #plansali #planstołów #ślub2027
  #organizacjawesela`
- **Success signal:** `table_added`.
- **Claim-check:** a dragged table snaps on drop (`useTableSnap.ts` `snapPositionToGrid`). The default
  step is 1 m (`view.store.ts` `snapStep: 1`). There's a 1 m grid with a firmer 5 m ruling (`v1-facts.md`,
  *A metric, to-scale floor plan*). *Parkiet* is 3×3 m (`fixtures.preset.dance_floor`, `addPresets.ts`).
  *Okrągły 8* is Ø 1.5 m (`TABLE_PRESETS`). **Caveat:** the app snaps the table's **top-left corner**,
  not its centre. For a 1.5 m table that puts the centre at 0.75 off the grid line, so draw the snap
  that way (footprint edge on the line), not with the centre on an intersection. **Burned-beat check:**
  measuring between a table and the dance floor is spent (to-scale). This loop measures nothing: no
  tool, no label, just the grid.

---

## Brief 4: `nobody-standing`

- **Composition:** `easywed-nobody-standing-vertical`, folder `animations/nobody-standing/`.
- **Duration:** `18 in + 12 hold + 70 hops (8 hops, one every 10f, from 30 to 100) + 14 last hop +
  14 hold + 18 out` = **146f (4.9 s)**.
- **Single idea:** guests waiting in a queue go into chairs one at a time until nobody is left standing.
- **Hook, verbatim:** *„Sadzajcie gości,”*
- **Motto (pl):** *„Sadzajcie gości,”* / *„aż nikt”* (italic) / *„nie zostanie na stojąco”*. This is
  the app's own voice, from `landing.steps.three.desc` (*„Przeciągajcie gości na miejsca, aż nikt nie
  zostanie na stojąco”*). It isn't on the burned list.
- **Motto (en):** *"Seat your guests"* / *"until no one"* / *"is left standing"*

| frames | on screen | copy |
| --- | --- | --- |
| 0–18 | The mark slides in with all chairs empty. Under it, a row of **8 terracotta dots** (the guests, at seat size) slides in with it. | motto |
| 18–30 | Hold. | - |
| 30–114 | One at a time, every 10f, the leftmost dot **hops** in an arc into the next chair in `stress-away`'s shuffled order and fills it (the spring and ring on landing). The row shuffles left to close the gap. Each hop takes 14f, so the last one (100) lands at 114. | - |
| 114–128 | Hold: the row is gone and the table is 8 of 8. | - |
| 128–146 | Slide out. | - |

- **Cover frame:** about 70 (half the guests seated, half still standing).
- **CTA (caption):** *„Posadźcie pierwszego gościa - easywed.app”*
- **App surface it stands for:** the guest list's *Bez miejsca* guests being seated, and the progress
  card (*Rozsadzeni*), which aren't drawn.
- **Reuses:** `loop-kit`. **New:** a `GuestQueue` row and the arc hop.
- **Caption:** *„Każdy gość bez miejsca czeka na liście, aż go posadzicie - i widać, ilu jeszcze
  zostało. Za darmo dla par, bez zakładania konta.”* · `#wesele #rozsadzeniegości #planstołów
  #ślub2027 #młodapara`
- **Success signal:** `guest_seated`.
- **Claim-check:** guests start unseated with `tableId: null` (*„Bez miejsca”*, `guests.status.unseated`,
  `AddGuestDialog`). The progress card counts seated against total (`guests.progress`,
  `guests.seated_ratio`). The phone's *Goście* badge counts the unseated (`useTabBadgeCounts`). Changelog
  `v1` `i2`: *„pasek postępu przypomni, ile osób wciąż stoi”*. **Do not** imply the app seats them by
  itself: there's no auto-seat (section 4). The hops come one at a time and evenly paced, so they read
  as somebody seating them.

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

`extra-chair`'s *„dwie osoby”* is about guests in general, never plus-ones. Keep the caption off
*osoba towarzysząca*.

## Ideas considered and dropped

- **Round → long table, same guests.** This is the table-shape cut's beat and payoff, both spent.
- **A seated table dragged across the room.** Keep-apart's beat, spent.
- **One table becoming ten.** Ten-tables' batch beat, spent even in the abstract.
- **Diet colours on chairs.** The app doesn't colour seat markers by diet, so the abstraction would
  claim something false, and diet tags landing is the kitchen-report beat.
- **Two cursors on one table.** Account-gated (invites), and it reads as live sync (section 4).

## Build order

| step | item | effort |
| :---: | --- | --- |
| 1 | `loop-kit`, with `StressAway` rebuilt on it and a frame diff that shows no change | S, half a day |
| 2 | `extra-chair` | S, about 2 h |
| 3 | `seat-number` | S, about 2 h |
| 4 | `by-the-metre` (`GridStage`, snap on the top-left corner) | S–M, about half a day |
| 5 | `nobody-standing` (`GuestQueue`, hops) | S–M, about half a day |
| 6 | Add `stress-away` and each shipped loop to `references/existing-films.md` (beats and mottos, both languages) | XS per film |

Each item is one `/video-build <id>` pass. Render scripts follow the existing pattern:
`render:<id>` → `out/${REMOTION_LANG:-pl}/animations/easywed-<id>-vertical.mp4`.

## Open questions

1. **Language.** *Answered 2026-10-06 for `stress-away`:* the motto stays English, hard-coded in
   `StressAway.tsx` (*"One guest per day / keeps the stress away"*, two lines, *per day* in italic terracotta). It bends *"an apple a
   day keeps the doctor away"*, which has no Polish twin, and the pun is the post, so the Polish
   caption carries the meaning instead. The four new briefs are written in Polish first; whether
   they also get English versions is still open.
2. **Address on screen.** With no CTA card, should *easywed.app* sit under the signature in
   `inkSoft`, or is the caption enough?
3. **`nobody-standing` vs `stress-away`.** Both end on a full table. Ship both, or drop 4 if
   `stress-away` goes out in Polish?
4. **Cadence and channel.** One loop a week between *Wesele bez spiny* episodes, or a batch? Reels
   only, or TikTok too? (TikTok's bottom UI is taller, so check the signature clears it.)
5. **Budget.** All four are code-only, with no new assets. Is about 2 days in total right for this
   run?
6. **`existing-films.md`.** `stress-away` isn't listed, so its beat (the logo table filling seat by
   seat) and its motto aren't recorded as burned. Should I add it when step 6 comes around?
