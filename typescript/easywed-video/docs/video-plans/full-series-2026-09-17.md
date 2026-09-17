# easywed video plan — full series · 2026-09-17 · `easywed/v1`

Produced by `/video-plan` (`365/.claude/skills/video-plan/`), against the product as it exists at the
`easywed/v1` tag and the Remotion project in this repo. Briefs only — nothing here is built yet.

Third plan in this directory. `full-series-2026-09-11.md` and `16x9-only-2026-09-16.md` stay the
record of what was decided on their dates; three of their briefs have shipped (`import-excel`,
`kitchen-report`, `to-scale`), and this plan does not re-plan those. Two of their briefs were never
built — `seat-swap` and `odd-room` — and are carried forward here, re-verified against the tag and
**corrected**: the seat popover does not behave the way the 09-16 plan assumed (see brief 1).

## Strategy

**Who:** a Polish couple whose hall and guest list already exist — on paper, in a spreadsheet, in
easywed — and whose remaining problem is the human one: who moves, who is a child, what shape the
room actually is. **Where:** Reels and TikTok for reach, the landing page for the visitors those
posts send over, feed posts once the 1:1 branch exists, YouTube for the ones who want the whole tour
first. **What action:** open easywed.app and build a seating plan in guest mode, in this session,
with no account. **Why now:** the three films that have shipped all sell *getting the list in*
(import, diets, metres). Nobody has yet shown what happens **after** the plan exists and reality
changes it — and that is the week a couple actually looks for a tool. Every brief below is one
after-the-plan moment, and none of them asks for an email.

## Do not claim

Carried verbatim from the skill, section 4.

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

Two more this plan adds, specific to its own material:

- ❌ **Importing age groups.** `IMPORT_FIELDS` is name / table / dietary / note only
  (`lib/import/guestsImport.ts`). Age brackets are typed in the guest form, never imported.
- ❌ **A child menu, child pricing, or high chairs.** The app counts kids and prints the brackets.
  What the venue charges for them is not in the product.

## Priority

| # | id | hook (the pain) | format | length | channel | effort | ship |
|---|---|---|---|---|---|---|---|
| 1 | `seat-swap` | one guest has to move | 9:16 + 16:9 loop | 510f / 17 s · 396f / 13.2 s | Reels, TikTok · landing | M | **first** |
| 2 | `kids-count` | how many children are coming | 9:16 | 510f / 17 s | Reels, TikTok | M | second |
| 3 | `odd-room` | our room isn't a rectangle | 16:9 loop | 360f / 12 s | landing | M–L | third |
| 4 | `square-cuts` | (infrastructure + two 1:1 cuts) | 1:1 | 510f / 17 s each | FB/IG feed | **L** | fourth |
| 5 | `walkthrough-long` | empty room, list, no plan | 16:9 | 1920f / 64 s | YouTube | L | last |

Effort is Remotion work, not shoot time — nothing here is filmed, and nothing here has audio.

---

## 1. `seat-swap` — "one guest has to move"

Carried forward from `16x9-only-2026-09-16.md` and **corrected**: that brief had the second popover
"lead with *Bez stołu*". It does not. `SeatAssignPopover.tsx` groups in a fixed order — selected,
*Przy tym stole*, *Bez stołu*, *Przy innym stole* — and only drops empty sections, so at Stół 1 the
seven people already at that table come first and the displaced guest is below the fold of a
`max-h-52` scroller. The fix is to use the popover's own search box, which is what a real user does,
and which makes the film more honest rather than less.

- **Compositions:** `easywed-swap-vertical` (1080×1920, the cut it is made for),
  `easywed-swap` (1920×1080), `easywed-swap-loop` (1920×1080, no CTA — see below),
  `easywed-swap-square` (1080×1080, after brief 4). Scenes registered individually in a Studio
  folder "Swap" at 9:16: `SwapHook`, `SwapPick`, `SwapReseat`, `SwapCta`.
- **Duration (social cut):** 510f = 17 s @ 30 fps. `SWAP_SCENES` 96 + 180 + 150 + 108 = 534;
  `SWAP_TRANSITION = 8` × 3 seams → 534 − 24 = **510**.
- **Duration (landing loop):** 396f = 13.2 s. The same first three scenes, no `SwapCta`, at
  `TRANSITION = 15`: 96 + 180 + 150 = 426 − 15 × 2 = **396**; the last 15 frames of `SwapReseat`
  are `LoopSeam` onto `SwapHook`'s frame 0.
- **Aspect:** 9:16 primary, 16:9 free via `useFormat()`, 1:1 after brief 4.
- **The idea:** moving one guest into a full table takes two picks on the plan, and the person who
  loses the chair is listed as needing one instead of quietly vanishing.
