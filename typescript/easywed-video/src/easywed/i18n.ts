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
 */

export type Lang = "pl" | "en";

export const LANG: Lang = process.env.REMOTION_LANG === "en" ? "en" : "pl";

/** For `Intl` - plural rules, collation, dates. */
const LOCALE: Record<Lang, string> = { pl: "pl-PL", en: "en-GB" };
export const locale = LOCALE[LANG];

const pluralRules = new Intl.PluralRules(locale);

/** The `_one` / `_few` / `_many` form i18next picks for a count. */
const plural = (
  count: number,
  forms: { one: string; few: string; many: string },
) => {
  const rule = pluralRules.select(count);
  return rule === "one" ? forms.one : rule === "few" ? forms.few : forms.many;
};

export type DietKey = "vegetarian" | "vegan" | "glutenFree";

/** Small counts spelled out, as a line of dialogue says them - index is the number. */
const PL_NUMBERS = ["Zero", "Jeden", "Dwa", "Trzy", "Cztery", "Pięć", "Sześć", "Siedem", "Osiem", "Dziewięć", "Dziesięć", "Jedenaście", "Dwanaście"];
const EN_NUMBERS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

/** A count as a word, so a spoken line can quote the plan; a room outgrowing the list fails loudly rather than printing a digit. */
const spelled = (count: number, words: string[]): string => {
  const word = words[count];
  if (word === undefined) throw new Error(`No spelled-out form for ${count}`);
  return word;
};

/** Round tens, spelled out, for a count past `PL_NUMBERS` - index is the tens digit. */
const PL_TENS = ["", "Dziesięć", "Dwadzieścia", "Trzydzieści", "Czterdzieści", "Pięćdziesiąt", "Sześćdziesiąt", "Siedemdziesiąt", "Osiemdziesiąt", "Dziewięćdziesiąt"];
const EN_TENS = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

/** `spelled`, reaching round tens too - a seat count read off the room; anything else fails loudly. */
const spelledCount = (count: number, words: string[], tens: string[]): string =>
  count < words.length ? spelled(count, words) : count % 10 === 0 && count < 100 ? tens[count / 10] : spelled(count, []);

/** A diameter as a line says it; only the one the film types is spelled, so a changed value fails loudly. */
const spelledMetres = (metres: number, words: Record<number, string>): string => {
  const word = words[metres];
  if (word === undefined) throw new Error(`No spelled-out form for ${metres} m`);
  return word;
};

