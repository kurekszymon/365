# What is true at easywed v1.1.2

Section 3 of the `video-plan` skill. Confirmed selling points — **this is the whole pool of real
material** a video may draw on. Anything not here or in the skill's section 2 reading is not
established; check it before it reaches a brief, and check it against the do-not-claim list in
`SKILL.md` section 4, which is where the near-misses live.

Written against the `easywed/v1` tag and re-checked at `easywed/v1.1.2`. Between the two, `src/`
changed only under `components/landing/`, the landing's routes and SEO, and the locale files - no
planner, store, dialog or analytics code - so every mechanism below holds as written. The quoted
strings were re-read at v1.1.2; eight of them had changed. When the product is tagged again, this
file and the tag named in section 2 both need updating — nothing will warn you. Start from
`git diff --stat <old> <new> -- src`.

- **The full planner with no account at all.** `/wedding/local` auto-seeds a hall; there is nothing
  to sign up for, no email, no wall. `PUBLIC_PATHS` in `AuthGate.tsx` lists it; it deliberately has
  no `requireAuth` in `beforeLoad`.
  - **The canvas's empty state never reaches a couple.** `Canvas.tsx` renders `hall.empty_state`
    (*„Zacznij od ustawienia sali”*) only when `halls.length === 0`, and
    `/wedding/local` seeds `DEFAULT_HALL` whenever there is none (`routes/wedding.local.tsx`,
    "Guest-mode counterpart of seedDefaultHall"), as a signed-in wedding gets one at creation. A new
    plan therefore opens on an **unnamed 20x12 m rectangle** (`DEFAULT_HALL` in
    `stores/planner.store.ts`), its chip reading *„Sala · 20×12 m”* (`hall.unnamed`). A film that
    starts from nothing starts there, not on the empty-state line.
- **Free for couples**, stated contractually rather than as a promotion — `terms.fees.c1`.
- **A metric, to-scale floor plan** — `PX_PER_M = 60`, a measuring tool (`measure.*`), snapping
  (`canvas.snap.*`), a 1 m ruled grid with a firmer 5 m ruling.
  - How the measure tool actually runs (`planner/Canvas/useMeasureTool.ts`, `CanvasToolbar.tsx`,
    `MeasureOverlay.tsx`, `StatusBar.tsx`): *Mierzenie* toggles it, and while it is on a mode
    switch joins the **end** of the toolbar row, after *Miejsca*, reading *„Środek”* by default
    (`view.store.ts` `measureMode: "center"`, persisted) or *„Krawędź”*. In border mode a click
    **inside** a table or fixture snaps to its nearest edge (`nearestCircleBorder` /
    `nearestRectBorder`), and the pending start point turns to face the pointer as it moves off a
    table. A saved measurement is a dashed teal (`#0d9488`) line with end dots, a label
    `${d.toFixed(2)} m` - decimal point, not comma - and a small delete ✕, and stays drawn after
    the tool is switched off. On desktop only, a pill at the bottom reads
    *„Kliknij na sali, aby umieścić punkt pomiaru”* or, once a first point is down,
    *„Kliknij ponownie, aby ustawić punkt końcowy”*, followed by an `Esc` key and
    *„Esc, aby wyjść”* (`statusbar.esc_to_exit`; v1 had no comma).
