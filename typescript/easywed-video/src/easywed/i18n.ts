/**
 * Every on-screen string, in both languages. Pick one at render time:
 *
 *   REMOTION_LANG=en pnpm run render:teaser
 *
 * Remotion only hands `REMOTION_`-prefixed variables to the bundle, hence the
 * prefix. Anything else - or nothing - renders Polish.
 *
 * Strings that redraw the app are its own `pl.json` / `en.json` values at
 * easywed/v1, verbatim; the key is noted beside them.
 *
 * Strings for one group of films live in that group's own `i18n.ts`; this
 * file holds the app's own strings and merges the groups into `tl`.
 */

import {
  plural,
  PL_MONTHS_SHORT,
  PL_MONTHS_GENITIVE,
  EN_MONTHS_SHORT,
  EN_MONTHS,
  hhmm,
  ordinal,
  type DietKey,
  type Lang,
  LANG,
} from "./lang";
import * as chillWed from "./chill-wed/i18n";
import * as stories from "./stories/i18n";
import * as landingLoops from "./landing-loops/i18n";
import * as features from "./features/i18n";
import * as showcase from "./showcase/i18n";

export { LANG, locale, type DietKey, type Lang } from "./lang";

const sharedPl = {
  hall: {
    name: "Sala główna",
    headTable: "Stół pary młodej", // a table name; landing.preview.head_table was dropped in v1.1
    table: (n: number) => `Stół ${n}`, // tables.unnamed_index
    danceFloor: "Parkiet", // fixtures.preset.dance_floor
    bar: "Bar", // fixtures.preset.bar
    djBooth: "DJ Booth", // fixtures.preset.dj_booth - the Polish locale keeps it in English
    cakeTable: "Stół z tortem",
  },

  diet: {
    vegetarian: "Wege", // guests.dietary.*
    vegan: "Vegan",
    glutenFree: "Bez glutenu",
  } satisfies Record<DietKey, string>,

  notes: {
    lateArrival: "dojedzie po ślubie",
    highChair: "krzesełko dla dziecka",
  },

  app: {
    configureHall: "Skonfiguruj salę", // hall.configure_short
    nav: {
      guests: "Goście",
      tables: "Stoły",
      fixtures: "Elementy",
      reminders: "Przypomnienia",
      assistant: "Asystent",
    },
    grid: "Siatka", // canvas.grid.grid
    measure: "Mierzenie", // measure.tool
    seats: "Miejsca", // seats.toggle
    measureMode: { center: "Środek", border: "Krawędź" }, // measure.mode.*
    measureStatus: {
      idle: "Kliknij na sali, aby umieścić punkt pomiaru", // measure.statusbar
      started: "Kliknij ponownie, aby ustawić punkt końcowy", // measure.statusbar_drop
    },
    escToExit: "Esc, aby wyjść", // statusbar.esc_to_exit
    seatSearch: "Szukaj gości", // tables.guests_search_placeholder
    seatClear: "Zwolnij miejsce", // seats.clear
    /** `SeatAssignPopover`'s sections, in the order it renders them. Drawn uppercase, as its own header class sets them. */
    seatGroups: {
      selected: "Aktualnie na tym miejscu", // seats.group_selected
      table: "Przy tym stole", // seats.group_table
      unassigned: "Bez stołu", // seats.group_unassigned
      elsewhere: "Przy innym stole", // seats.group_elsewhere
    },
    /** `EntityEditDialog` around `HallPanelContent`, top to bottom. */
    hallDialog: {
      title: "Sala", // hall
      name: "Nazwa", // common.name
      namePlaceholder: "np. Sala główna", // hall.name_placeholder
      floor: "Piętro", // hall.floor
      floorPlaceholder: "np. 0, 1, 2", // hall.floor_placeholder
      shape: "Kształt sali", // hall.shape
      preset: {
        rectangle: "Prostokąt", // hall.preset.rectangle
        lShape: "Kształt L", // hall.preset.l-shape
        uShape: "Kształt U", // hall.preset.u-shape
        custom: "Niestandardowy", // hall.preset.custom
      },
      polygonHint:
        "Przeciągnij punkty obrysu sali, aby dopasować go do lokalu.", // hall.shape.polygon_hint
      editOutline: "Edytuj obrys", // hall.shape.edit_button
      width: "Szerokość", // common.width
      height: "Wysokość", // common.height
      position: "Pozycja na planie (m)", // hall.position
      gridSpacing: "Odstęp siatki", // canvas.grid.spacing
      auto: "Auto", // common.auto
      gridStyle: "Styl siatki", // canvas.grid.style
      gridStyles: { grid: "Siatka", dots: "Kropki", off: "Wyłączone" }, // canvas.grid.grid|dots|off
      delete: "Usuń salę", // hall.delete
    },
    /** `ShapeEditToolbar`, the pill that floats over the canvas in shape-edit mode. */
    shapeEditHint:
      "Przeciągaj punkty, aby zmienić kształt. Kliknij środek krawędzi, aby dodać punkt; kliknij punkt dwukrotnie, aby go usunąć.", // shape_edit.hint
    done: "Gotowe", // common.done
    /** `WeddingMembersDialog`: `InvitationManager` over `MemberList`, `Zamknij` in the footer. */
    members: {
      title: "Członkowie", // members.title
      role: "Rola", // members.role
      roles: { owner: "Właściciel", editor: "Edytor", viewer: "Podgląd" }, // members.role.*
      createInvite: "Utwórz link zaproszenia", // members.create_invite
      pending: "Oczekujące zaproszenia", // members.pending - drawn uppercase, as its class sets it
      linkOnly: "Zaproszenie linkiem", // members.link_only
      expires: (date: string) => `Wygasa ${date}`, // members.expires
      copyLink: "Kopiuj link", // members.copy_link
      copied: "Skopiowano", // members.copied
      active: "Aktywni członkowie", // members.active - drawn uppercase too
      you: "Ty", // members.you
      changeName: "Zmień nazwę", // members.change_name
      close: "Zamknij", // common.close
    },
    /** The `/login` card a signed-out invitee lands on (`requireAuth`), top to bottom. */
    auth: {
      subtitle: "Zaloguj się, żeby kontynuować planowanie", // auth.subtitle
      google: "Zaloguj się przez Google", // auth.sign_in_with_google
      or: "lub", // auth.or - drawn uppercase
      email: "Email", // auth.email
      password: "Hasło", // auth.password
      forgot: "Nie pamiętasz hasła?", // auth.forgot_password
      signIn: "Zaloguj się", // auth.sign_in
      noAccount: "Nie masz konta?", // auth.no_account
      signUp: "Załóż konto", // auth.sign_up
    },
    inviteClaiming: "Dołączanie do wesela...", // invite.claiming
    /**
     * `MobileTabBar`'s tabs, `t(tab)` and `reminders.title` - the phone's own
     * labels, which differ from the desktop rail's `nav` above ("Elementy sali").
     * The soft hyphen is the locale's own.
     */
    mobileTabs: {
      guests: "Goście", // guests
      tables: "Stoły", // tables
      fixtures: "Elementy sali", // fixtures
      reminders: "Przypo\u00admnienia", // reminders.title
      /** The fifth tab, which only an editor gets (`canEdit`). */
      assistant: "Asystent", // assistant.title
    },
    /**
     * `reminders/*`: the tab's add button and its popover, and a reminder's two
     * dates - the list's `format(due, "d MMM yyyy, HH:mm")` and the date
     * picker's `"PPP, HH:mm"`, both in date-fns' `pl` locale.
     */
    reminders: {
      add: "Dodaj przypomnienie", // reminders.add
      createTitle: "Nowe przypomnienie", // reminders.create.title
      due: (date: Date) =>
        `${date.getDate()} ${PL_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}, ${hhmm(date)}`,
      picked: (date: Date) =>
        `${date.getDate()} ${PL_MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()}, ${hhmm(date)}`,
    },
    /** `GuestModeBanner`, over the planner of a wedding kept only in this browser, and its link. */
    guestBanner:
      "Planujesz jako gość. Twoje zmiany są zapisywane tylko na tym urządzeniu - nie będą dostępne na innych urządzeniach ani po wyczyszczeniu danych przeglądarki.", // guest_mode.banner
    /** `Guests/SeatAssignSheet`: the table list, then the seat grid and its button. */
    seatAssign: {
      title: (name: string) => `Posadź: ${name}`, // guests.assign.title
      pickSeat: "Wybierz miejsce", // guests.assign.pick_seat
      assignAt: (n: number) => `Posadź na miejscu ${n}`, // seats.assign_at
      empty: "Wolne miejsce", // seats.empty
    },
    /** `TablePanelContent` in the phone's `MobilePanelDrawer`, titled by `usePanelTitle`, top to bottom. */
    tableForm: {
      title: "Edytuj stół", // tables.edit - also the canvas toolbar's edit button
      name: "Nazwa", // common.name
      shape: "Kształt stołu", // tables.shape
      rectangular: "Prostokątny", // tables.shape.rectangular
      round: "Okrągły", // tables.shape.round
      diameter: "Średnica", // tables.diameter
      width: "Szerokość", // common.width
      height: "Wysokość", // common.height
      rotation: "Orientacja", // tables.rotation
      flip: "Obróć o 90°", // tables.rotation.flip
      capacity: "Liczba miejsc", // tables.capacity
      guests: "Przypisz gości", // tables.guests
      guestsPick: "Wybierz gości", // tables.guests_pick - the picker's trigger while nobody is assigned
      // tables.guests_selected_of_capacity - under the picker's trigger
      selectedOf: (count: number, capacity: number) =>
        `Wybrani goście: ${count} / ${capacity}`,
      seatList: "Miejsca", // tables.seat_list_title - `TableSeatList`, under the picker
      seatNumbered: (n: number) => `Miejsce ${n}`, // seats.numbered
      seatAssign: "+ Przypisz", // tables.seat_assign_button
    },
    /** `HallsPanelContent` in the same dialog, titled by `usePanelTitle`. */
    hallsList: {
      title: "Sale", // hall.list_title
      hint: "Wszystkie sale są widoczne razem na planie - przeciągnij salę za jej etykietę, aby ułożyć pomieszczenia i piętra.", // hall.list_hint
      add: "Dodaj salę", // hall.add
      unnamed: "Sala", // hall.unnamed - the canvas chip of a hall with no name
      unnamedIndex: (index: number) => `Sala ${index}`, // hall.unnamed_index - the same hall in this list
      floorShort: (floor: number) => `p. ${floor}`, // hall.floor_short
      // hall.entity_count_one|few|many
      entityCount: (count: number) =>
        `${count} ${plural(count, { one: "element", few: "elementy", many: "elementów" })}`,
    },
    /** The canvas's right-click menu on an empty spot in the hall (`Canvas.tsx`, `CanvasViewMenu`), top to bottom. */
    canvasMenu: {
      addTable: "Dodaj stół", // tables.add
      addTables: "Dodaj stoły", // tables.add_batch
      addFixture: "Dodaj element", // fixtures.add
      view: "Widok", // canvas.view_section
      gridStyle: "Styl siatki", // canvas.grid.style
      snap: "Odległość przyciągania", // canvas.snap.label
      metres: (count: number) => `${count} m`, // common.meters
      seats: "Miejsca", // seats.toggle
      measure: "Mierzenie", // measure.tool
    },
    /** `TableBatchPanelContent` in `EntityEditDialog`, titled by `usePanelTitle`; its labels are `tableForm`'s. */
    tableBatch: {
      title: "Dodaj stoły", // tables.add_batch
      namePlaceholder: "Stół rodzinny", // tables.name_placeholder
      count: "Ile", // tables.batch_count
      // tables.add_many_one|few|many
      submit: (count: number) =>
        `Dodaj ${count} ${plural(count, { one: "stół", few: "stoły", many: "stołów" })}`,
    },
    /** The desktop rail's fixtures tab and its panel (`SidebarRail`, `EntityListContent`). */
    fixturesPanel: {
      title: "Elementy sali", // fixtures - the rail's label and the panel's heading
      add: "Dodaj element", // fixtures.add
      none: "Brak elementów sali.", // fixtures.none
    },
    /** `AddHubContent`, in `Sidebar/AddEntityDialog` on a desktop. */
    addHub: {
      title: "Dodaj do sali", // hall.add_hub.title
      hint: "Dotknij, aby wstawić na środek - potem przeciągnij na miejsce.", // hall.add_hub.hint
      tablesTab: "Stoły", // hall.add_hub.tables_tab
      fixturesTab: "Elementy sali", // hall.add_hub.fixtures_tab
      tables: {
        round8: "Okrągły 8",
        rect6: "Prostokąt 6",
        oval10: "Owalny 10",
      }, // tables.preset.*
      fixtures: {
        stage: "Scena", // fixtures.preset.stage
        danceFloor: "Parkiet", // fixtures.preset.dance_floor
        bar: "Bar", // fixtures.preset.bar
        djBooth: "DJ Booth", // fixtures.preset.dj_booth
        entrance: "Wejście", // fixtures.preset.entrance
        custom: "Niestandardowy", // fixtures.preset.custom
      },
    },
    /** The landing page's hero on a phone (`LocaleLanding`'s header, `LandingHero`) at easywed/v1.1.2, top to bottom. */
    landing: {
      eyebrow: "Planer gości weselnych i plan sali", // landing.hero.eyebrow - drawn uppercase
      title: "Narysujcie salę i rozsadźcie gości weselnych przy stołach", // landing.hero.title
      subtitle:
        "Sala w prawdziwych wymiarach, stoły tam, gdzie mają stać, i każdy gość na swoim miejscu - w przeglądarce, oboje, na jednym planie.", // landing.hero.subtitle
      start: "Zacznijcie planować", // landing.cta
      tryLocal: "Wypróbujcie bez konta", // landing.hero.try_local
      localHint:
        "Za darmo dla par. Tryb gościa trzyma plan na tym urządzeniu - zalogujcie się później, żeby go zapisać.", // landing.hero.local_hint
    },
    /** `Onboarding/OnboardingChecklist` at easywed/v1.1.2: the three steps, then the done card. */
    onboarding: {
      title: "Zacznij tutaj", // onboarding.title
      tablesTitle: "Rozstaw stoły", // onboarding.tables.title
      tablesTodo: "Dodaj pierwszy stół do sali", // onboarding.tables.todo
      guestsTitle: "Dodaj gości", // onboarding.guests.title
      guestsTodo: "Wpisz gości albo zaimportuj listę", // onboarding.guests.todo
      seatsTitle: "Posadź wszystkich", // onboarding.seats.title
      add: "Dodaj", // onboarding.tables.cta, onboarding.guests.cta
      seat: "Posadź", // onboarding.seats.cta
      doneTitle: "Gdy plan będzie gotowy", // onboarding.done.title
      doneDesc:
        "Wydrukujesz stąd plan sali i listę gości albo zaprosisz kogoś do wspólnej pracy.", // onboarding.done.desc
      print: "Drukuj", // onboarding.done.print
      share: "Udostępnij", // onboarding.done.share
    },
  },

  guests: {
    title: "Goście", // guests
    list: "Lista gości",
    added: (count: number, total: number) => `dodano ${count} z ${total} gości`,
    search: "Szukaj gościa…", // guests.search_placeholder
    filterAll: (count: number) => `Wszyscy ${count}`, // guests.filter.all
    filterUnseated: (count: number) => `Bez miejsca ${count}`, // guests.filter.unseated
    filterKids: (count: number) => `Dzieci ${count}`, // guests.filter.kids
    add: "Dodaj gościa", // guests.add
    edit: "Edytuj gościa", // guests.edit
    import: "Importuj gości", // guests.import
    /** `GuestFormFields` / `GuestAgeGroupField`, in the order the form draws them. */
    form: {
      name: "Imię i nazwisko", // guests.add.name
      namePlaceholder: "Jan Kowalski", // guests.add.name_placeholder
      dietary: "Preferencje żywieniowe", // guests.add.dietary_preferences
      dietaryCustom: "Dodaj", // guests.add.dietary_custom
      ageGroup: "Grupa wiekowa", // guests.add.age_group
      ageGroupCustom: "Dodaj", // guests.add.age_group_custom
      ageGroupPlaceholder: "np. 6-12", // guests.add.age_group_custom_placeholder
      note: "Notatka", // guests.add.note
      notePlaceholder: "np. uczulony na orzechy, lubi ostre jedzenie, itp.", // guests.add.note_placeholder
      save: "Zapisz", // common.save
    },
    /** `AGE_GROUP_PRESETS`, labelled `guests.age_group.*`; a typed bracket is its own label. */
    ageGroup: {
      adult: "Dorosły",
      "0-3": "0-3 lata",
      "3-6": "3-6 lat",
    } as Record<string, string>,
    none: "Brak gości.", // guests.none
    seatedAt: (table: string) => `Przy stole: ${table}`, // guests.status.seated_at
    unseated: "Bez miejsca", // guests.status.unseated
    more: (count: number) => `+ ${count} gości więcej`,
    progress: "Rozsadzeni", // guests.progress
    // guests.count_one|few|many
    count: (count: number) =>
      `${count} ${plural(count, { one: "gość", few: "goście", many: "gości" })}`,
    // guests.seated_ratio
    seatedRatio: (seated: number, total: number) =>
      total === 1
        ? `${seated}/${total} gość przy stole`
        : `${seated}/${total} gości przy stołach`,
  },

  import: {
    title: "Importuj gości z pliku CSV lub Excel", // guests.import.title
    intro:
      "Wgraj plik .csv lub .xlsx. Wykryjemy kolumny, pozwolimy je dopasować i pokażemy podgląd przed dodaniem.",
    dropHere: "Przeciągnij tutaj plik .csv lub .xlsx lub kliknij, aby wybrać",
    chooseFile: "Wybierz plik CSV lub Excel",
    mapColumns: "Dopasuj każde pole do kolumny z Twojego pliku.",
    col: { name: "Imię", table: "Stół", dietary: "Dieta", note: "Notatka" },
    colNone: "- Brak -",
    colUnnamed: (i: number) => `Kolumna ${i}`,
    moreRows: (count: number) => `+${count} więcej wierszy`,
    back: "Wstecz",
    next: "Dalej",
    unassigned: "Nieprzypisani", // guests.unassigned
    summary: (count: number) =>
      `Do zaimportowania: ${count} ${plural(count, { one: "gość", few: "gości", many: "gości" })}`,
    commit: (count: number) =>
      `Dodaj ${count} ${plural(count, { one: "gościa", few: "gości", many: "gości" })}`,
    /** The file the couple drags in, and its header row - aliases `autoDetectMapping` recognises. */
    fileName: "goscie.xlsx",
    sheetHeaders: ["Gość", "Stół", "Dieta", "Uwagi"],
  },

  print: {
    tableSection: (name: string, seated: number, capacity: number) =>
      `${name} (${seated}/${capacity} zajętych)`, // export.csv.section.table
    weddingDate: (date: string) => `Data ślubu: ${date}`, // export.pdf.wedding_date
    generatedOn: (date: string) => `Wygenerowano ${date}`, // export.pdf.generated_on
    tablesCount: (count: number) =>
      `${count} ${plural(count, { one: "stół", few: "stoły", many: "stołów" })}`, // tables.count
    guestsLower: "goście", // guests, lowercased as the view does
    guests: "Goście",
  },
};