const pl = {
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
      tables: { round8: "Okrągły 8", rect6: "Prostokąt 6", oval10: "Owalny 10" }, // tables.preset.*
      fixtures: {
        stage: "Scena", // fixtures.preset.stage
        danceFloor: "Parkiet", // fixtures.preset.dance_floor
        bar: "Bar", // fixtures.preset.bar
        djBooth: "DJ Booth", // fixtures.preset.dj_booth
        entrance: "Wejście", // fixtures.preset.entrance
        custom: "Niestandardowy", // fixtures.preset.custom
      },
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

  demo: {
    tagline: "Planer rozsadzenia gości weselnych.", // landing.footer.tagline
    outroTitle: "Narysujcie salę. Posadźcie wszystkich.", // after landing.hero.title
    features: [
      "Plan sali „przeciągnij i upuść”",
      "Import CSV i XLSX",
      "Plan gotowy do druku",
      "Sale i piętra",
      "Planujcie razem",
    ],
    outroAction: "Ustaw pierwszy stół",
    hall: {
      step: "Krok 01",
      title: "Narysujcie salę", // landing.steps.one.title
      subtitle:
        "Stoły okrągłe i prostokątne, parkiet i wyposażenie - ustaw salę dokładnie tak, jak będzie wyglądać w dniu wesela.", // the film's own line; landing.features.planner.desc was dropped in v1.1
      yourHall: "Twoja sala",
    },
    guests: {
      step: "Krok 02",
      title: "Dodajcie gości", // landing.steps.two.title
      // landing.features.guests.desc, with its plus-ones - a field v1 does not
      // have - swapped for the age groups it does (guests.add.age_group,
      // lib/ageGroup.ts). "i" and "z" are bound to the next word.
      subtitle:
        "Diety, grupy wiekowe i\u00a0przypisane miejsca są zawsze przy nazwisku - koniec z\u00a0trzema arkuszami naraz.",
      importPill: "Import z CSV lub Excela",
      exportPill: "Plan gotowy do druku",
    },
    seating: {
      step: "Krok 03",
      title: "Posadźcie wszystkich", // landing.steps.three.title
      subtitle:
        "Przeciągnij gości na miejsca, wyrównaj obłożenie stołów i wyeksportuj gotowy plan do druku dla sali.",
      ofSeated: (total: number) => `z ${total} gości przy stołach`,
      emptySeat: "Wolne miejsce", // seats.empty
      taken: "Zajęte",
    },
  },

  teaser: {
    /** Revealed word by word. */
    question: ["Ile", "osób", "siedzi", "przy", "stole", "4?"],
    sting: "Trzy dni przed weselem.",
    files: ["goscie.xlsx", "goscie_final.xlsx", "goscie_final_OSTATECZNA.xlsx"],
    notes: ["Ciocia Basia NIE obok Marka", "Wujek Janusz - bez glutenu?"],
    chaos: "Arkusz, karteczki i grupa na czacie.",
    plan: "Albo jeden plan sali.",
    hasSeat: "gości ma swoje miejsce",
    ctaTitle: "Rozsadź gości w jeden wieczór",
    ctaAction: "Zacznij dziś wieczorem",
  },

  importFilm: {
    /** Revealed word by word; "w" is bound to "Excelu." with a no-break space so the line never ends on it. */
    line: ["Twoja", "lista", "gości", "mieszka", "w Excelu."],
    ctaAction: "Wczytaj swoją listę gości",
  },

  report: {
    /** Each message revealed unit by unit; a unit keeps a lone "o" off a line's end. */
    messages: [
      ["Sala", "prosi", "o plan stołów."],
      ["Florystka", "pyta,", "jak", "rozłożyć", "winietki."],
      ["Kuchnia", "pyta,", "gdzie", "podać", "dania wege."],
    ],
    payoff: "Wydrukuj i podaj dalej.",
    ctaAction: "Dodaj preferencje żywieniowe gości",
  },

  scale: {
    hook: "Zmieszczą się te stoły?",
    payoff: "Odległości w metrach, nie na oko.",
  },

  swap: {
    /** "się" is bound to "przesiąść?" so the question never breaks after it. */
    hook: "Ktoś musi się przesiąść?",
    payoff: "Przesiadka bez przepisywania listy.",
  },

  swapCut: {
    hook: "Ciocia chce siedzieć przy innym stole?",
    /** "z" is bound to "planu." so the line never ends on it. */
    payoff: "Nikt nie znika z\u00a0planu.",
    /** "i" is bound to "wybierz" for the same reason. */
    ctaAction: "Kliknij miejsce i\u00a0wybierz gościa",
  },

  kids: {
    /** Revealed word by word; "na" is bound to "weselu?" so the line never ends on it. */
    hook: ["Ile", "dzieci", "będzie", "na weselu?"],
    payoff: "Każde dziecko policzone.",
    ctaAction: "Oznacz dzieci na liście gości",
  },

  shape: {
    hook: "Sala nie jest prostokątem?",
    /** "naprawdę" is bound to "stoją." so the last word never wraps alone. */
    payoff: "Ściany tam, gdzie naprawdę\u00a0stoją.",
  },

  keepApart: {
    /** Two tables the couple named themselves (`tables.name_placeholder` is *Stół rodzinny*). */
    mumsFamily: "Rodzina mamy",
    dadsFamily: "Rodzina taty",
    /**
     * The hook. "i" is bound to "mikrofon?", and the answer is bound into one
     * piece - a non-breaking hyphen keeps "DJ-a" whole - so the line breaks
     * after the question.
     */
    hook: "Wujek Zbyszek i\u00a0mikrofon? Daleko\u00a0od\u00a0DJ\u2011a.",
    /** "w" is bound to "stół?" so the line never breaks after it. */
    parentsLine: "Twoi rodzice nie mogą siedzieć stół w\u00a0stół?",
    dragLine: "Cały stół na drugą stronę parkietu.",
    /** "swoich" is bound to "miejscach." so the last word never wraps alone. */
    guestsLine: "Goście zostają na swoich\u00a0miejscach.",
    /** "z" is bound to "gośćmi." so the line never ends on it. */
    payoff: "Przesuwacie stół, razem z\u00a0gośćmi.",
    ctaAction: "Zacznij planowanie bez konta",
  },

  mama: {
    /** The hook. Mum is asking about the uncle, not the aunt - the teaser and the seat-swap cuts spent her. */
    hook: "Mama pyta już trzeci raz, gdzie siedzi wujek.",
    /** Whose phone this is - the bride's name in mum's thread. */
    sender: "Ania",
    /** Mum's three messages, oldest first. The first one's "A" is bound to "wujek" so it never ends a line. */
    bubbles: [
      "A\u00a0wujek Zbyszek gdzie siedzi?",
      "Wyślij ten plan jakoś inaczej",
      "Bo nie widać nic na tym zdjęciu",
    ],
    /** What mum types into the guest search - the name she knows him by. */
    search: "Zbyszek",
    captionLine: "Zamiast zdjęcia kartki - link.",
    payoff: "Mama sprawdzi sama.",
    ctaAction: "Wyślij mamie link do planu",
  },

  couch: {
    /** The time chip: one Sunday evening, read off the corner of the frame. */
    day: "Niedziela",
    times: ["19:40", "20:10", "21:05", "22:30"],
    /** The hook, the left voice. "w" is bound to "końcu" so the line never ends on it. */
    hook: "Dobra, dziś w\u00a0końcu robimy plan stołów.",
    /** "i" is bound to "do". */
    tea: "Herbata i\u00a0do dzieła.",
    floor: "Parkiet na środek.",
    headTable: "Stół pary młodej naprzeciwko.",
    howMany: "Ile nam tych stołów wyszło?",
    /** The answer is read off the room - `COUCH_HALL.tables.length`, spelled out. */
    tableCount: (count: number) => `${spelled(count, PL_NUMBERS)}. Pasuje.`,
    grandma: "Babcia blisko nas.",
    /** The dash stays with "razem", and "i" is bound to "tak". */
    cousins: "Kuzynki razem\u00a0- i\u00a0tak się przesiądą.",
    /** "z" is bound to "pracy". */
    work: "Twoi z\u00a0pracy przy barze?",
    /** "A" is bound to "gdzie". */
    whereElse: "A\u00a0gdzie indziej.",
    everyone: "To wszyscy?",
    seated: "Wszyscy siedzą.",
    payoff: "Jeden laptop, jedna kanapa, cały plan.",
    ctaAction: "Usiądźcie do planu razem",
  },

  /** The Instagram series' tag, top-left on every Reel until its CTA; numbered in posting order. */
  series: {
    tag: (episode: number) => `Wesele bez spiny · #${episode}`,
  },

  listSeat: {
    hook: "Kuzyn Tomek jednak przyjedzie.",
    where: "Gdzie go posadzić?",
    fullTables: "Pełne stoły odpadają same.",
    beside: "Widzisz, obok kogo siądzie.",
    payoff: "Tomek siedzi przy swoich. Reszta nawet nie drgnęła.",
    /** "z" is bound to "listy" so the line never ends on it. */
    ctaAction: "Posadź gościa prosto z\u00a0listy",
  },

  tableShape: {
    hook: "Okrągłe stoły czy jeden długi?",
    both: "Sprawdźmy oba.",
    /** "i" is bound to "już" so the line never ends on it. */
    square: "Klik - i\u00a0już kanciasty.",
    /** Read off the plan: the width typed and the table's seats, spelled out. */
    dims: (metres: number, seats: number) =>
      `${spelled(metres, PL_NUMBERS)} ${plural(metres, { one: "metr", few: "metry", many: "metrów" })}, ${spelled(
        seats,
        PL_NUMBERS,
      ).toLowerCase()} ${plural(seats, { one: "osoba", few: "osoby", many: "osób" })}.`,
    /** "I" is bound to "wzdłuż" for the same reason. */
    wall: "I\u00a0wzdłuż ściany.",
    payoff: "Ci sami goście, inny stół.",
    ctaAction: "Sprawdźcie oba warianty na planie",
  },

  /** Every count here is read off the room the batch form builds (`TEN_TABLES_HALL`), never typed. */
  tenTables: {
    hook: (tables: number, seats: number) =>
      `Sala mówi: ${spelledCount(tables, PL_NUMBERS, PL_TENS).toLowerCase()} okrągłych po ${spelledCount(
        seats,
        PL_NUMBERS,
        PL_TENS,
      ).toLowerCase()}.`,
    round: (diameter: number) => `Okrągłe, ${spelledMetres(diameter, { 1.5: "półtora metra" })}.`,
    /** The value as it is typed into *Ile*, in digits. */
    typed: (count: number) => `Wpisujesz ${count}.`,
    landed: (count: number) => `Stoją. Wszystkie ${spelledCount(count, PL_NUMBERS, PL_TENS).toLowerCase()}.`,
    fixtures: "Parkiet, scena, drzwi.",
    payoff: (tables: number, seats: number) =>
      `${spelledCount(tables, PL_NUMBERS, PL_TENS)} ${plural(tables, { one: "stół", few: "stoły", many: "stołów" })}, ${spelledCount(
        seats,
        PL_NUMBERS,
        PL_TENS,
      ).toLowerCase()} ${plural(seats, { one: "miejsce", few: "miejsca", many: "miejsc" })}, parkiet przed sceną.`,
    ctaAction: "Rozstaw wszystkie stoły naraz",
  },

  walkthrough: {
    /** "i" is bound to "żadnego" so the line never ends on it. */
    hook: "Pusta sala, lista gości i\u00a0żadnego planu?",
    /** Each "na" is bound to the word after it, so neither line ends on one. */
    floors: "Obiad na\u00a0dole, tańce na\u00a0górze?",
    outroTitle: "Wasza sala, Wasi goście, jeden plan.",
    outroAction: "Narysujcie swoją salę",
  },
};