- **Seat-level assignment straight off the canvas**, and nobody silently double-booked.
  - The popover (`planner/Canvas/SeatAssignPopover.tsx`, opened from a marker in `TableSeats.tsx`):
    a search field (`tables.guests_search_placeholder` *„Szukaj gości”*, a plain lowercased
    `includes` on the name with no diacritic folding, `autoFocus`ed so keys land without a click,
    and applied before grouping - so it narrows **every** section, the occupant's own included;
    the demo roster's `maria` and `michał` each leave exactly one row), *„Zwolnij miejsce”* (`seats.clear`) only when
    the chair is taken, then guests in **four fixed sections** - `seats.group_selected`
    *„Aktualnie na tym miejscu”*, `seats.group_table` *„Przy tym stole”*, `seats.group_unassigned`
    *„Bez stołu”*, `seats.group_elsewhere` *„Przy innym stole”*. The order never changes; empty
    sections are dropped (`.filter((section) => section.items.length > 0)`), so *„Bez stołu”* leads
    only when nobody else is at that table. Rows in the last section carry the amber
    `border-amber-300/80 bg-amber-50/70 text-amber-900` - the "this moves them" affordance. The
    list is a `max-h-52` scroller inside a `w-64` popover, `side="top"`.
  - What a pick does (`assignGuestToSeat` in `stores/planner.store.ts`): bringing in a guest from
    **outside** a table that is already **full** sets `occupantLeavesTable`, and the displaced
    occupant is written `tableId: null, seatId: null` - they become unassigned and show up under
    *„Bez stołu”*, rather than vanishing. Any other case (the guest was already at that table, or
    the table had room) merely clears the occupant's pin and leaves them at the table.
    `track("guest_seated", { source: "canvas_seat", displaced })` is fired by the popover itself.
  - **The guest list seats a guest too** (`Guests/SeatAssignSheet.tsx`, "Guest-first counterpart
    to `Canvas/SeatAssignPopover`"), opened by the row itself or its utensils button
    (`guests.assign.action` *„Posadź gościa”*, the first of the row's three buttons, before the
    pencil and the bin). One sheet, two steps: *„Posadź: {{name}}”* over an outline button per
    table in store order, `count/capacity` on the right and **disabled** once
    `count >= table.capacity` (the count leaves out the guest being seated); then the picked
    table's name with a back arrow over a `grid-cols-4` of seat cards - a taken chair is muted
    initials over the truncated name, a free one a dashed number over *„Wolne miejsce”*, the
    guest's own current chair *„Obecne”* - and a footer button, *„Wybierz miejsce”* (disabled)
    until a chair is picked, then *„Posadź na miejscu {{n}}”*. It offers only free chairs, so it
    never displaces anyone: `track("guest_seated", { source: "guest_list", displaced: false })`.
    Which chair a seated guest holds is `resolveSeatOccupants` (`lib/seats.ts`): a guest pinned
    to a `seatId` keeps it, the rest fill the free chairs in list order - so a gap between two
    taken chairs exists only when the guests round it were pinned (seated from the canvas).
  - The utensils button's pulsing ring (`seatHint`, `animate-pulse ring-2`) is onboarding's
    "seat everyone" hint: it lights **every** row's button for 2.6 s, not one guest's.
  - A marker shows the occupant's initials once it is 14 px or larger (`getInitials`, `seatSizePx`),
    and is inert - no drag, no popover - while the measure tool is on or the viewer cannot edit.
- **A table dragged across the room takes its guests with it** (`Canvas/useTableSnap.ts`,
  `Canvas/TableVisual.tsx`, `stores/planner.store.ts`). While it is dragged the table - seat markers
  included, since `TableSeats` renders inside `TableVisual` - follows the raw pointer delta as a
  `translate3d`, raised above its neighbours (`zIndex: 30`); on drop `snapPositionToGrid` rounds its
  **top-left corner** (`position` is the top-left, `left: position.x * ppm`) to the snap step,
  clamps it into the hall under its centre, and `updateTablePosition` rewrites only `position` /
  `hallId`. Guests point at the table by `tableId` / `seatId`, so nobody is unseated. Moving a table
  fires **no** analytics event at the tag, and `wedding_created` is `{ source: "wedding_list" }` - a
  signed-in action, so a guest-mode film cannot name it as its success signal.
  - A seat marker's initials are `getInitials` (the first letters of the first two words,
    uppercased), white, `font-medium`, `fontSize: Math.max(7, seatPx * 0.42)`, shown once
    `seatSizePx(ppm) = clamp(ppm * 0.34, 12, 44)` reaches 14 px (`Canvas/TableSeats.tsx`). A table's
    name is `text-xs` Playfair, `truncate`d to the table's width, over its `N / capacity` count.
  - How a table changes shape (`EntityForms/TablePanelContent.tsx`, `fields/*`,
    `Canvas/seatLayout.ts`, `Canvas/Canvas.tsx`, `Canvas/DraggableTable.tsx`): a **first tap
    selects** a table - the selection ring and a toolbar over it (on a phone a pen,
    `tables.edit`, then copy, duplicate and a red delete, icons only) - and a second tap, or the
    pen, opens the form; the same flow on touch and pointer. The form runs *„Nazwa”*
    (`common.name`), *„Kształt stołu”* - a two-button group, *„Prostokątny”* then *„Okrągły”*;
    **only those two** (a custom table comes only from an import and reads
    `tables.shape.custom_readonly` instead) - then *„Średnica”* for a round table, or
    *„Szerokość”* and *„Wysokość”* side by side and *„Orientacja”*'s one outline button
    *„Obróć o 90°”* for a rectangular one; *„Liczba miejsc”*; `TableSeatMap`, a live diagram with
    each taken chair's initials; *„Przypisz gości”*; and the per-seat list. A round table is
    stored `width = height = Ø` and the form keeps `width`/`height` across the shape switch, so
    *Prostokątny* makes a **square of the same size**. *Obróć o 90°* toggles `rotation` 0/90 and
    **swaps the two fields' values**. Every edit keeps `position` - the table's **top-left
    corner** - so a table grows and turns out of that corner. Guests stay at the unchanged
    capacity (`applyToStore` slices to it), and a rotation drops only seat *position overrides*
    (`updateTable`). A rectangle seats its two longer edges - top then bottom, or left then right
    once it stands taller than wide - each run top-to-bottom / left-to-right. Shape and rotation
    save on the tap (`updateAndCommit`), and dimensions preview live and save on blur. No
    analytics event fires for any of it (there is no `table_updated`).
  - On a phone that form is `MobilePanelDrawer` at its `max-h-[85dvh]`: the form is taller than
    that, so the sheet stands at 85% of the viewport over a `bg-black/40` overlay and **covers the
    whole canvas** - the change shows live in the form's own `TableSeatMap`, not on the plan,
    until the check (`common.done`) closes it. The round preset *„Okrągły 8”* is
    Ø **1.5 m** (`TABLE_PRESETS`), which no film room matched until `TABLE_SHAPE_HALL`.
- **Tables in bulk, and the room's furniture, on a desktop** (`Canvas/Canvas.tsx`,
  `EntityForms/TableBatchPanelContent.tsx`, `planner.store.ts` `addTables`, `Sidebar/*`,
  `EntityForms/AddHubContent.tsx`, `addPresets.ts`).
  - A right-click on an empty spot in a hall opens the canvas menu with *„Dodaj stół”*, *„Dodaj
    stoły”*, *„Dodaj element”*, then a *„Widok”* section (*Styl siatki*, *Odległość przyciągania*,
    *Miejsca*, *Mierzenie*); the copy/paste rows appear only on a table or fixture, or with
    something on the clipboard. The click point is snapped to the grid first. *„Dodaj stoły”* is
    the **only** way into the batch form (`openTablesBatchAdd`, `Canvas.tsx:430`), so bulk tables
    are a desktop beat. *„Dodaj element”* there does **not** open the add hub: it drops a bare
    `DEFAULT_FIXTURE` (unnamed 2x1 m rectangle) at the click and opens its form.
  - The batch form, titled *„Dodaj stoły”*, opens on `INITIAL_FORM`: `DEFAULT_TABLE`'s
    **rectangular 2x1 m**, 8 seats, and *„Ile”* 2. *Okrągły* keeps the width, so *Średnica* reads 2.
    The button is `tables.add_many` pluralised on the count (*„Dodaj 2 stoły”*, *„Dodaj 1 stół”*,
    *„Dodaj 10 stołów”*); `MAX_BATCH_COUNT = 50`. On submit the dialog does **not** close: it
    switches to *Edytuj stół* for the first new table (`openTableEdit(ids[0])`).
  - `addTables` lays them row-major from the snapped click, each top-left a footprint plus
    **0.5 m** from the last, as many columns as fit `hallWidth - start.x` and rows as fit
    `hallHeight - start.y`, and **silently caps** the batch there (`tables_batch_added { shape,
    requested, created }` records the shortfall). A batch with no name leaves the tables unnamed:
    the canvas then draws only `N / capacity` (`TableVisual` shows a name only when `hasName`),
    while the rail's list calls them *Stół N*. At 0.5 m apart, two neighbours' seat markers
    (0.3 m off the edge, `SEAT_OFFSET_M`) overlap - but **seats are off by default**
    (`view.store` `showSeats: false`), so a fresh plan shows none.
  - The add hub on a desktop is `Sidebar/AddEntityDialog`, *„Dodaj do sali”*, reached only from
    the rail: its *Stoły* / *Elementy sali* tab opens a 400 px panel **over** the canvas
    (`SidebarRail`) whose outline *„Dodaj element”* opens the hub pre-filtered to that tab. The
    rail's own label for fixtures is *„Elementy sali”* (`t("fixtures")`). A card inserts its
    preset **centred** in the hall and opens *Edytuj element* (`openFixtureEdit`); dragging it
    then snaps its top-left to the step and clamps it into the hall, so a fixture dragged onto a
    wall ends flush against it. Presets: *Scena* 3x1.5, *Parkiet* 3x3, *Bar* 2.5x1, *Stoisko DJ-a*
    1.5x1 (*DJ Booth* at v1), *Wejście* 1x0.3 (`rounded`), *Niestandardowy* - a starter polygon.
