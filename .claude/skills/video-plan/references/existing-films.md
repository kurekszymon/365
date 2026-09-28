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

## The mama-link cut - `easywed-mama-vertical`, 540f (18 s), 9:16 only

mum's phone: a photo of the pencilled paper plan from Ania, then mum's three questions landing
under the hook, and a push in on the photo - the couple's laptop, close on the header's dashed
invite circle, pressed; the *Członkowie* dialog, *Rola* switched to *Podgląd*, *Utwórz link
zaproszenia*, the pending row, *Kopiuj link* to *Skopiowano*, the caption line - back on mum's
phone, the link arrives in her thread and her thumb taps it, the sign-in page, *Dołączanie do
wesela...*, the plan opened read-only in her browser, *Goście* tapped, *Zbyszek* typed until one
row is left - the phone recedes, the payoff, the CTA. The first film to show the invite link, the
members dialog, a second person's device, and the planner as a viewer sees it. Mum asks about the
uncle, not the aunt (the brief's *ciocia Halina*), by the user's call - and keep-apart's Wujek
Zbyszek is reused by that same call.
Scenes 96 + 180 + 180 + 108 = 564 at `MAMA_TRANSITION = 8` x 3 seams -> 540.
Built from `docs/video-plans/3-story-videos-9x16-2026-09-25.md`, brief `mama-link`.

## The sunday-couch cut - `easywed-couch-vertical`, 682f (22.7 s), 9:16 only

a time chip reading *Niedziela, 19:40* over the couple's laptop, open on the empty hall guest mode
seeds, and the left voice's first line already up on frame 0, the right voice answering - 20:10,
in on the room as the dance floor and the bar land and the head table and six round tables pop in
round it, one pointer placing the first two, and the table count said out loud - back over the
laptop; 21:05, the guest panel open on 58 unseated names, the head table and its neighbours
filled first, then close on the bar and Stół 3 seated chair by chair, initials and all - 22:30,
back over the whole laptop, *Rozsadzeni* at 58/58 - the laptop recedes, the payoff, the CTA. One
continuous camera, the evening jumping forward on the clock's ticks. The first film to tell the
whole plan as a story of one evening, with two voices and no names; the mechanic itself - a room
laid out and filled - is the teaser's and the walkthrough's, retold by the brief's own choice. It
opens on the seeded unnamed 20x12 m hall rather than the brief's `hall.empty_state`, which a couple
never sees (see `v1-facts.md`).
Scenes 96 + 180 + 210 + 120 + 108 = 714 at `SUNDAY_COUCH_TRANSITION = 8` x 4 seams -> 682.
Built from `docs/video-plans/3-story-videos-9x16-2026-09-25.md`, brief `sunday-couch`, drawn on
`COUCH_HALL` (`layouts.ts`), 20x12 m, 58 seats.

## The list-seat cut - `easywed-listseat-vertical`, 480f (16 s), 9:16 so far

episode 1 of the Instagram series *Wesele bez spiny*, its tag top-left until the CTA. The
couple's phone, the planner in guest mode, the guest list open and scrolled to its end, where
*Tomasz Lis* was just written in *Bez miejsca*, the hook up on frame 0 - the camera closes on his
row, the question - his row's seat button tapped, the sheet's table list with every full table
greyed out and Stół 5 at 7/8 the one live row, tapped - the sheet swaps to Stół 5's seats, pushed
in until each card's name reads, the dashed seat 6 between his uncle Marek and his cousin Zuzanna
picked, *Posadź na miejscu 6*, confirmed - the sheet drops onto his row, now *Przy stole: Stół 5*,
the chip at *Bez miejsca 0*, the payoff - the phone recedes under it, the CTA. The first film to
seat a guest from the guest list rather than from the canvas or an import, and the first drawn
on the couple's own phone. The 1:1 feed cut (`easywed-listseat-square`) is not built yet: it
waits on the square branch of `useFormat()`, the plan's build-order step 3.
Scenes 96 + 150 + 150 + 108 = 504 at `LIST_SEAT_TRANSITION = 8` x 3 seams -> 480.
Built from `docs/video-plans/instagram-reels-series-2026-09-26.md`, brief `list-seat`, drawn on
`TALL_HALL`.

## The table-shape cut - `easywed-tableshape-vertical`, 480f (16 s), 9:16 only

episode 2 of *Wesele bez spiny*, its tag top-left until the CTA. The couple's phone, the planner
signed in - no `GuestModeBanner`, by the user's call (2026-09-28); the owner's avatar and invite chip
in the header instead - zoomed in on Stół 3 - round, Ø 1.5 m, every chair initialled - with Stół 1 above it, the
hook up on frame 0 - a tap selects it, ring and toolbar, and the toolbar's pen opens *Edytuj stół*,
the drawer at its full 85% over the plan - *Prostokątny* tapped, the form's diagram turning square at
the same 1.5 m, the thumb scrolling the form so the whole diagram shows - *Szerokość* cleared and
typed to 3, *Wysokość* to 1, the diagram stretching into a long table, four chairs a side, the
initials going with them - *Obróć o 90°*, the two values swapping to 1 and 3 and the diagram
standing upright - the check, the drawer dropping onto the plan: the long table standing along the
left wall under Stół 1, the dance floor beside it, every chair still initialled, the camera pulling
back, the payoff - the phone recedes under it, the CTA. The first film to change a table's shape,
size or orientation, and the first to show the table form. The brief's "table still visible above
the sheet" is not how v1 draws it: the form outgrows the drawer's `max-h-[85dvh]`, so the sheet
covers the canvas and the change is seen in the form's own seat diagram, then on the plan.
Scenes 96 + 150 + 150 + 108 = 504 at `TABLE_SHAPE_TRANSITION = 8` x 3 seams -> 480.
Built from `docs/video-plans/instagram-reels-series-2026-09-26.md`, brief `table-shape`, drawn on
`TABLE_SHAPE_HALL` (`layouts.ts`), 14x16 m, 58 seats, its round tables v1's Ø 1.5 m preset.

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

From the mama-link cut: *"Mama pyta już trzeci raz, gdzie siedzi wujek."* (its hook) · mum's
messages *"A wujek Zbyszek gdzie siedzi?"*, *"Wyślij zdjęcie tego planu"*, *"Bo nie widać nic na
tym zdjęciu"* · *"Zamiast zdjęcia kartki - link."* · *"Mama sprawdzi sama."* - and, as the members
dialog shows them (app strings, verbatim): *"Członkowie"*, *"Rola"*, *"Edytor"*, *"Podgląd"*,
*"Utwórz link zaproszenia"*, *"Oczekujące zaproszenia"* and *"Aktywni członkowie"* (both drawn
uppercase, as the app draws them), *"Zaproszenie linkiem"*, *"Podgląd · Wygasa 7.09.2026"*,
*"Kopiuj link"*, *"Skopiowano"*, *"Anna Kowalska (Ty)"*, *"Właściciel"*, *"Zmień nazwę"*,
*"Zamknij"*; as the sign-in page shows them: *"easywed."*, *"Zaloguj się, żeby kontynuować
planowanie"*, *"Zaloguj się przez Google"*, *"lub"* (drawn uppercase), *"Email"*, *"Hasło"*,
*"Nie pamiętasz hasła?"*, *"Zaloguj się"*, *"Nie masz konta? Załóż konto"*; *"Dołączanie do
wesela..."* on the claim page; and on the viewer's phone the tab bar's *"Goście"*, *"Stoły"*,
*"Elementy sali"*, *"Przypomnienia"*, the wedding name *"Anna & Piotr"* (truncated), and the typed
search *"Zbyszek"* as a value. The address bar's *"easywed.app"* is the pill's address, not a
line. The chat's contact name *"Ania"* and the guest *Zbyszek Pawlak* (`mama-link/guests.ts`, at
Stół 3) are spent with it. The beat itself - an invite link made in the members dialog and opened
on someone else's phone - is spent, as is the payoff of a relative finding a guest's table
through the guest search on their own phone. The guest panel's *"Rozsadzeni"*, *"58/58 gości przy
stołach"*, *"Szukaj gościa…"*, *"Wszyscy 58"*, *"Bez miejsca 0"*, the diet chips and *"Przy stole:
Stół 3"* are chrome, as above; this cut rests its answer on that row by the user's explicit call
(the plan's open question 5, answered 2026-09-26), because the beat is mum finding it herself. Its
CTA is *"Wyślij mamie link do planu"* over the *"easywed.app"* pill.

From the sunday-couch cut: the time chip *"Niedziela, 19:40"* ticking to *"20:10"*, *"21:05"* and
*"22:30"* (the whole Sunday-evening clock device is spent with it), and the two voices' lines, in
order: *"Dobra, dziś w końcu robimy plan stołów."* (its hook) · *"Herbata i do dzieła."* · *"Parkiet
na środek."* · *"Stół pary młodej naprzeciwko."* · *"Ile nam tych stołów wyszło?"* · *"Siedem.
Pasuje."* · *"Babcia blisko nas."* · *"Kuzynki razem - i tak się przesiądą."* · *"Twoi z pracy przy
barze?"* · *"A gdzie indziej."* · *"To wszyscy?"* · *"Wszyscy siedzą."* · *"Jeden laptop, jedna
kanapa, cały plan."* (its payoff). As the planner shows them: the seeded hall's chip *"Sala ·
20×12 m"* (`hall.unnamed`), and the guest panel's *"Bez miejsca"* pill on an unseated row
(`guests.status.unseated`) - chrome, like the rest of the panel, which it also carries
(*"Rozsadzeni"*, *"0/58"* climbing to *"58/58 gości przy stołach"*, *"Wszyscy 58"*, *"Bez miejsca
58"* counting down to *"Bez miejsca 0"*, the diet chips, *"Dodaj gościa"*, *"Importuj gości"*,
*"Przy stole: Stół pary młodej"*). The beat itself - a whole evening's plan told as a clock and a
couple's dialogue - is spent. Its CTA is *"Usiądźcie do planu razem"* over the *"easywed.app"*
pill.

From the list-seat cut: *"Kuzyn Tomek jednak przyjedzie."* (its hook) · *"Gdzie go
posadzić?"* · *"Pełne stoły odpadają same."* · *"Widzisz, obok kogo siądzie."* · *"Tomek siedzi
przy swoich. Reszta nawet nie drgnęła."* (its payoff) - and, as the seat sheet shows them (app
strings, verbatim): *"Posadź: Tomasz Lis"* (`guests.assign.title`), the table rows *"Stół pary
młodej"* *"10/10"*, *"Stół 1"* to *"Stół 6"* at *"8/8"* and *"Stół 5"* at *"7/8"*, the title
*"Stół 5"* with its back arrow, *"Wolne miejsce"* (`seats.empty`), *"Wybierz miejsce"*
(`guests.assign.pick_seat`) and *"Posadź na miejscu 6"* (`seats.assign_at`); as the guest-mode
planner shows them: `GuestModeBanner`'s *"Planujesz jako gość. Twoje zmiany są zapisywane tylko
na tym urządzeniu - nie będą dostępne na innych urządzeniach ani po wyczyszczeniu danych
przeglądarki."* beside *"Zaloguj się"*, and the guest panel's *"57/58 gości przy stołach"* and
*"Bez miejsca 1"* - chrome, as above. Eight names are new and now spent with it (`list-seat/guests.ts`):
*Tomasz Lis*, *Marek Lis*, *Zuzanna Lis*, *Ewa Lis*, *Adam Wrona*, *Beata Wrona*, *Paweł
Nowicki*, *Karolina Nowicka*; *Kuzyn Tomek* is spent as a character. The beat itself - a guest
seated from the guest list through the seat sheet, table list then seat grid - is spent, as is
the payoff of a guest seated without anyone else moving. Its CTA is *"Posadź gościa prosto z
listy"* over the *"easywed.app"* pill.