- **Hook (0–45f, verbatim):** *„Ciocia chce siedzieć przy innym stole?”*
  (EN: *"Auntie wants to sit at a different table?"*)

| frames | on screen | copy |
|---|---|---|
| 0–96 | `SwapHook` — `AppFrame` + `PlannerCanvas` + `HallCanvas` on the full hall, `Miejsca` active in the toolbar, every seat marker terracotta, every table labelled name over `8 / 8`. Frame 0 is the bare planner; the hook fades in by frame 12. The cursor arrives at frame 60 and presses one seat marker on Stół 4 at frame 84. | *„Ciocia chce siedzieć przy innym stole?”* · toolbar *„Miejsca”* |
| 88–268 | `SwapPick` — the seat popover opens anchored to the marker, `side="top"`: search field, then *Zwolnij miejsce* (it only exists because the seat is taken), then *Aktualnie na tym miejscu* — Michał Dąbrowski as the filled black row — and *Przy tym stole* with the rest of Stół 4 scrolling below. The cursor types `Maria` into the search; the list collapses to one amber row under *Przy innym stole*. It is picked at ~frame 215: the popover closes, and Stół 1's label ticks to `7 / 8` with one seat marker turning green. | *„Szukaj gości”* · *„Zwolnij miejsce”* · *„Aktualnie na tym miejscu”* — Michał Dąbrowski · *„Przy tym stole”* · typed *„Maria”* · *„Przy innym stole”* — Maria Wiśniewska (amber) |
| 260–410 | `SwapReseat` — the cursor crosses to Stół 1's green marker and presses it. No occupant now, so there is no *Zwolnij miejsce*: the sections are *Przy tym stole* and, under it, *Bez stołu*. The cursor types `Michał`; one row is left. Picked — the marker fills, Stół 1 reads `8 / 8` again, and the payoff lands. | *„Przy tym stole”* · *„Bez stołu”* — Michał Dąbrowski · **„Nikt nie znika z planu.”** |
| 402–510 | `SwapCta` — the planner recedes behind the `Backdrop`, `BrandMark` + `Wordmark` settle, `CallToAction` draws the action line and the pill. | *„Kliknij miejsce i wybierz gościa”* · *„easywed.app”* |

- **Why the search is in shot:** it is the popover's first element, and typing into it is the only
  honest way to reach a name that is 8th or 51st in the list. `normalizedQuery` is a plain
  lowercased `includes` on the name (no diacritic folding here, unlike the import wizard), so
  `Michał` matches *Michał Dąbrowski* and **not** the roster's *…Michalak* surnames — that is why
  the typed string carries its `ł`.
- **The end state equals the start state** — all markers filled, both tables back at `8 / 8`, no
  names ever drawn on the canvas — so the loop's seam is invisible apart from the cursor fading out.
- **CTA:** *„Kliknij miejsce i wybierz gościa”* over the `easywed.app` pill, via
  `components/CallToAction.tsx`. **The loop cut has no CTA and no pill**; the page under it is the
  CTA.
- **App surface:** canvas seat markers and `SeatAssignPopover`.
- **Reuses:** `AppFrame`, `PlannerCanvas`, `HallCanvas`, `PlannerTable`, `Cursor`, `Backdrop`,
  `BrandMark`, `Wordmark`, `CallToAction`, `LoopSeam`, `GUESTS` / `rosterFor` from `data.ts` (Maria
  Wiśniewska is already at Stół 1 and Michał Dąbrowski at Stół 4, in both halls), `TALL_HALL` /
  `WIDE_HALL`.
- **Genuinely new:** `SeatPopover.tsx` — a redraw of `SeatAssignPopover` with the search field, the
  clear-seat button, section headers and the amber *elsewhere* row; and **per-seat fill in
  `HallCanvas`**, whose `seatFill: number[]` is one share per table today (`PlannerTable` takes
  `fill` 0..1 and derives `takenSeats`), so a single marker cannot empty while its neighbours stay
  filled. That is the M in the table, and it touches a file all four shipped films render.
- **Caption (Reels/TikTok):** *Jedna osoba musi się przesiąść, a stół jest pełny? Klikasz miejsce,
  wybierasz gościa — a ten, kto zwolnił krzesło, trafia na listę „bez stołu”, więc nikt nie zostaje
  zapomniany. Plan sali działa w przeglądarce, bez zakładania konta.*
  `#planwesela #rozsadzeniegosci #planstolow #slub2026 #weselnestoly #pannamloda`
- **Success signal:** `guest_seated { source: "canvas_seat", displaced: true }` — literally the move
  this film shows. (`displaced` is set in `SeatAssignPopover.tsx` when `occupantId != null`.)