- **Multi-hall and multi-floor** (`hall.floor`, `hall.list_title`), plus custom polygon halls and
  fixtures — stage, dance floor, bar, DJ booth, entrance, or a shape drawn by hand
  (`fixtures.preset.*`, `fixtures.shape.polygon`).
  - How a second hall is added (`EntityForms/HallsPanelContent.tsx`, `stores/planner.store.ts`):
    *Skonfiguruj salę* opens the same centred modal on the halls list, titled *„Sale”*
    (`hall.list_title`) - the `hall.list_hint` line, one bordered row per hall (name, then
    *„p. 1”* from `hall.floor_short` when a floor is set; `{w}×{h} m · N elementów` under it,
    counting tables and fixtures, the dance floor being a fixture), and an outline *„Dodaj salę”*.
    Pressing it runs `openHallEdit(addHall(DEFAULT_HALL))`: the dialog switches straight to the
    new hall's settings, so the list never shows the new row until it is reopened.
    `DEFAULT_HALL` is **unnamed** (`name: ""`, so the name field shows *„np. Sala główna”*, the
    list says *„Sala 2”* via `hall.unnamed_index`, and the canvas chip says *„Sala”* via
    `hall.unnamed`), a `rectangle`, **20×12 m**. `nextHallPosition` places it: an odd hall count
    puts it beside the last hall with `HALL_GAP = 3` m between them, an even count starts a new
    row under everything - so a second hall needs no dragging. The canvas chip reads name,
    floor, size: *„Sala · p. 1 · 20×12 m”* (`Canvas/HallView.tsx`).
  - On a phone (`useIsMobile`, below `md`) the same forms open in `EntityForms/MobilePanelDrawer`,
    a bottom sheet with the same title and black check, not `Sidebar/EntityEditDialog`
    (`Planner.tsx`: `{!isMobile && <EntityEditDialog />}`, `{isMobile && <MobilePanelDrawer />}`).
    Shape editing closes the sheet so the handles are reachable. The canvas toolbar is desktop-only
    (`Canvas.tsx`: `{!isMobile && <CanvasToolbar />}`): a phone reaches grid, snap, seats and the
    measure tool through the long-press `CanvasViewMenu`, which has **no** *Środek* / *Krawędź*
    mode switch - so edge-to-edge measuring is a desktop beat.
  - How a hall changes shape (`EntityForms/HallPanelContent.tsx`, `Canvas/ShapeEditOverlay.tsx`,
    `Canvas/ShapeEditToolbar.tsx`, `lib/geometry.ts`): on desktop the hall's settings are a
    **centred modal** (`Sidebar/EntityEditDialog`, `sm:max-w-md`, a `bg-black/10` scrim with
    `backdrop-blur-xs`), not a side panel - opened from the hall's label chip or *Skonfiguruj
    salę*. Its form runs name, *Piętro*, the four-button *Kształt sali* group (*Prostokąt*,
    *Kształt L*, *Kształt U*, *Niestandardowy*), then - only once the hall has an outline - the
    hint and *Edytuj obrys*. A preset applies instantly through `setHallShape`, which re-clamps the
    hall's entities into the new outline; *Kształt L* cuts the top-right quarter out of the hall's
    bounding box (`verticesForHallPreset`). *Edytuj obrys* switches the panel to `shape.edit`,
    which the dialog does not host, so the dialog **closes** and a pill floats top-centre over the
    canvas (`shape_edit.hint` + *Gotowe*). Vertex drags **snap** to the canvas snap step
    (`snapStep: 1` by default), preview in the selection colour, and reach the hall only on release;
    a midpoint click adds a vertex, a double-click removes one. No orthogonal correction. There is
    no hall-shape analytics event.