const en: typeof pl = {
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
      save: "Save",
    },
    ageGroup: { adult: "Adult", "0-3": "0-3 years", "3-6": "3-6 years" },
    none: "No guests added yet.",
    seatedAt: (table) => `Seated at ${table}`,
    unseated: "Unseated",
    more: (count) => `+ ${count} more guests`,
    progress: "Seated",
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

  demo: {
    tagline: "A seating planner for your wedding.",
    outroTitle: "Draw your hall. Sit everyone down.",
    features: [
      "Drag & drop floor plan",
      "CSV & XLSX import",
      "A plan you can print",
      "Halls & floors",
      "Plan together",
    ],
    outroAction: "Place your first table",
    hall: {
      step: "Step 01",
      title: "Draw the hall",
      subtitle:
        "Round and rectangular tables, the dance floor, and fixtures - lay out the hall exactly as it will look on the day.",
      yourHall: "Your hall",
    },
    guests: {
      step: "Step 02",
      title: "Add your guests",
      subtitle:
        "Dietary needs, age groups, and seat assignments live next to every name - no more cross-checking three spreadsheets.",
      importPill: "Import from CSV or Excel",
      exportPill: "A plan you can print",
    },
    seating: {
      step: "Step 03",
      title: "Seat everyone",
      subtitle:
        "Drag guests onto seats, balance the tables, and print the finished plan for the venue.",
      ofSeated: (total) => `of ${total} guests seated`,
      emptySeat: "Empty seat",
      taken: "Taken",
    },
  },

  teaser: {
    question: ["How", "many", "guests", "at", "table", "4?"],
    sting: "Three days before the wedding.",
    files: ["guests.xlsx", "guests_final.xlsx", "guests_final_FINAL.xlsx"],
    notes: ["Aunt Barbara NOT next to Mark", "Uncle John - gluten-free?"],
    chaos: "A spreadsheet, sticky notes and a group chat.",
    plan: "Or one hall plan.",
    hasSeat: "guests have a seat",
    ctaTitle: "Seat your guests in one evening",
    ctaAction: "Start tonight",
  },

  importFilm: {
    line: ["Your", "guest", "list", "lives", "in Excel."],
    ctaAction: "Bring in your guest list",
  },

  report: {
    messages: [
      ["The venue", "wants", "the table plan."],
      ["The florist", "asks", "how to", "lay out", "place cards."],
      ["The kitchen", "asks", "where", "to serve", "veggie meals."],
    ],
    payoff: "Print it and pass it on.",
    ctaAction: "Add your guests' dietary needs",
  },

  scale: {
    hook: "Will these tables fit?",
    payoff: "Distances in metres, not by eye.",
  },

  swap: {
    hook: "Someone has to move?",
    payoff: "Reseat without rewriting the list.",
  },

  swapCut: {
    hook: "Auntie wants to sit at a\u00a0different table?",
    payoff: "Nobody drops off the plan.",
    ctaAction: "Click a seat and pick a guest",
  },

  kids: {
    hook: ["How", "many", "children", "are coming?"],
    payoff: "Every child counted.",
    ctaAction: "Tag the children on your guest list",
  },

  shape: {
    hook: "Your room isn't a rectangle?",
    payoff: "Walls where they really stand.",
  },

  keepApart: {
    mumsFamily: "Mum's family",
    dadsFamily: "Dad's family",
    hook: "Uncle Zbyszek and a\u00a0microphone? Far\u00a0from\u00a0the\u00a0DJ.",
    parentsLine: "Your parents can't sit at neighbouring tables?",
    dragLine: "The whole table, across the dance floor.",
    guestsLine: "The guests keep their seats.",
    payoff: "Move the table, guests and all.",
    ctaAction: "Start planning without an account",
  },

  mama: {
    hook: "Mum's asking for the third time where Uncle sits.",
    sender: "Ania",
    bubbles: [
      "And where's Uncle Zbyszek sitting?",
      "Send me a photo of the plan",
      "I can't see a thing in that photo",
    ],
    search: "Zbyszek",
    captionLine: "A link, not a photo of a sheet of paper.",
    payoff: "Mum can check for herself.",
    ctaAction: "Send Mum a link to the plan",
  },

  couch: {
    day: "Sunday",
    times: ["7:40 pm", "8:10 pm", "9:05 pm", "10:30 pm"],
    hook: "Right, tonight we finally do the seating plan.",
    tea: "Tea, and let's go.",
    floor: "Dance floor in the middle.",
    headTable: "Our table facing it.",
    howMany: "How many tables did we end up with?",
    tableCount: (count) => `${spelled(count, EN_NUMBERS)}. That works.`,
    grandma: "Grandma close to us.",
    cousins: "Cousins together\u00a0- they'll swap seats anyway.",
    work: "Your work friends by the bar?",
    whereElse: "Where else?",
    everyone: "Is that everyone?",
    seated: "Everyone's seated.",
    payoff: "One laptop, one sofa, the whole plan.",
    ctaAction: "Sit down to the plan together",
  },

  series: {
    tag: (episode) => `Stress-free wedding · #${episode}`,
  },

  listSeat: {
    hook: "Cousin Tomek is coming after all.",
    where: "Where do we seat him?",
    fullTables: "Full tables drop out on their own.",
    beside: "You see who he'll sit next to.",
    payoff: "Tomek sits with his family. Nobody else moved an inch.",
    ctaAction: "Seat a guest straight from the list",
  },

  tableShape: {
    hook: "Round tables or one long one?",
    both: "Let's try both.",
    square: "One tap - and it's square.",
    dims: (metres, seats) =>
      `${spelled(metres, EN_NUMBERS)} ${plural(metres, { one: "metre", few: "metres", many: "metres" })}, ${spelled(
        seats,
        EN_NUMBERS,
      ).toLowerCase()} ${plural(seats, { one: "person", few: "people", many: "people" })}.`,
    wall: "And along the wall.",
    payoff: "Same guests, different table.",
    ctaAction: "Try both layouts on the plan",
  },

  tenTables: {
    hook: (tables, seats) =>
      `The venue says: ${spelledCount(tables, EN_NUMBERS, EN_TENS).toLowerCase()} round tables of ${spelledCount(
        seats,
        EN_NUMBERS,
        EN_TENS,
      ).toLowerCase()}.`,
    round: (diameter) => `Round, ${spelledMetres(diameter, { 1.5: "one and a half metres" })}.`,
    typed: (count) => `You type ${count}.`,
    landed: (count) => `There they are. All ${spelledCount(count, EN_NUMBERS, EN_TENS).toLowerCase()}.`,
    fixtures: "Dance floor, stage, door.",
    payoff: (tables, seats) =>
      `${spelledCount(tables, EN_NUMBERS, EN_TENS)} ${tables === 1 ? "table" : "tables"}, ${spelledCount(
        seats,
        EN_NUMBERS,
        EN_TENS,
      ).toLowerCase()} ${seats === 1 ? "seat" : "seats"}, the dance floor in front of the stage.`,
    ctaAction: "Set out all your tables at once",
  },

  walkthrough: {
    hook: "An empty hall, a guest list and no plan?",
    floors: "Dinner downstairs, dancing upstairs?",
    outroTitle: "Your hall, your guests, one plan.",
    outroAction: "Draw your hall",
  },
};

const translations: Record<Lang, typeof pl> = { pl, en };

export const tl = translations[LANG];

/**
 * `ageGroupLabel` in `lib/ageGroup.ts`: the presets carry a translated label,
 * anything the user typed is its own label.
 */
export const ageGroupLabel = (group: string): string =>
  tl.guests.ageGroup[group] ?? group;