- **Claim check:**
  - Seat-level picking from the canvas → `seats.toggle`, `seats.group_selected`, `seats.group_table`,
    `seats.group_unassigned`, `seats.group_elsewhere`, `seats.clear`,
    `tables.guests_search_placeholder` in `pl.json`; `SeatAssignPopover.tsx`.
  - The occupant leaves the table when an outsider takes a full table's seat →
    `assignGuestToSeat` in `planner.store.ts`: `occupantLeavesTable = occupant != null &&
    !guestAlreadyHere && tableIsFull`, and the displaced guest is written `tableId: null,
    seatId: null`. So *„Nikt nie znika z planu”* is backed by him becoming unassigned, which is
    exactly what the second popover then shows under *Bez stołu*.
  - The amber row for a guest seated elsewhere → `renderGuest`'s `border-amber-300/80
    bg-amber-50/70`.
  - Section order and "only non-empty sections render" → the `sections` array and its
    `.filter((section) => section.items.length > 0)`.
  - Works with no account → `docs/guest-vs-account.md`, row "Halls, tables, fixtures, seating" ✅
    guest.
  - **Not claimed:** anything automatic, any undo, any notification to the guest. Every move is a
    click (section 4).
  - Lines checked against `existing-films.md`: hook, payoff and CTA action are unburned. *„Bez
    stołu”* is `seats.group_unassigned`, a different string from the burned *„Bez miejsca 0”* filter
    chip. The toolbar's *„Miejsca”* is chrome every planner shot carries.

---

## 2. `kids-count` — "how many children are coming?"

- **Compositions:** `easywed-kids-vertical` (1080×1920, primary), `easywed-kids` (1920×1080),
  `easywed-kids-square` (1080×1080, after brief 4). Studio folder "Kids" at 9:16: `KidsHook`,
  `KidsTag`, `KidsCount`, `KidsCta`.
- **Duration:** 510f = 17 s. `KIDS_SCENES` 96 + 180 + 150 + 108 = 534; `KIDS_TRANSITION = 8` × 3 →
  **510**.
- **Aspect:** 9:16 primary, 16:9 free.
- **The idea:** you tag each child with their age bracket once, and the guest list counts them for
  you — including a bracket you invent yourself.
- **Hook (0–45f, verbatim):** *„Ile dzieci będzie na weselu?”*
  (EN: *"How many children are coming?"*)

| frames | on screen | copy |
|---|---|---|
| 0–96 | `KidsHook` — the guest panel, pushed in so the rows fill the frame: 58 names, not a badge among them. The hook fades in by frame 12 over the top. | *„Ile dzieci będzie na weselu?”* |
| 88–268 | `KidsTag` — the cursor presses the pencil on *Staś Mazur*; `Edytuj gościa` opens (bottom-sheet drawer in 9:16, centred dialog in 16:9), scrolled to *Grupa wiekowa*: *Dorosły* filled black, then *0-3 lata*, *3-6 lat*, *+ Dodaj*. *0-3 lata* is pressed and turns violet; *Zapisz*. The drawer closes, his row takes a violet badge, and a new chip slides into the filter row. Cut inside the scene to *Kuba Król*: *+ Dodaj* → `6-12` typed into the *np. 6-12* field → ✓ → *Zapisz*; his badge reads *6-12*. | *„Edytuj gościa”* · *„Grupa wiekowa”* · *„Dorosły”* · *„0-3 lata”* · *„3-6 lat”* · *„Dodaj”* · *„np. 6-12”* · *„Zapisz”* · chip *„Dzieci 1”* → *„Dzieci 2”* |
| 260–410 | `KidsCount` — the drawer is gone and the chip now reads *Dzieci 5*. The cursor presses it: the list filters to five rows, each with its violet bracket badge. Payoff lands under the chip row. | chip *„Dzieci 5”* · badges *„0-3 lata”*, *„3-6 lat”*, *„3-6 lat”*, *„6-12”*, *„6-12”* · **„Każde dziecko policzone.”** |
| 402–510 | `KidsCta` — the panel recedes, mark + wordmark, `CallToAction`. | *„Oznacz dzieci na liście gości”* · *„easywed.app”* |

- **The five kids** replace five generated seats at Stół 5 and Stół 6 rather than being added, so the
  list stays at 58 and every other film's counts still agree: *Staś Mazur* (`0-3`), *Lena Mazur*
  (`3-6`), *Antek Sikora* (`3-6`), *Kuba Król* (`6-12`), *Ola Król* (`6-12`). Their generation
  indices are read off `rosterFor`'s order at build time, the way `kitchen-report/guests.ts` comments
  its `EXTRA_DIETS` indices — not guessed here. They live in `kids-count/guests.ts` for the same
  reason the diets do: the import cut's published sheet must keep the roster it shipped with.
- **Why two brackets are typed and three are already there:** tagging five guests in a row would be
  the kitchen-report film's beat (tags landing row by row), which is spent. This film tags two on
  camera and cuts to the finished count — the payoff is the *number*, not the tagging.
- **CTA:** *„Oznacz dzieci na liście gości”* over the pill.
- **App surface:** the guest list (progress, search, filter chips, rows) and `EditGuestDialog`'s
  *Grupa wiekowa* field.
- **Reuses:** `AppFrame`, `Backdrop`, `BrandMark`, `Wordmark`, `Icon`, `CallToAction`,
  `kitchen-report/components/GuestList.tsx` (promote to `components/`, since two films now draw the
  list), `ImportDialog.tsx`'s `drawer` shell as the precedent for the bottom sheet, `rosterFor`.
- **Genuinely new:** `EditGuestDrawer.tsx` (name field, *Grupa wiekowa* pills, save), a violet
  `TagBadge` tone and a `kids` chip in `GuestList`, and `colors.tagViolet` in `theme.ts`.
  `--tag-violet` is `oklch(0.5 0.11 300)` ≈ **`#8a4398`**, which sits close to `colors.accent`
  (`#8f4f80`) and `colors.selected` (`#9c4f89`) — check on a still that a badge does not read as a
  selection.