- **CSV and XLSX import** through a column-mapping wizard that survives Polish diacritics, reports
  skipped and overflowed rows, and can seat guests from a table column — `guests_imported`,
  `guests.import.*`, changelog `i3`.
  - How the wizard actually runs (`dialogs/guests/ImportGuestsDialog.tsx`,
    `lib/import/guestsImport.ts`): file → mapping → preview → commit. `autoDetectMapping`
    pre-fills the four fields (`name`, `table`, `dietary`, `note`) from Polish or English headers
    after `normalize` strips diacritics and maps `ł` → `l` (*Gość*, *Stół*, *Dieta*, *Uwagi* all
    match). Table names join to existing tables through the same `normalize`, and only while the
    table has capacity left — the rest count as `overflowed`. *„Do zaimportowania: N gości”*
    (`guests.import.summary`) sits on the **preview** step after *Dalej*, not on the mapping step.
    On a phone the dialog is a bottom-sheet drawer (`ui/responsive-dialog.tsx`).
  - The rail's and the phone tab bar's badges are `useTabBadgeCounts` (`Sidebar/tabs.ts`):
    **guests counts the unseated**, reminders the open ones, tables and fixtures are plain totals
    (the dance floor is a fixture), and a zero draws no badge. A guest row with no table carries
    the `bg-accent` pill *„Bez miejsca”* (`guests.status.unseated`) where a seated one reads
    *„Przy stole: …”* (`Guests/GuestListContent.tsx`).
  - `guests.import.drop_here` is *„Przeciągnij tutaj plik .csv lub .xlsx lub kliknij, aby
    wybrać”*; the progress card is `guests.progress` *„Rozsadzeni”* beside
    `guests.seated_ratio` *„{{seated_count}}/{{count}} gości przy stołach”* — two strings, not
    *„Rozsadzeni 58/58”*.
