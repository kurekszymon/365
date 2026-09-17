# What is true at easywed v1

Section 3 of the `video-plan` skill. Confirmed selling points — **this is the whole pool of real
material** a video may draw on. Anything not here or in the skill's section 2 reading is not
established; check it before it reaches a brief, and check it against the do-not-claim list in
`SKILL.md` section 4, which is where the near-misses live.

Written against the `easywed/v1` tag. When the product is tagged past v1, this file and the tag
named in section 2 both need updating — nothing will warn you.

- **The full planner with no account at all.** `/wedding/local` auto-seeds a hall; there is nothing
  to sign up for, no email, no wall. `PUBLIC_PATHS` in `AuthGate.tsx` lists it; it deliberately has
  no `requireAuth` in `beforeLoad`.
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
    *„Esc aby wyjść”* (`statusbar.esc_to_exit`).
- **Seat-level assignment straight off the canvas**, and nobody silently double-booked.
  - The popover (`planner/Canvas/SeatAssignPopover.tsx`, opened from a marker in `TableSeats.tsx`):
    a search field (`tables.guests_search_placeholder` *„Szukaj gości”*, a plain lowercased
    `includes` on the name with no diacritic folding), *„Zwolnij miejsce”* (`seats.clear`) only when
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
  - A marker shows the occupant's initials once it is 14 px or larger (`getInitials`, `seatSizePx`),
    and is inert - no drag, no popover - while the measure tool is on or the viewer cannot edit.
- **Multi-hall and multi-floor** (`hall.floor`, `hall.list_title`), plus custom polygon halls and
  fixtures — stage, dance floor, bar, DJ booth, entrance, or a shape drawn by hand
  (`fixtures.preset.*`, `fixtures.shape.polygon`).
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
  - The export dialog (`dialogs/guests/ExportGuestsPdfDialog.tsx`) is titled *„Eksportuj do PDF”*
    and its button reads *„Pobierz PDF”* (`export.pdf.title`, `export.pdf.download`), reached from
    the header's download menu item *„PDF”*. A video that must not claim a PDF file cannot show that
    dialog as it is.
  - Diet tags are free-form; only the presets `vegetarian`, `vegan`, `gluten-free` have labels
    (`lib/dietary.ts`) and reserved tones - green, teal, amber (`--tag-*` in `styles.css`). The
    guest list's filter row offers a diet chip, with its count, only once someone carries it.
- **Invite-link collaboration** with owner / editor / viewer roles — `members.role.*`,
  `invite_claimed`. **Account-gated:** `canInvite = Boolean(session) && !isLocalWedding(weddingId)`,
  so a guest-mode video cannot show this without saying so.
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