- **Caption (Reels/TikTok):** *Dzieci na weselu liczą się inaczej niż dorośli. Przypisz gościowi
  przedział wieku - gotowy albo własny, np. 6-12 - a lista sama policzy, ile jest dzieci. W
  przeglądarce, bez zakładania konta.*
  `#planwesela #dziecinawesele #listagosci #slub2026 #rozsadzeniegosci #weselezdziecmi`
- **Success signal:** `guest_added { age_group: "adult" | "preset" | "custom" }` — the `custom`
  bucket is this film's own payoff. Note that **editing** an existing guest fires nothing: there is
  no `guest_updated` event in `AnalyticsEvents`, and none may be invented, so the film's exact
  motion is only measurable for guests added after it.
- **Claim check:**
  - One bracket per guest, adults implicit → `lib/ageGroup.ts`: `ADULT_AGE_GROUP`, "a guest with no
    explicit group is an adult", `childAgeGroup` returns null for adults so only children get badges.
  - The presets shown are exactly `AGE_GROUP_PRESETS` = `adult`, `0-3`, `3-6`, labelled
    `guests.age_group.adult|0-3|3-6` (*„Dorosły”*, *„0-3 lata”*, *„3-6 lat”*).
  - A typed bracket is kept verbatim → `canonicalizeAgeGroup` (trim, collapse, snap a numeric range
    to `a-b`, cap at `MAX_AGE_GROUP_LENGTH`); `guests.add.age_group_custom_placeholder` is literally
    *„np. 6-12”*, which is why the film types that value.
  - The count is derived, not a field → `isKidAgeGroup` (lower bound < `ADULT_AGE` 18, non-numeric
    labels count as kids), `countKids`, and the chip's own tooltip `guests.filter.kids_hint`.
  - The chip only exists once someone is tagged → `GuestListContent.tsx`, `kidsCount > 0 &&`. That is
    why the chip *appears* mid-film rather than sitting at zero.
  - Violet is the reserved age tone → `AGE_GROUP_TONE = "violet"` in `lib/ageGroup.ts`,
    `--tag-violet` in `styles.css`.
  - Works with no account → matrix row "Guest list, CSV/XLSX import & export" ✅ guest.
  - **Not claimed:** importing brackets, a child menu, child pricing, high chairs (see the two extra
    entries under *Do not claim*). The film never says what the kids cost or eat.
  - Lines checked against `existing-films.md`: hook, payoff, CTA and every age string are unburned.
    **Flagged:** the guest rows carry *„Przy stole: Stół 5”* and the chip row carries *„Wszyscy 58”*,
    both on the burned list from the kitchen-report cut. They are incidental panel chrome here, the
    way the toolbar's *„Siatka”* is in every planner shot, and no beat rests on them — but this is
    the call `existing-films.md` does not make for us. See open question 5.

---

## 3. `odd-room` — "our room isn't a rectangle" (landing loop)

Carried forward from `16x9-only-2026-09-16.md`, unbuilt, re-verified. One correction to its
assumptions: `pickPreset` goes through `setHallShape`, which **re-clamps the hall's entities into the
new outline** (`HallPanelContent.tsx`), so a table standing in the quarter about to be cut away would
jump. The brief's requirement that the top-right quarter stay empty is therefore load-bearing, not
cosmetic.

- **Compositions:** `easywed-shape` (1920×1080). Studio folder "Shape": `ShapeHook`, `ShapeL`,
  `ShapeEdit`.