- **A printable plan and guest list** — the venue/kitchen report, with diets and headcount.
  `plan_printed`, `export.pdf.*`, changelog `i6`. It is the browser print dialog, not a generated
  file; see section 4.
  - What the page actually holds (`planner/PlannerPrintView.tsx`, A4 landscape per `styles.css`
    `@page`): a cover - *easywed.*, the wedding name, *„Data ślubu: {{date}}”*
    (`export.pdf.wedding_date`), then `tables.count` · seated/total `guests` (*„7 stołów · 58/58
    goście”*) and *„Wygenerowano {{date}}”* at the foot; the hall on its own page; then *„Goście”*
    in two columns, one block per table headed `export.csv.section.table` - *„Stół 1 (8/8
    zajętych)”*, not *„Stół 1 · 8 miejsc”* - with numbered lines of the chosen fields joined by
    *„ - ”*. There is no *„Plan rozsadzenia”* title, and no per-diet total: the diets are printed
    per guest, not summed.
  - `DEFAULT_PRINT_FIELDS` (`stores/print.store.ts`) is name + dietary, so diets print by default;
    guests sort alphabetically within a table (`DEFAULT_GUEST_SORT`), tables in numeric order.
  - The export dialog (`dialogs/guests/ExportGuestsPdfDialog.tsx`) is titled *„Wydrukuj plan”*
    and its button reads *„Otwórz okno drukowania”* (`export.pdf.title`, `export.pdf.download`),
    reached from the header's download menu item *„Wydruk”* (`export.format.pdf`). At v1 these
    read *„Eksportuj do PDF”*, *„Pobierz PDF”* and *„PDF”*, which is why no v1 film shows the
    dialog. At v1.1.2 it can be drawn as it is without claiming a file - but not
    `export.pdf.landscape_hint`'s last sentence (*„Możesz tam też zapisać plan jako PDF.”*), which
    describes the browser's dialog, not easywed.
  - Diet tags are free-form; only the presets `vegetarian`, `vegan`, `gluten-free` have labels
    (`lib/dietary.ts`) and reserved tones - green, teal, amber (`--tag-*` in `styles.css`). The
    guest list's filter row offers a diet chip, with its count, only once someone carries it.
  - **One age bracket per guest**, and the kid headcount derived from it (`lib/ageGroup.ts`,
    `dialogs/guests/GuestAgeGroupField.tsx`). `AGE_GROUP_PRESETS` is `adult` / `0-3` / `3-6`
    (*„Dorosły”*, *„0-3 lata”*, *„3-6 lat”*); a guest with no bracket **is** an adult
    (`isAdultAgeGroup`), and only children get a badge (`childAgeGroup`). A bracket the user types
    is kept verbatim after `canonicalizeAgeGroup` trims it and snaps a numeric range to `a-b`,
    capped at 24 characters - `guests.add.age_group_custom_placeholder` is literally *„np. 6-12”*.
    `countKids` counts every bracket whose lower bound is under 18 (`ADULT_AGE`), and a
    non-numeric label counts too; the `Dzieci N` chip (`guests.filter.kids`) appears only once
    someone carries a bracket, exactly as the diet chips do, and `guests.filter.kids_hint`
    explains the rule. The reserved tone is `AGE_GROUP_TONE = "violet"`, `--tag-violet:
    oklch(0.5 0.11 300)` - **#6d5398** as hex. Age brackets are **not** importable: `IMPORT_FIELDS`
    is name / table / dietary / note only. Editing a guest fires no analytics event; there is no
    `guest_updated` in `AnalyticsEvents`, only `guest_added { age_group: "adult" | "preset" |
    "custom" }`.
