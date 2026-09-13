# What already exists — beats and lines not to repeat

Section 6 of the `video-plan` skill. Two films are finished and published. New videos may reuse
components freely; they may not reuse a beat or a line.

Keep this file current: every video that ships adds its beats and its on-screen copy here, or the
next run will rediscover them as fresh ideas.

## The walkthrough — `easywed-demo`, 840f (28 s)

intro → sketch the hall → add guests → seat everyone → outro.
Scenes 120 + 210 + 180 + 240 + 150 at `TRANSITION = 15`.

## The teaser — `easywed-teaser`, 450f (15 s)

the question → the pile of spreadsheets → the room filling itself → the CTA.
Scenes 90 + 100 + 176 + 108 at `TEASER_TRANSITION = 8`.

## The import cut - `easywed-import` / `easywed-import-vertical`, 600f (20 s)

the list in a spreadsheet → the file dropped into the import dialog → columns mapped, preview of
58 → the room seats 58/58 → the CTA.
Scenes 90 + 150 + 180 + 204 = 624 at `IMPORT_EXCEL_TRANSITION = 8` × 3 seams → 600.
Built from `docs/video-plans/full-series-2026-09-11.md`, brief `import-excel`.

## Polish lines already burned on screen

None of these may appear again:

> *"Ile osób siedzi przy stole 4?"* · *"Trzy dni przed weselem."* · *"Arkusz, karteczki i grupa na
> czacie."* · *"Albo jeden plan sali."* · *"Rozsadź gości w jeden wieczór"* · *"Każdy gość na
> właściwym miejscu"* · *"Naszkicuj salę"* · *"Dodaj gości"* · *"Posadź wszystkich"* · *"Za darmo,
> bez zakładania konta."* · *"Plan stołów weselnych - prościej się nie da."*

Also on screen, and equally spent: *"Krok 01/02/03"*, *"Import CSV i XLSX"*, *"Import z CSV lub
Excela"*, *"Eksport PDF do druku"*, *"Plan sali „przeciągnij i upuść”"*, *"Sale i piętra"*,
*"Planujcie razem"*, *"Ciocia Basia NIE obok Marka"*, *"Wujek Janusz - bez glutenu?"*.

From the import cut: *"Twoja lista gości mieszka w Excelu."* - and, as the import wizard and guest
panel show them (app strings, verbatim): *"Importuj gości z pliku CSV lub Excel"*, *"Wgraj plik
.csv lub .xlsx. Wykryjemy kolumny, pozwolimy je dopasować i pokażemy podgląd przed dodaniem."*,
*"Przeciągnij tutaj plik .csv lub .xlsx lub kliknij, aby wybrać"*, *"Wybierz plik CSV lub
Excel"*, *"Dopasuj każde pole do kolumny z Twojego pliku."*, *"Do zaimportowania: 58 gości"*,
*"Dodaj 58 gości"*, *"+52 więcej wierszy"*, *"Brak gości."*, *"Rozsadzeni"* ·
*"58/58 gości przy stołach"*. The spreadsheet itself shows *"goscie.xlsx"* and the notes
*"dojedzie po ślubie"*, *"krzesełko dla dziecka"*. Its CTA is *"easywed.app"* + *"bez zakładania
konta"* - the allowed recurrence below, so it burns nothing new.

The one exception is the CTA: section 8 requires *„bez zakładania konta”*, so that phrase recurs by
design. The full burned line *"Za darmo, bez zakładania konta."* still may not.

## One caveat: the films are not a source of approved copy

`src/easywed/scenes/GuestsScene.tsx:173` carries the landing page's plus-one line on screen —
*"Diety, osoby towarzyszące i przypisane miejsca są zawsze przy nazwisku - koniec z trzema arkuszami
naraz."* There is no plus-one field on the guest model at v1, so a published film already makes a
claim on the `SKILL.md` section 4 forbidden list.

Do not copy from the existing scenes on the assumption that what shipped was checked. Flag this line
to the user instead; a same-shape replacement that is true would be *„Diety, przedziały wieku i
przypisane miejsca są zawsze przy nazwisku - koniec z trzema arkuszami naraz.”*