From the table-shape cut: *"Okrągłe stoły czy jeden długi?"* (its hook) · *"Sprawdźmy oba."* ·
*"Klik - i już kanciasty."* · *"Trzy metry, osiem osób."* · *"I wzdłuż ściany."* · *"Ci sami goście,
inny stół."* (its payoff) - and, as the table form shows them (app strings, verbatim): *"Edytuj
stół"* (`tables.edit`), *"Nazwa"*, *"Kształt stołu"*, *"Prostokątny"*, *"Okrągły"*, *"Średnica"*,
*"Orientacja"*, *"Obróć o 90°"*, *"Liczba miejsc"*, *"Przypisz gości"*, the name *"Stół 3"* in its
field, and the values *"1.5"*, *"3"*, *"1"* and *"8"*. *"Szerokość"* and *"Wysokość"* were already
burned by the odd-room loop's hall dialog; they recur here as the table form's own field labels by
the user's explicit call (2026-09-28), as chrome, like the guest panel's - a beat may not rest on
them. The canvas's table toolbar (pen, copy, duplicate, delete) is icons only. The initials on
Stół 3's chairs are `rosterFor`'s spent names, drawn as initials only. The beat itself - one seated
table tried round, square, long and turned upright, its guests staying put - is spent, as is the
payoff of the same guests at a different table. Its CTA is *"Sprawdźcie oba warianty na planie"*
over the *"easywed.app"* pill.

The series tag *"Wesele bez spiny · #N"* recurs by design across the series' episodes, like the
pill; only its number changes. It is spent as a name for anything else.

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