- **Invite-link collaboration** with owner / editor / viewer roles — `members.role.*`,
  `invite_claimed`. **Account-gated:** `canInvite = Boolean(session) && !isLocalWedding(weddingId)`,
  so a guest-mode video cannot show this without saying so.
  The flow as `mama-link` draws it, with its evidence at the tag:
  - The owner reaches `WeddingMembersDialog` from the header's member stack; its dashed
    `UserPlus` circle (`members.invite` *„Zaproś kogoś”* as a tooltip) is owner-only
    (`MemberAvatars.tsx`). Editors and viewers open the same dialog read-only.
  - `InvitationManager`'s role select offers only *Edytor* and *Tylko podgląd*
    (`members.role.viewer`, *Podgląd* at v1 - the same label is the pending row's `{role}` and
    the member list's), starts on *Edytor*,
    and `handleCreate` sets it **back to *Edytor*** once the new invite is fetched
    (`useWeddingMembers.ts`). The pending row reads *„Zaproszenie linkiem”* over *„{role} ·
    Wygasa {date}”*; *Kopiuj link* flips to *Skopiowano* for 1500 ms.
  - An invite lives **14 days**: `expires_at default (now() + interval '14 days')`, and the token
    is two uuids without dashes, 64 hex characters (`20260422000001_wedding_invitations.sql`).
    The link is `${origin}/invite/${token}`.
  - `/invite/$token` runs `requireAuth`, so a signed-out invitee lands on `/login` first; the
    claim page then shows only *„Dołączanie do wesela…”* (`invite.claiming`, one ellipsis glyph at v1.1.2, three dots at v1) before
    `invite_claimed` fires and it navigates to `/wedding/$id`.
  - A viewer on a phone gets `MobileTabBar` with **four** tabs (the assistant is `canEdit`-only,
    and the tabs read *Goście* / *Stoły* / *Elementy sali* / *Przypomnienia* - not the desktop
    rail's labels), **no `AddFab`**, and no import button in the header. `GuestListContent`
    keeps its search and chips but drops *Dodaj gościa* / *Importuj gości* and every row's seat,
    edit and delete buttons; the row itself is a disabled button that looks unchanged.
  - An **editor** on a phone (the couple, guest mode included) gets **five** tabs -
    `grid-cols-5`, the assistant (`assistant.title` *„Asystent”*) last - while the sheet's pills
    stay four; `AddFab` (`size-14`, `right-4`) on the canvas; import and export as one
    `ButtonGroup` in the header; and in guest mode `GuestModeBanner` (`guest_mode.banner`, with
    *„Zaloguj się”*) above the header - four lines at a phone's width - and the member stack
    collapsed to the owner's dashed invite chip, since a local wedding has no members.
  - A phone's bottom sheet dims the page with `DrawerOverlay`'s plain `bg-black/40`
    (`ui/drawer.tsx`, no override in `styles.css`) and **no blur**; a second sheet opened from
    the first (the seat sheet over the guest list) stacks a second overlay.
  - **No read-only badge on a phone**: `planner.read_only` is only the wedding name's hover
    `title` (`WeddingName.header.tsx`), and `planner.read_only_short` is not rendered in the
    planner at all.
  - The guest search is a fuzzy subsequence match over the normalised name, diet tags and child
    bracket (`GuestListContent.tsx` `fuzzyMatch`); it narrows the list and highlights nothing
    on the canvas.
- **Reminders are a dated to-do list, and nothing notifies** (`components/reminders/*`,
  `reminders.store.ts`, `reminder_created { has_due_date }`). The tab (`reminders.title`
  *„Przypomnienia”*) is `RemindersPanelContent`: an outline *„Dodaj przypomnienie”*
  (`reminders.add`) over `ReminderList`, which renders in insertion order - no sorting. A row
  (`ReminderPreview`) is `bg-muted`, the text over a clock and `format(due, "d MMM yyyy, HH:mm")`
  (*„20 wrz 2026, 18:00”*), `text-destructive` while open and past due (`isPast`, the device's
  clock); the check sets `status: "completed"` - the row **stays**, struck through, its date back
  to grey - and the bin deletes it. The popover (`CreateReminderPopover`, as wide as the trigger)
  is *„Nowe przypomnienie”*, a textarea and a `DatePicker withTime` whose button reads
  `"PPP, HH:mm"` - *„15 października 2026, 12:00”*, the month in full, not the list's short
  form. At v1.1.2 the empty fields read *„Co jest do zrobienia?”* and *„Na kiedy?”*
  (`reminders.create.*`); v1's *„O czym mamy Wam przypomnieć?”* / *„Kiedy Wam przypomnieć?”*,
  which promised being reminded, are gone.
- **BYO-key AI** that can add, move and update tables, fixtures and halls, and can run against a
  local model — `ai_chat_message_sent`, `assistant.setup.llamacpp_*`. The key is the user's own.
- **Privacy posture**: PostHog autocapture off, no cookie banner because there are no cookies to
  consent to, and no guest name ever reaches analytics. The comment at the top of `track.ts`
  explains why the event map is closed; it is the best evidence for this claim.

## Guest mode vs. account, at a glance

`docs/guest-vs-account.md` at the tag is the authority. The short version for video purposes —
everything a brief is likely to show works signed out **except** the last four rows:

| shown in a video | guest | signed in |
| --- | :---: | :---: |
| halls, tables, fixtures, seating | ✅ | ✅ |
| guest list, CSV/XLSX import & export | ✅ | ✅ |
| print / PDF export | ✅ | ✅ |
| AI assistant (own key) | ✅ | ✅ |
| reminders | ✅ | ✅ |
| **inviting members** | ❌ | ✅ |
| **multiple weddings** | ❌ | ✅ |
| **sync across devices** | ❌ | ✅ |
| **roles (editor / viewer)** | ❌ | ✅ |
