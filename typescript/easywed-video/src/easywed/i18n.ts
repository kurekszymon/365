/**
 * Every on-screen string, in both languages. Pick one at render time:
 *
 *   REMOTION_LANG=en npm run render:teaser
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
const plural = (count: number, forms: { one: string; few: string; many: string }) => {
  const rule = pluralRules.select(count);
  return rule === "one" ? forms.one : rule === "few" ? forms.few : forms.many;
};

export type DietKey = "vegetarian" | "vegan" | "glutenFree";

const pl = {
  hall: {
    name: "Sala główna",
    headTable: "Stół pary młodej", // landing.preview.head_table
    table: (n: number) => `Stół ${n}`, // tables.unnamed_index
    danceFloor: "Parkiet", // fixtures.preset.dance_floor
    bar: "Bar", // fixtures.preset.bar
    cakeTable: "Stół z tortem",
  },
  diet: {
    vegetarian: "Wege", // guests.dietary.*
    vegan: "Vegan",
    glutenFree: "Bez glutenu",
  } satisfies Record<DietKey, string>,
  notes: { lateArrival: "dojedzie po ślubie", highChair: "krzesełko dla dziecka" },

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
    escToExit: "Esc aby wyjść", // statusbar.esc_to_exit
    seatSearch: "Szukaj gości", // tables.guests_search_placeholder
    seatClear: "Zwolnij miejsce", // seats.clear
    /** `SeatAssignPopover`'s sections, in the order it renders them. Drawn uppercase, as its own header class sets them. */
    seatGroups: {
      selected: "Aktualnie na tym miejscu", // seats.group_selected
      table: "Przy tym stole", // seats.group_table
      unassigned: "Bez stołu", // seats.group_unassigned
      elsewhere: "Przy innym stole", // seats.group_elsewhere
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
      name: "Imię", // guests.add.name
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
    ageGroup: { adult: "Dorosły", "0-3": "0-3 lata", "3-6": "3-6 lat" } as Record<string, string>,
    none: "Brak gości.", // guests.none
    seatedAt: (table: string) => `Przy stole: ${table}`, // guests.status.seated_at
    more: (count: number) => `+ ${count} gości więcej`,
    progress: "Rozsadzeni", // guests.progress
    // guests.seated_ratio
    seatedRatio: (seated: number, total: number) =>
      total === 1 ? `${seated}/${total} gość przy stole` : `${seated}/${total} gości przy stołach`,
  },

  import: {
    title: "Importuj gości z pliku CSV lub Excel", // guests.import.title
    intro: "Wgraj plik .csv lub .xlsx. Wykryjemy kolumny, pozwolimy je dopasować i pokażemy podgląd przed dodaniem.",
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
    commit: (count: number) => `Dodaj ${count} ${plural(count, { one: "gościa", few: "gości", many: "gości" })}`,
    /** The file the couple drags in, and its header row - aliases `autoDetectMapping` recognises. */
    fileName: "goscie.xlsx",
    sheetHeaders: ["Gość", "Stół", "Dieta", "Uwagi"],
  },

  print: {
    tableSection: (name: string, seated: number, capacity: number) => `${name} (${seated}/${capacity} zajętych)`, // export.csv.section.table
    weddingDate: (date: string) => `Data ślubu: ${date}`, // export.pdf.wedding_date
    generatedOn: (date: string) => `Wygenerowano ${date}`, // export.pdf.generated_on
    tablesCount: (count: number) => `${count} ${plural(count, { one: "stół", few: "stoły", many: "stołów" })}`, // tables.count
    guestsLower: "goście", // guests, lowercased as the view does
    guests: "Goście",
  },

  demo: {
    tagline: "Plan stołów weselnych - prościej się nie da.", // landing.footer.tagline
    outroTitle: "Każdy gość na właściwym miejscu", // landing.hero.title
    features: ["Plan sali „przeciągnij i upuść”", "Import CSV i XLSX", "Eksport PDF do druku", "Sale i piętra", "Planujcie razem"],
    outroAction: "Ustaw pierwszy stół",
    hall: {
      step: "Krok 01",
      title: "Naszkicuj salę", // landing.steps.one.title
      subtitle: "Stoły okrągłe i prostokątne, parkiet i wyposażenie - ustaw salę dokładnie tak, jak będzie wyglądać w dniu wesela.", // landing.features.planner.desc
      yourHall: "Twoja sala",
    },
    guests: {
      step: "Krok 02",
      title: "Dodaj gości", // landing.steps.two.title
      subtitle: "Diety, osoby towarzyszące i przypisane miejsca są zawsze przy nazwisku - koniec z trzema arkuszami naraz.", // landing.features.guests.desc
      importPill: "Import z CSV lub Excela",
      exportPill: "Eksport PDF do druku",
    },
    seating: {
      step: "Krok 03",
      title: "Posadź wszystkich", // landing.steps.three.title
      subtitle: "Przeciągnij gości na miejsca, wyrównaj obłożenie stołów i wyeksportuj gotowy plan do druku dla sali.",
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
};

const en: typeof pl = {
  hall: {
    name: "Main hall",
    headTable: "Head table",
    table: (n) => `Table ${n}`,
    danceFloor: "Dance floor",
    bar: "Bar",
    cakeTable: "Cake table",
  },
  diet: {
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    glutenFree: "Gluten-free",
  },
  notes: { lateArrival: "arriving after the ceremony", highChair: "needs a high chair" },

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
    more: (count) => `+ ${count} more guests`,
    progress: "Seated",
    seatedRatio: (seated, total) =>
      total === 1 ? `${seated}/${total} guest seated` : `${seated}/${total} guests seated`,
  },

  import: {
    title: "Import guests from CSV or Excel",
    intro: "Upload a .csv or .xlsx file. We'll detect the columns, let you map them, and preview before adding.",
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
    summary: (count) => `Ready to import ${count} ${count === 1 ? "guest" : "guests"}`,
    commit: (count) => `Add ${count} ${count === 1 ? "guest" : "guests"}`,
    fileName: "guests.xlsx",
    sheetHeaders: ["Guest", "Table", "Diet", "Notes"],
  },

  print: {
    tableSection: (name, seated, capacity) => `${name} (${seated}/${capacity} seated)`,
    weddingDate: (date) => `Wedding date: ${date}`,
    generatedOn: (date) => `Generated ${date}`,
    tablesCount: (count) => `${count} ${count === 1 ? "table" : "tables"}`,
    guestsLower: "guests",
    guests: "Guests",
  },

  demo: {
    tagline: "Wedding seating, made easy.",
    outroTitle: "Every guest in the right seat",
    features: ["Drag & drop floor plan", "CSV & XLSX import", "Print-ready PDF export", "Halls & floors", "Plan together"],
    outroAction: "Place your first table",
    hall: {
      step: "Step 01",
      title: "Sketch the hall",
      subtitle: "Round and rectangular tables, the dance floor, and fixtures - lay out the hall exactly as it will look on the day.",
      yourHall: "Your hall",
    },
    guests: {
      step: "Step 02",
      title: "Add your guests",
      subtitle: "Dietary needs, plus-ones, and seat assignments live next to every name - no more cross-checking three spreadsheets.",
      importPill: "Import from CSV or Excel",
      exportPill: "Print-ready PDF export",
    },
    seating: {
      step: "Step 03",
      title: "Seat everyone",
      subtitle: "Drag guests onto seats, balance the tables, and export a print-ready plan for the venue.",
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
};

const translations: Record<Lang, typeof pl> = { pl, en };

export const tl = translations[LANG];

/**
 * `ageGroupLabel` in `lib/ageGroup.ts`: the presets carry a translated label,
 * anything the user typed is its own label.
 */
export const ageGroupLabel = (group: string): string => tl.guests.ageGroup[group] ?? group;
