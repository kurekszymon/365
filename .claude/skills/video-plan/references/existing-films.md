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

## The kitchen-report cut - `easywed-report` / `easywed-report-vertical`, 540f (18 s)

messages pile up from the venue, the florist and the kitchen → diet tags landing row by row on the
guest list → the printed report's pages land, push in on the diets beside the names → the pages
settle, the CTA.
Scenes 174 + 120 + 150 + 120 = 564 at `KITCHEN_REPORT_TRANSITION = 8` × 3 seams → 540.
Built from `docs/video-plans/full-series-2026-09-11.md`, brief `kitchen-report`.

## The to-scale loop - `easywed-scale`, 360f (12 s), 16:9 only

a seated room and the question → the measure tool switched on, its mode flipped to *Krawędź* →
Stół 1's edge measured across to the dance floor → Stół 5's edge measured up to it, the payoff →
a dissolve back onto frame 0. A landing-page loop: no CTA, no pill.
Scenes 120 + 150 + 120 = 390 at `SCALE_TRANSITION = 15` × 2 seams → 360; the last 15 frames are
`LoopSeam` onto frame 0. Built from `docs/video-plans/16x9-only-2026-09-16.md`, brief `to-scale`.

## The seat-swap loop - `easywed-swap`, 390f (13 s), 16:9 only

a room where every chair is taken and the question → the seat popover on a chair at Stół 4, its
list flicked down to the amber *Przy innym stole* rows, Maria Wiśniewska picked → Stół 1 drops to
7 / 8 with one green chair, the popover on it leads through *Przy tym stole* to *Bez stołu* and
Michał Dąbrowski, who takes it → the payoff, then a dissolve back onto frame 0. A landing-page
loop: no CTA, no pill.
Scenes 105 + 165 + 150 = 420 at `SWAP_TRANSITION = 15` × 2 seams → 390; the last 15 frames are
`LoopSeam` onto frame 0. Built from `docs/video-plans/16x9-only-2026-09-16.md`, brief `seat-swap`.

## The seat-swap cut - `easywed-swap-cut` / `easywed-swap-cut-vertical`, 510f (17 s)