- **Duration:** 360f = 12 s. `SHAPE_SCENES` 105 + 150 + 135 = 390; `SHAPE_TRANSITION = 15` × 2 →
  **360**. The last 15 frames of `ShapeEdit` are `LoopSeam` onto `ShapeHook`'s frame 0.
- **Aspect:** 16:9 only. A 9:16 twin would need a tall L hall as well; not planned.
- **The idea:** the outline is yours to draw, so an L-shaped room is planned as an L instead of a
  rectangle you plan around.
- **Hook (0–45f, verbatim):** *„Sala nie jest prostokątem?”* (EN: *"Your room isn't a rectangle?"*)

| frames | on screen | copy |
|---|---|---|
| 0–105 | `ShapeHook` — `L_HALL` drawn as a plain rectangle, every table and the dance floor clear of the top-right quarter. The hall panel is open on the right: name, *Piętro*, then the four-button *Kształt sali* group with *Prostokąt* filled. Frame 0 is clean; the hook fades in by frame 12; the cursor reaches the shape group by frame 90. | *„Sala nie jest prostokątem?”* · panel *„Kształt sali”*: *„Prostokąt”* · *„Kształt L”* · *„Kształt U”* · *„Niestandardowy”* |
| 90–240 | `ShapeL` — *Kształt L* is pressed and fills; the outline animates to `verticesForHallPreset("l-shape")` — the top-right quarter cut away — and the ruled grid clips to it. Nothing else moves, because nothing was standing there. The hint and *Edytuj obrys* appear under the group; the cursor presses the button and vertex handles come up. | *„Kształt L”* · *„Przeciągnij punkty obrysu sali, aby dopasować go do lokalu.”* · *„Edytuj obrys”* |
| 225–360 | `ShapeEdit` — one vertex, the notch's `(w, 0.5h)` corner, is dragged a metre **outward** so the room only grows and no entity is re-clamped. Its two edges follow, one of them slanting, which is what a free polygon does. Payoff lands; the last 15f dissolve back to the rectangle at frame 0. | **„Ściany tam, gdzie naprawdę stoją.”** |

- **`L_HALL` must come to 58 seats** like `WIDE_HALL` and `TALL_HALL`, keep the half-metre clearances
  their comments promise, and keep every table, seat ring and fixture inside the L — including after
  the vertex drag.
- **Do not show vertex snapping or orthogonal auto-correction** unless it is verified at the tag
  first; the brief assumes a free drag.
- **CTA:** none. This is a page loop: the section's own copy and the hero's *„Wypróbuj bez konta”*
  are the CTA.
- **App surface:** the hall panel (`hall.shape` group, hint, *Edytuj obrys*) and polygon shape-edit
  on the canvas.
- **Reuses:** `PlannerCanvas`, `PlannerTable`, `Cursor`, `Icon`, `rosterFor`, `LoopSeam`.
- **Genuinely new:** polygon walls in `HallCanvas.tsx` (it draws `<rect>` walls today, and the grid
  has to clip to the polygon), `L_HALL` in `layouts.ts`, `HallPanel.tsx`, `VertexHandles.tsx`. This
  is the M–L, and the reason it ships third.
- **Caption / page text:** no caption surface. `<video muted autoplay loop playsinline>` with
  `aria-label="Plan sali w easywed: prostokątna sala zmienia kształt na L, a punkt obrysu zostaje
  przeciągnięty ręcznie."`
- **Success signal:** `table_added` / `tables_batch_added` from sessions that entered from the page.
  There is no hall-shape event in `AnalyticsEvents` and none may be invented.
- **Claim check:**
  - Custom polygon halls and presets → `v1-facts.md` "custom polygon halls"; `hall.shape`,
    `hall.preset.rectangle|l-shape|u-shape|custom`, `hall.shape.edit_button`,
    `hall.shape.polygon_hint` in `pl.json`; `HallPanelContent.tsx`.
  - The L geometry on screen is the app's own → `verticesForHallPreset` in `src/lib/geometry.ts`
    ("Top-right quarter cut out"), spanning the hall's AABB exactly.
  - Hand-edited vertices → the hint's own wording, `openShapeEdit(hallId, "hall")`,
    `ShapeEditOverlay.tsx`. **Not claimed:** importing the venue's floor plan or any venue template
    (section 4, `landing.steps.one.desc`).
  - Works with no account → matrix row "Halls, tables, fixtures, seating" ✅ guest.
  - Lines checked against `existing-films.md`: none burned.

---

## 4. `square-cuts` — the 1:1 branch, then two feed cuts