const sharedEn: typeof sharedPl = {
  hall: {
    name: "Main hall",
    headTable: "Head table",
    table: (n) => `Table ${n}`,
    danceFloor: "Dance floor",
    bar: "Bar",
    djBooth: "DJ booth",
    cakeTable: "Cake table",
  },

  diet: {
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    glutenFree: "Gluten-free",
  },

  notes: {
    lateArrival: "arriving after the ceremony",
    highChair: "needs a high chair",
  },

  app: {
    configureHall: "Configure Hall",
    nav: {
      guests: "Guests",
      tables: "Tables",
      fixtures: "Fixtures",
      reminders: "Reminders",
      assistant: "Assistant",
    },
    grid: "Grid",
    measure: "Measure",
    seats: "Seats",
    measureMode: { center: "Center", border: "Border" },
    measureStatus: {
      idle: "Click on the hall to place a measurement point",
      started: "Click again to drop the end point",
    },
    escToExit: "Esc to exit",
    seatSearch: "Search guests",
    seatClear: "Clear seat",
    seatGroups: {
      selected: "Currently seated",
      table: "At this table",
      unassigned: "Unassigned",
      elsewhere: "Seated elsewhere",
    },
    hallDialog: {
      title: "Hall",
      name: "Name",
      namePlaceholder: "e.g. Main hall",
      floor: "Floor",
      floorPlaceholder: "e.g. 0, 1, 2",
      shape: "Hall shape",
      preset: {
        rectangle: "Rectangle",
        lShape: "L-shape",
        uShape: "U-shape",
        custom: "Custom",
      },
      polygonHint: "Drag the hall's corner points to match your venue.",
      editOutline: "Edit outline",
      width: "Width",
      height: "Height",
      position: "Position on canvas (m)",
      gridSpacing: "Grid spacing",
      auto: "Auto",
      gridStyle: "Grid style",
      gridStyles: { grid: "Grid", dots: "Dots", off: "Off" },
      delete: "Delete hall",
    },
    shapeEditHint:
      "Drag points to reshape. Click an edge midpoint to add a point, double-click a point to remove it.",
    done: "Done",
    members: {
      title: "Members",
      role: "Role",
      roles: { owner: "Owner", editor: "Editor", viewer: "Viewer" },
      createInvite: "Create invite link",
      pending: "Pending invites",
      linkOnly: "Link invite",
      expires: (date) => `Expires ${date}`,
      copyLink: "Copy link",
      copied: "Copied",
      active: "Active members",
      you: "You",
      changeName: "Change name",
      close: "Close",
    },
    auth: {
      subtitle: "Sign in to continue planning",
      google: "Sign in with Google",
      or: "or",
      email: "Email",
      password: "Password",
      forgot: "Forgot your password?",
      signIn: "Sign in",
      noAccount: "No account yet?",
      signUp: "Create account",
    },
    inviteClaiming: "Joining wedding...",
    mobileTabs: {
      guests: "Guests",
      tables: "Tables",
      fixtures: "Fixtures",
      reminders: "Reminders",
      assistant: "Assistant",
    },
    reminders: {
      add: "Add a reminder",
      createTitle: "New reminder",
      due: (date) =>
        `${date.getDate()} ${EN_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}, ${hhmm(date)}`,
      picked: (date) =>
        `${EN_MONTHS[date.getMonth()]} ${ordinal(date.getDate())}, ${date.getFullYear()}, ${hhmm(date)}`,
    },
    guestBanner:
      "You're planning as a guest. Your changes are stored only on this device - they won't be available on other devices or if you clear your browser data.",
    seatAssign: {
      title: (name) => `Seat ${name}`,
      pickSeat: "Pick a seat",
      assignAt: (n) => `Seat at #${n}`,
      empty: "Empty seat",
    },
    tableForm: {
      title: "Edit table",
      name: "Name",
      shape: "Table shape",
      rectangular: "Rectangular",
      round: "Round",
      diameter: "Diameter",
      width: "Width",
      height: "Height",
      rotation: "Orientation",
      flip: "Rotate 90°",
      capacity: "Capacity",
      guests: "Assign guests",
      guestsPick: "Select guests",
      selectedOf: (count, capacity) =>
        `Selected guests: ${count} / ${capacity}`,
      seatList: "Seats",
      seatNumbered: (n) => `Seat ${n}`,
      seatAssign: "+ Assign",
    },
    hallsList: {
      title: "Halls",
      hint: "All halls show together on the canvas - drag a hall by its label to arrange rooms and floors.",
      add: "Add hall",
      unnamed: "Hall",
      unnamedIndex: (index) => `Hall ${index}`,
      floorShort: (floor) => `fl. ${floor}`,
      entityCount: (count) => `${count} ${count === 1 ? "item" : "items"}`,
    },
    canvasMenu: {
      addTable: "Add a table",
      addTables: "Add tables",
      addFixture: "Add a fixture",
      view: "View",
      gridStyle: "Grid style",
      snap: "Snap distance",
      metres: (count) => `${count} m`,
      seats: "Seats",
      measure: "Measure",
    },
    tableBatch: {
      title: "Add tables",
      namePlaceholder: "Family table",
      count: "How many",
      submit: (count) => `Add ${count} ${count === 1 ? "table" : "tables"}`,
    },
    fixturesPanel: {
      title: "Fixtures",
      add: "Add a fixture",
      none: "No fixtures yet.",
    },
    addHub: {
      title: "Add to room",
      hint: "Tap to insert it centered - then drag it into place.",
      tablesTab: "Tables",
      fixturesTab: "Room elements",
      tables: { round8: "Round 8", rect6: "Rectangle 6", oval10: "Oval 10" },
      fixtures: {
        stage: "Stage",
        danceFloor: "Dance floor",
        bar: "Bar",
        djBooth: "DJ booth",
        entrance: "Entrance",
        custom: "Custom",
      },
    },
    landing: {
      eyebrow: "Wedding seating chart & guest planner",
      title: "Draw your hall, then seat every wedding guest",
      subtitle:
        "The room at its real size, the tables where you want them, and every guest with a seat - in the browser, both of you, on the same plan.",
      start: "Start planning",
      tryLocal: "Try it without an account",
      localHint:
        "Free for couples. Guest mode keeps the plan on this device, so sign in later to save it.",
    },
    onboarding: {
      title: "Start here",
      tablesTitle: "Arrange the tables",
      tablesTodo: "Add the first table to your hall",
      guestsTitle: "Add your guests",
      guestsTodo: "Type them in or import a list",
      seatsTitle: "Seat everyone",
      add: "Add",
      seat: "Seat",
      doneTitle: "When your plan is ready",
      doneDesc:
        "You can print the hall layout and guest list from here, or invite someone to work on it with you.",
      print: "Print",
      share: "Share",
    },
  },

  guests: {
    title: "Guests",
    list: "Guest list",
    added: (count, total) => `${count} of ${total} guests added`,
    search: "Search guest…",
    filterAll: (count) => `All ${count}`,
    filterUnseated: (count) => `Unseated ${count}`,
    filterKids: (count) => `Kids ${count}`,
    add: "Add a guest",
    edit: "Edit guest",
    import: "Import guests",
    form: {
      name: "Name",
      dietary: "Dietary Preferences",
      dietaryCustom: "Add",
      ageGroup: "Age group",
      ageGroupCustom: "Add",
      ageGroupPlaceholder: "e.g. 6-12",
      note: "Note",
      notePlaceholder: "e.g. allergic to nuts, loves spicy food, etc.",
      namePlaceholder: "John Doe",
      save: "Save",
    },
    ageGroup: { adult: "Adult", "0-3": "0-3 years", "3-6": "3-6 years" },
    none: "No guests added yet.",
    seatedAt: (table) => `Seated at ${table}`,
    unseated: "Unseated",
    more: (count) => `+ ${count} more guests`,
    progress: "Seated",
    count: (count) => `${count} ${count === 1 ? "guest" : "guests"}`,
    seatedRatio: (seated, total) =>
      total === 1
        ? `${seated}/${total} guest seated`
        : `${seated}/${total} guests seated`,
  },

  import: {
    title: "Import guests from CSV or Excel",
    intro:
      "Upload a .csv or .xlsx file. We'll detect the columns, let you map them, and preview before adding.",
    dropHere: "Drag a .csv or .xlsx file here or click to browse",
    chooseFile: "Choose CSV or Excel file",
    mapColumns: "Match each field to a column from your file.",
    col: { name: "Name", table: "Table", dietary: "Dietary", note: "Note" },
    colNone: "- None -",
    colUnnamed: (i) => `Column ${i}`,
    moreRows: (count) => `+${count} more rows`,
    back: "Back",
    next: "Next",
    unassigned: "Unassigned",
    summary: (count) =>
      `Ready to import ${count} ${count === 1 ? "guest" : "guests"}`,
    commit: (count) => `Add ${count} ${count === 1 ? "guest" : "guests"}`,
    fileName: "guests.xlsx",
    sheetHeaders: ["Guest", "Table", "Diet", "Notes"],
  },

  print: {
    tableSection: (name, seated, capacity) =>
      `${name} (${seated}/${capacity} seated)`,
    weddingDate: (date) => `Wedding date: ${date}`,
    generatedOn: (date) => `Generated ${date}`,
    tablesCount: (count) => `${count} ${count === 1 ? "table" : "tables"}`,
    guestsLower: "guests",
    guests: "Guests",
  },
};

const pl = {
  ...sharedPl,
  ...chillWed.pl,
  ...stories.pl,
  ...landingLoops.pl,
  ...features.pl,
  ...showcase.pl,
};

const en: typeof pl = {
  ...sharedEn,
  ...chillWed.en,
  ...stories.en,
  ...landingLoops.en,
  ...features.en,
  ...showcase.en,
};

const translations: Record<Lang, typeof pl> = { pl, en };

export const tl = translations[LANG];

/**
 * `ageGroupLabel` in `lib/ageGroup.ts`: the presets carry a translated label,
 * anything the user typed is its own label.
 */
export const ageGroupLabel = (group: string): string =>
  tl.guests.ageGroup[group] ?? group;