a room where every chair is taken and the auntie question - the seat popover on Stół 4's chair,
its occupant and his table, then *Maria* typed into its search until one amber row is left, picked -
Stół 1 drops to 7 / 8 with one green chair - its popover lists *Przy tym stole*, *Michał* typed
until he is the one row under *Bez stołu*, picked, the table back at 8 / 8, the payoff - the room
recedes, the CTA. The loop's beat retold as a social cut by explicit decision (2026-09-18), with the
names reached by typing rather than by scrolling.
Scenes 96 + 180 + 150 + 108 = 534 at `SWAP_CUT_TRANSITION = 8` x 3 seams -> 510.
Built from `docs/video-plans/full-series-2026-09-17.md`, brief `seat-swap` (ids renamed from the
brief's `easywed-swap` / `-vertical`, which the loop already held).

## The kids-count cut - `easywed-kids` / `easywed-kids-vertical`, 510f (17 s)

58 names with not a bracket among them and the question - the pencil on one row, the edit sheet,
`0-3 lata` picked and saved, then a cut to a second guest whose bracket `6-12` is typed into the
form's own field - the `Dzieci 5` chip pressed, the list filtered to five rows each with its violet
badge, the payoff - the panel recedes, the CTA.
Scenes 96 + 180 + 150 + 108 = 534 at `KIDS_TRANSITION = 8` x 3 seams -> 510.
Built from `docs/video-plans/full-series-2026-09-17.md`, brief `kids-count`.

## The odd-room loop - `easywed-shape`, 360f (12 s), 16:9 only

a seated room drawn as a plain rectangle, its top-right quarter empty, and the question - the hall's
label chip opens its settings dialog, *Kształt L* is picked and the quarter goes from the room behind
the blurred scrim - *Edytuj obrys* closes the dialog on the L in full, vertex handles up - the
notch's outer corner dragged a metre up and out, snapping to the metre, one wall now slanting - the
payoff, then a dissolve back onto frame 0. A landing-page loop: no CTA, no pill.
Scenes 105 + 150 + 135 = 390 at `SHAPE_TRANSITION = 15` x 2 seams -> 360; the last 15 frames are
`LoopSeam` onto frame 0. Built from `docs/video-plans/full-series-2026-09-17.md`, brief `odd-room`.

## The long walkthrough - `easywed-walkthrough`, 2490f (83 s), and `easywed-walkthrough-vertical`, 2355f (78.5 s)

the question over the logo build - the hall sketched (the short walkthrough's scene) - the *Sale*
list opened, *Dodaj salę*, the new unnamed hall's *Piętro* set to 1, the view pulled back over both
halls and the second given a dance floor and a bar, its chip pressed - that hall (`SALA_2`, 20x12
m, no tables) turned into an L and one corner dragged out (the odd-room loop's scenes, its question
and payoff) - the guest list dropped into the import dialog and its columns mapped (the import
cut's scenes) - the guest list (the short walkthrough's scene) - everyone seated (ditto) - two
children tagged and the kids counted (the kids cut's scenes) - one distance measured (the to-scale
loop's scene, its question) - a guest moved onto a full table and the one she turned out reseated
(the seat-swap cut's scenes, its question and payoff) - the printed report (the kitchen-report
cut's scene) - the outro with a new headline, no feature pills, the CTA. Every beat after *Floors*
is a shipped film's, reused by explicit decision (the plan's open question 3, answered
2026-09-19), so the beats themselves were already spent; what is new is the second hall.
Scenes 120 + 210 + 240 + 150 + 135 + 150 + 180 + 180 + 240 + 180 + 150 + 150 + 180 + 150 + 150 +
150 = 2715 at `TRANSITION = 15` x 15 seams -> 2490. Built from
`docs/video-plans/full-series-2026-09-17.md`, brief `walkthrough-long`, with its chapter list
changed (import, measure and report added; the kids chapters after the seating). The 9:16 twin,
built the same day, leaves the measure chapter out (2565 - 14 x 15 = 2355) because a phone at v1
measures from a long-press menu with no *Środek* / *Krawędź* switch, and draws the hall forms as
the phone's bottom sheet; the second hall stands 17 m along there, beside `TALL_HALL`'s 14 m.

## The keep-apart cut - `easywed-apart-vertical`, 510f (17 s), 9:16 only

close on the *DJ Booth* and Stół 6 under it, the uncle's line already on screen on frame 0 - Stół 6
pressed and dragged over *Parkiet* to the empty bottom-left corner, the view pulling back over the
whole room - the camera pushes in on two tables the couple named *Rodzina mamy* and *Rodzina taty*,
one behind the other, every chair initialled, and the parents' line - Rodzina taty dragged in an arc
over the dance floor into the spot Stół 6 left, let go and snapped to the grid while the view pulls
back - the room recedes, the payoff, the CTA. One continuous camera move, no cuts inside the planner.
The first film to show a table dragged *with* its seated guests, and the first to put initials on
the seat markers. The hook order was swapped from the brief (parents first) at the user's call.
Scenes 96 + 150 + 180 + 108 = 534 at `KEEP_APART_TRANSITION = 8` x 3 seams -> 510.
Built from `docs/video-plans/3-story-videos-9x16-2026-09-25.md`, brief `keep-apart`, drawn on
`KEEP_APART_HALL` (`layouts.ts`), 14x16 m, 58 seats.

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
*"dojedzie po ślubie"*, *"krzesełko dla dziecka"*. Its CTA is *"Wczytaj swoją listę gości"* over
the *"easywed.app"* pill.

From the kitchen-report cut: *"Sala prosi o plan stołów."* · *"Florystka pyta, jak rozłożyć
winietki."* · *"Kuchnia pyta, gdzie podać dania wege."* · *"Wydrukuj i podaj dalej."* (The florist's
and kitchen's lines were quoted here for a year as *"gdzie rozłożyć winietki"* and *"ile dań wege"*;
`i18n.ts` renders the versions above. Both variants are spent.) The florist's line
names place cards at the user's call: easywed has no place-card feature (`SKILL.md` section 4),
and the film only shows the printed per-table guest list as what answers her - never build a
beat that shows or implies the app making place cards. And,
as the guest panel and the printed report show them (app strings, verbatim): *"Szukaj gościa…"*,
*"Wszyscy 58"*, *"Bez miejsca 0"*, *"Wege (4)"* ticking up to *"Wege (7)"*, *"Vegan (3)"* to
*"Vegan (4)"*, *"Bez glutenu (2)"* to *"Bez glutenu (3)"*, *"Dodaj
gościa"*, *"Importuj gości"*, *"Przy stole: Stół 1"* (and every other table), *"Data ślubu:
12.09.2026"*, *"7 stołów · 58/58 goście"*, *"Wygenerowano 5.09.2026"*, *"Goście"*, *"Stół 1 (8/8
zajętych)"* through *"Stół pary młodej (10/10 zajętych)"*, and the printed guest lines such as
*"Maria Wiśniewska - Wege"*, *"Grzegorz Michalak - Wege"*, *"Zofia Wójcik - Bez glutenu"*,
*"Urszula Kałużna - Vegan"*, *"Julia Zielińska - Vegan"*. The film's list carries 14 diets in 58
(`kitchen-report/guests.ts`), more than the import cut's sheet. The tags
*"Wege"*, *"Vegan"* and *"Bez glutenu"* appear on their own too; as words they stay the app's
nouns (`SKILL.md` section 5), but a beat built on tags landing on a list is spent. Its CTA is
*"Dodaj preferencje żywieniowe gości"* over the *"easywed.app"* pill.

The teaser's CTA is *"Zacznij dziś wieczorem"* over the same pill. The three social cuts once closed
on a grey *"(Za darmo,) bez zakładania konta"* note under the pill; that was replaced by an action
line (`components/CallToAction.tsx`), so the note is spent too.

The walkthrough's outro now closes the same way - *"Ustaw pierwszy stół"* over the pill - so all four
films share one closing shape. The grey *"Zacznij w trybie gościa - bez zakładania konta."* that used
to sit under its pill is gone from the last film that carried it: a disclaimer is caption copy, not
an action line (`SKILL.md` section 8). Both of those lines are now spent.

From the to-scale loop: *"Zmieszczą się te stoły?"* · *"Odległości w metrach, nie na oko."* - and,
as the canvas toolbar, the measure overlay and the status bar show them (app strings, verbatim):
*"Mierzenie"*, *"Środek"*, *"Krawędź"*, *"Kliknij na sali, aby umieścić punkt pomiaru"*,
*"Kliknij ponownie, aby ustawić punkt końcowy"*, *"Esc aby wyjść"*, and the distance labels
*"3.33 m"* and *"1.33 m"* (with the app's decimal point). The beat itself - two distances measured
between a table and the dance floor - is spent too. The toolbar's *"Siatka"*, *"Miejsca"* and
*"1 m"*, and the hall chip *"Sala główna · 22×14 m"*, are chrome every planner shot carries, not
lines.

From the seat-swap loop: *"Ktoś musi się przesiąść?"* · *"Przesiadka bez przepisywania listy."* -
and, as the seat-assign popover shows them (app strings, verbatim): *"Szukaj gości"*
(`tables.guests_search_placeholder`, distinct from the guest panel's burned *"Szukaj gościa…"*),
*"Zwolnij miejsce"*, and the four section headings, drawn uppercase as the app draws them:
*"Aktualnie na tym miejscu"*, *"Przy tym stole"*, *"Bez stołu"*, *"Przy innym stole"*. The whole
demo roster is on screen as popover rows - `rosterFor(WIDE_HALL.tables)` in name order - so no guest
name from `data.ts` is fresh any more. The beat itself, a guest moved onto a taken chair and the
one she turned out reseated, is spent.

From the seat-swap cut: *"Ciocia chce siedzieć przy innym stole?"* · *"Nikt nie znika z planu."* -
and the popover's chrome again (*"Szukaj gości"*, *"Zwolnij miejsce"*, *"Aktualnie na tym
miejscu"*, *"Przy tym stole"*, *"Bez stołu"*, *"Przy innym stole"*), now with the typed searches
*"Maria"* and *"Michał"* as values in its field. The beat of narrowing the popover by typing a name
is spent with it. Its CTA is *"Kliknij miejsce i wybierz gościa"* over the *"easywed.app"* pill.

From the kids-count cut: *"Ile dzieci będzie na weselu?"* · *"Każde dziecko policzone."* - and, as
the guest panel and the edit-guest form show them (app strings, verbatim): *"Dzieci 1"* / *"Dzieci
2"* / *"Dzieci 5"* (`guests.filter.kids`), *"Edytuj gościa"*, *"Imię"*, *"Preferencje żywieniowe"*,
*"Grupa wiekowa"*, *"Dorosły"*, *"0-3 lata"*, *"3-6 lat"*, *"Dodaj"* (both the dietary and the age
row's custom button), *"np. 6-12"*, *"Notatka"*, *"np. uczulony na orzechy, lubi ostre jedzenie,
itp."* and *"Zapisz"*. The typed bracket *"6-12"* is on screen as a value, not a string. Five names
are new to `data.ts`'s roster and now spent with it - *Staś Mazur*, *Lena Mazur*, *Antek Sikora*,
*Kuba Król*, *Ola Król* (`kids-count/guests.ts`). The beat itself - a guest given an age bracket in
the edit form, and the kid count that follows - is spent, as is the payoff of a filter chip pressed
to prove a number. Its CTA is *"Oznacz dzieci na liście gości"* over the *"easywed.app"* pill.

From the odd-room loop: *"Sala nie jest prostokątem?"* · *"Ściany tam, gdzie naprawdę stoją."* -
and, as the hall settings dialog and the shape editor show them (app strings, verbatim): *"Sala"*
(the dialog's title), *"Nazwa"*, *"Piętro"*, *"np. 0, 1, 2"*, *"Kształt sali"*, *"Prostokąt"*,
*"Kształt L"*, *"Kształt U"*, *"Niestandardowy"*, *"Przeciągnij punkty obrysu sali, aby dopasować go
do lokalu."*, *"Edytuj obrys"*, *"Szerokość"*, *"Wysokość"*, *"Pozycja na planie (m)"*, *"Odstęp
siatki"*, *"Auto"*, *"Styl siatki"*, *"Kropki"*, *"Wyłączone"*, *"Usuń salę"*, and the shape-edit
pill's *"Przeciągaj punkty, aby zmienić kształt. Kliknij środek krawędzi, aby dodać punkt; kliknij
punkt dwukrotnie, aby go usunąć."* beside *"Gotowe"*. The beat itself - a rectangle turned into a
preset L and one vertex dragged by hand - is spent; `walkthrough-long` reuses these scenes as
chapters by design. `L_HALL` (`layouts.ts`) is a new room plan, 58 seats, same 22x14 m.

The guest panel's own chrome recurs across the report and kids cuts by explicit decision (this
plan's open question 5, answered 2026-09-17): *"Szukaj gościa…"*, *"Wszyscy 58"*, *"Bez miejsca 0"*,
*"Dodaj gościa"*, *"Importuj gości"* and *"Przy stole: Stół N"* are chrome every guest-list shot
carries, not lines. A beat may not rest on them.

From the long walkthrough: *"Pusta sala, lista gości i żadnego planu?"* · *"Obiad na dole, tańce
na górze?"* · *"Wasza sala, Wasi goście, jeden plan."* - and, as the halls list and the new hall's
settings show them (app strings, verbatim): *"Sale"*, *"Wszystkie sale są widoczne razem na planie –
przeciągnij salę za jej etykietę, aby ułożyć pomieszczenia i piętra."*, *"Dodaj salę"*, the row
*"Sala główna"* over *"22×14 m · 10 elementów"* (*"14×16 m · 9 elementów"* in 9:16),
*"np. Sala główna"*, the typed floor *"1"*, and the canvas chip *"Sala · p. 1 · 20×12 m"*. The beat itself - a second hall added on another floor
from the halls list - is spent. Its CTA is *"Narysujcie swoją salę"* over the *"easywed.app"*
pill. It also puts on screen, through the short walkthrough's reused scenes, two subtitles this
file had never listed: *"Stoły okrągłe i prostokątne, parkiet i wyposażenie - ustaw salę
dokładnie tak, jak będzie wyglądać w dniu wesela."* (`demo.hall.subtitle`) and *"Przeciągnij gości
na miejsca, wyrównaj obłożenie stołów i wyeksportuj gotowy plan do druku dla sali."*
(`demo.seating.subtitle`) - both spent, in both films - and the guest scene's corrected subtitle,
*"Diety, grupy wiekowe i przypisane miejsca są zawsze przy nazwisku - koniec z trzema arkuszami
naraz."*, spent with them.

From the keep-apart cut: *"Wujek Zbyszek i mikrofon? Daleko od DJ-a."* (its hook) · *"Twoi rodzice
nie mogą siedzieć stół w stół?"* · *"Cały stół na drugą stronę parkietu."* · *"Goście zostają na
swoich miejscach."* · *"Przesuwacie stół, razem z gośćmi."* - and, as the canvas shows them: the
couple's own table names *"Rodzina mamy"* and *"Rodzina taty"* (user data, not app strings - both
now spent), the fixture *"DJ Booth"* (`fixtures.preset.dj_booth`, English in the Polish locale
too), and the zoom pill's *"175%"*, *"103%"*, *"92%"*. The uncle, *Wujek Zbyszek*, is spent as a
character. The beat itself - a whole seated table dragged across the room, its guests travelling
with it - is spent, as is the payoff of moving a table with its guests. Its CTA is *"Zacznij
planowanie bez konta"* over the *"easywed.app"* pill.

The one exception is the CTA pill itself: *"easywed.app"* recurs by design (section 8). Each video's
action line above it is its own, and burns like any other line.

## One caveat: the films are not a source of approved copy

Until 2026-09-19, `src/easywed/scenes/GuestsScene.tsx` carried the landing page's plus-one line
on screen - *"Diety, osoby towarzyszące i przypisane miejsca są zawsze przy nazwisku - koniec z
trzema arkuszami naraz."* - a claim on the `SKILL.md` section 4 forbidden list, in a published
film. `demo.guests.subtitle` in `i18n.ts` now reads *"Diety, grupy wiekowe i przypisane miejsca…"*
(English: *"Dietary needs, age groups, and seat assignments…"*), backed by
`guests.add.age_group` and `lib/ageGroup.ts`. Renders of `easywed-demo` made before that date
still carry the old line; re-render them before posting.

The lesson stands: do not copy from the existing scenes on the assumption that what shipped was
checked. Verify a line against `v1-facts.md` and the app at the tag before reusing its claim.