> ⚠️ **This is the `useFormat()` third-branch item from section 5, priced as real work.**
> `src/easywed/format.ts` derives `tall = height > width` and hands back `WIDE_HALL` or `TALL_HALL`.
> A 1080×1080 composition is neither: it falls to the landscape branch and renders a 22 × 14 m room
> letterboxed into a square. Doing it properly means a third branch, a third type scale, and a
> **third hall plan** — `SQUARE_HALL`, which must also come to **58 seats** so every count still
> agrees across cuts — plus a re-check of every scene's stacked-vs-beside layout in all three films
> that use `useFormat()` today and the two this plan adds.

- **Compositions:** `easywed-swap-square` and `easywed-kids-square` (both 1080×1080, 510f each —
  same scene arithmetic as briefs 1 and 2, since the scenes are shared and only the size changes).
- **Aspect:** 1:1.
- **The idea:** nothing new. These are the two social films in the shape a Facebook/Instagram feed
  post wants, and the branch that makes any future 1:1 cut free.
- **Hook, beats, CTA, captions:** exactly briefs 1 and 2. A square cut is not a different film and
  must not get different copy.
- **Which surface:** as briefs 1 and 2.
- **Reuses:** everything from briefs 1 and 2.
- **Genuinely new:** the `square` branch in `format.ts`, its type scale, `SQUARE_HALL` in
  `layouts.ts` (58 seats), and the layout re-check across `Film.tsx`, `Teaser.tsx`, `ImportExcel`,
  `KitchenReport`, `swap` and `kids`.
- **Why it is fourth, not first:** it is the only item in this plan whose cost is structural rather
  than creative, and `format.ts` is the one seam every film reads. If the answer to open question 4
  is "let the platform crop the 9:16", this brief disappears and the series gets three weeks shorter.
- **Success signals:** as briefs 1 and 2.
- **Claim check:** no new claims — `SQUARE_HALL` is a layout, and `58` stays the repo's own
  `totalSeats`, not a statement about users. Every copy line is brief 1's or brief 2's, already
  checked there.

---

## 5. `walkthrough-long` — the 64-second tour (YouTube)

Seeded from the existing 840f `easywed-demo`: its five scenes stay, and this plan's chapters slot in
between them. It reprises **no** burned beat — no import wizard, no printed report, no measuring —
so it is a genuinely different film from the three that shipped, at the cost of not showing a YouTube
viewer the two things they may most expect (open question 3).

- **Composition:** `easywed-walkthrough` (1920×1080). No vertical twin at this length.
- **Duration:** 1920f = 64 s. Twelve sequences at `TRANSITION = 15`:
  `intro 120 + hall 210` (existing) `+ floors 240` (new) `+ shapeL 150 + shapeEdit 135` (brief 3)
  `+ guests 180` (existing) `+ kidsTag 180 + kidsCount 150` (brief 2) `+ seating 240` (existing)
  `+ swapPick 180 + swapReseat 150` (brief 1) `+ outro 150` (existing layout, new copy) = 2085;
  11 seams × 15 = 165 → 2085 − 165 = **1920**.
- **Aspect:** 16:9.
- **The idea:** one empty room becomes a shaped, two-floor, fully seated plan that survives someone
  changing their mind — and nothing is signed up for along the way.
- **Hook (0–45f, verbatim):** *„Pusta sala, lista gości i żadnego planu?”* — replacing the intro's
  current copy; the logo build itself is reused unchanged.

| frames | scene | on screen / copy |
|---|---|---|
| 0–120 | `Intro` (reused) | logo build · *„Pusta sala, lista gości i żadnego planu?”* |
| 105–315 | `Hall` (reused) | *Sala główna* sketched, unchanged |
| 300–540 | `Floors` (new) | the halls panel: its hint, the *Sala główna* row, then *Dodaj salę* → a second hall named *Sala 2*, *Piętro* set to `1`, its row showing *p. 1*; the new hall dragged by its label beside the first and given a parkiet and a bar — **no tables**, so `58` stays the wedding's seat count. Line: *„Obiad na dole, tańce na górze?”* |
| 525–675 | `ShapeL` (brief 3) | *Kształt L* on *Sala 2*, the outline cut back |
| 660–795 | `ShapeEdit` (brief 3, `loop={false}`) | one vertex dragged · *„Ściany tam, gdzie naprawdę stoją.”* |
| 780–960 | `Guests` (reused) | **its subtitle must be replaced first** — see Findings 1 |
| 945–1125 | `KidsTag` (brief 2) | *Grupa wiekowa* on two guests, the *Dzieci* chip appearing |
| 1110–1260 | `KidsCount` (brief 2) | *Dzieci 5*, the filtered list · *„Każde dziecko policzone.”* |
| 1245–1485 | `Seating` (reused) | seating the room, unchanged |
| 1470–1650 | `SwapPick` (brief 1) | Maria taken into Stół 4's full seat |
| 1635–1785 | `SwapReseat` (brief 1) | Michał reseated from *Bez stołu* · *„Nikt nie znika z planu.”* |
| 1770–1920 | `Outro` (reused layout, **new copy**) | headline *„Wasza sala, Wasi goście, jeden plan.”* · no feature list · `CallToAction` action *„Narysujcie swoją salę”* over the pill |

- **The outro's feature list goes.** It holds burned lines, *„Planujcie razem”* (account-gated, and
  the film shows no invite) and *„Eksport PDF do druku”* (which edges toward the PDF-file claim the
  kitchen-report cut deliberately avoided).
- **`Sala 2` carries fixtures only.** Tables there would add seats and break the `58` every other cut
  states. It also keeps the L's cut quarter empty for free, which `setHallShape`'s re-clamping needs.
- **The chapters run in one continuity:** *Sala główna* is sketched, *Sala 2* is added and shaped,
  then the guest work happens back in *Sala główna*. The kids and swap scenes must therefore accept a
  hall prop rather than reading `useFormat().hall` blindly, or the chapter order has to be respected
  by the scenes themselves — decide that when brief 1 is built, since it is the first to need it.
- **CTA:** *„Narysujcie swoją salę”* + the `easywed.app` pill.
- **App surface:** planner canvas, halls list and hall panel, shape edit, guest panel, edit-guest
  dialog, seat popover.
- **Reuses:** all five existing walkthrough scenes, the six chapter scenes from briefs 1–3,
  `CallToAction`.
- **Genuinely new:** `FloorsScene` + `HallsPanel.tsx` (the list rows with their `p. 1` suffix and
  `{w}×{h} m · N elementów` line), and the small second hall layout.
- **YouTube title:** *easywed. — plan stołów weselnych: od pustej sali do rozsadzonych gości*
- **YouTube description:** *easywed. to planer rozsadzenia gości weselnych w przeglądarce. W 64
  sekundach: rysujecie salę w jej wymiarach, dodajecie drugą salę na piętrze i nadajecie jej kształt
  lokalu, wpisujecie gości razem z dietami i przedziałami wieku, sadzacie wszystkich i przesadzacie
  jedną osobę bez rozsypywania planu. Tryb gościa działa bez zakładania konta i jest bezpłatny dla
  par - plan zapisuje się na tym urządzeniu. easywed.app*
  `#planwesela #rozsadzeniegosci #planstolow #slub2026 #weselnestoly`
- **Success signals:** `table_added`, `guest_added`, `guest_seated`, and `local_wedding_migrated`
  later, for the viewers who keep the plan.
- **Claim check:**
  - Multi-hall and multi-floor → `hall.add`, `hall.floor`, `hall.floor_short`, `hall.list_hint`,
    `hall.unnamed_index`, `hall.entity_count_*` in `pl.json`; `HallsPanelContent.tsx`,
    `HallPanelContent.tsx`, `HallView.tsx`; `v1-facts.md` "Multi-hall and multi-floor". Halls really
    do render together and really are dragged by their label — `hall.list_hint` says so.
  - Free for couples → `terms.fees.c1`. The description says nothing about planners
    (`terms.technical.c6`).
  - "plan zapisuje się na tym urządzeniu" → `guest_mode.banner`; no cross-device claim anywhere.
  - Chapters → the claim checks of briefs 1–3.
  - **Not claimed:** no invite link, no member roles, no AI, no reminders, no export — nothing this
    film does not show. The intro's logo build and the `Hall` / `Seating` subtitles are the seed
    film's own copy, reused by design.

---

## Build order

| step | work | effort | unblocks |
|---|---|---|---|
| 1 | Per-seat fill in `HallCanvas` + `SeatPopover.tsx`, then ship `seat-swap` (9:16, 16:9, and the no-CTA loop) | M — the per-seat prop is the risky half | brief 1, and two walkthrough chapters |
| 2 | Promote `GuestList` to `components/`, add the violet badge + `Dzieci` chip, `EditGuestDrawer.tsx`, `kids-count/guests.ts`, then ship `kids-count` | M | brief 2, and two walkthrough chapters |
| 3 | Polygon walls + clipped grid in `HallCanvas`, `L_HALL` (58 seats), `HallPanel.tsx`, `VertexHandles.tsx`, then ship `odd-room` | M–L | brief 3, and two walkthrough chapters |
| 4 | Fix `GuestsScene.tsx:173` in both languages and re-render `easywed-demo` (Findings 1) | S | the walkthrough, and the published film |
| 5 | `square` branch in `format.ts` + `SQUARE_HALL` (58 seats) + layout re-check across all films, then the two square cuts | **L** | brief 4, and every future 1:1 |
| 6 | `FloorsScene` + `HallsPanel.tsx`, re-copy `Outro`, assemble `easywed-walkthrough` | L, mostly assembly by then | brief 5 |

Steps 1 and 3 both touch `HallCanvas.tsx`, and step 5 touches `format.ts` — the two files every
shipped film renders. Take them one at a time, on their own branches, and after each one run
`npm run lint` plus `npx remotion still` on a frame of `easywed-demo`, `easywed-teaser`,
`easywed-import`, `easywed-report` and `easywed-scale` to prove nothing moved. Every new string goes
into `src/easywed/i18n.ts` in **both** `pl` and `en` (a missing key fails `tsc`), and each shipped
film adds its beats and lines to `references/existing-films.md` — `/video-build` does that.

## Findings

1. **`src/easywed/scenes/GuestsScene.tsx:173` still carries the plus-one over-claim**, now in two
   languages: `i18n.ts` has `demo.guests.subtitle` as *„Diety, osoby towarzyszące i przypisane
   miejsca są zawsze przy nazwisku - koniec z trzema arkuszami naraz.”* and the English
   *"Dietary needs, plus-ones, and seat assignments…"*. Flagged on 2026-09-11 and again on
   2026-09-16; unchanged. There is no plus-one field at v1, and now there is a better replacement
   than the one previously suggested, because the field it names exists: *„Diety, grupy wiekowe i
   przypisane miejsca są zawsze przy nazwisku - koniec z trzema arkuszami naraz.”* /
   *"Dietary needs, age groups, and seat assignments live next to every name…"* — backed by
   `guests.add.age_group` and `lib/ageGroup.ts`.
2. **`references/existing-films.md` has drifted from `i18n.ts` on the report cut's lines.** The file
   quotes *„Florystka pyta, gdzie rozłożyć winietki.”* and *„Kuchnia pyta, ile dań wege.”*; the
   repo renders *„Florystka pyta, jak rozłożyć winietki.”* and *„Kuchnia pyta, gdzie podać dania
   wege.”*. Both variants should be treated as burned, and the file corrected to what actually
   renders.
3. **`existing-films.md` still omits two on-screen subtitles** from the walkthrough —
   `demo.hall.subtitle` and `demo.seating.subtitle` — noted in the 09-16 plan and still missing.
4. **`render:all:vertical` in `package.json` is still identical to `render:all` minus the loop.**
   Probably not intended; it also now misses `render:to-scale`.
5. **The landing page still has no 16:9 slot.** The hero's `PlannerPreview` is `aspect-4/3`, and
   `LocaleLanding` is hero → features → steps → venues banner → CTA. `to-scale` shipped as a file;
   putting it, or `seat-swap`'s loop, or `odd-room` on the page is work in
   `typescript/easywed/src/components/landing/` that no plan in this directory has priced.

## Open questions

1. **Channel priority and cadence.** Is this Reels-first or TikTok-first, and do you want one film a
   week in the order above, or all of briefs 1–3 before the first post? The build order assumes
   ship-as-you-go, one brief per `/video-build` pass.
2. **Budget.** Everything here is organic-shaped and silent. If there is ad spend, say so: a paid
   placement wants a 6-second bumper cut of `seat-swap`, which is a different scene plan, not a trim.
3. **The walkthrough and the burned beats.** This plan's 64-second tour deliberately skips the import
   wizard, the printed report and the measure tool because those beats are spent. A YouTube viewer
   arguably expects exactly those three. Should the walkthrough be granted an explicit exception to
   `existing-films.md` — reusing the shipped scenes as chapters — which would also make it far
   cheaper to build?
4. **Is 1:1 worth the `format.ts` cost** (brief 4), or should feed posts use the 9:16 cut and let the
   platform crop? Dropping brief 4 removes the only structural cost in this plan.
5. **Guest-panel chrome.** `existing-films.md` lists the guest list's own strings (*„Wszyscy 58”*,
   *„Przy stole: Stół 5”*, *„Rozsadzeni”*) as burned, but they appear in any shot of that panel, the
   way *„Siatka”* appears in any shot of the canvas. May incidental panel chrome recur when the beat
   and the meaningful copy are new — as brief 2 assumes — or should a second guest-list film be
   ruled out entirely?
6. **Landing placement** (Findings 5). Does `seat-swap`'s loop go on the page beside `to-scale`, does
   `odd-room` get a band of its own, and who does the `LocaleLanding` change?
7. **Measuring any of this.** `AnalyticsEvents` has no event for a video being watched, and this plan
   may not invent one. Is a before/after read of `table_added`, `guest_added` and `guest_seated`
   around each post good enough?
