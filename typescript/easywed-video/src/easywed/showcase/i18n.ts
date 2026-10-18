/** On-screen strings for the overview films - demo, teaser and the long walkthrough; merged into `tl` by `../i18n`. */

export const pl = {
  demo: {
    tagline: "Planer rozsadzenia gości weselnych.", // landing.footer.tagline
    outroTitle: "Narysujcie salę. Posadźcie wszystkich.", // after landing.hero.title
    features: [
      "Stoły przeciągasz po planie",
      "Import z CSV i Excela",
      "Plan gotowy do druku",
      "Sale i piętra",
      "Wspólne planowanie",
    ],
    outroAction: "Ustaw pierwszy stół",
    hall: {
      step: "Krok 01",
      title: "Narysujcie salę", // landing.steps.one.title
      subtitle:
        "Okrągłe i prostokątne stoły, parkiet, wyposażenie - ułóżcie salę tak, jak będzie wyglądać w dniu wesela.", // the film's own line; landing.features.planner.desc was dropped in v1.1
      yourHall: "Wasza sala",
    },
    guests: {
      step: "Krok 02",
      title: "Dodajcie gości", // landing.steps.two.title
      // landing.features.guests.desc, with its plus-ones - a field v1 does not
      // have - swapped for the age groups it does (guests.add.age_group,
      // lib/ageGroup.ts). "i", "a" and "w" are bound to the next word.
      subtitle:
        "Dieta, grupa wiekowa i\u00a0miejsce przy stole - wszystko przy nazwisku gościa, a\u00a0nie w\u00a0trzech arkuszach.",
      importPill: "Import z CSV lub Excela",
      exportPill: "Plan gotowy do druku",
    },
    seating: {
      step: "Krok 03",
      title: "Posadźcie wszystkich", // landing.steps.three.title
      subtitle:
        "Przeciągnijcie gości na miejsca, rozłóżcie ich równo między stoły i wydrukujcie gotowy plan dla sali.",
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
    chaos: "Arkusz, karteczki i rodzinny czat.",
    plan: "Albo jeden plan sali.",
    hasSeat: "gości ma swoje miejsce",
    ctaTitle: "Rozsadź gości w jeden wieczór",
    ctaAction: "Zacznij dziś wieczorem",
  },

  walkthrough: {
    /** "i" is bound to "żadnego" so the line never ends on it. */
    hook: "Pusta sala, lista gości i\u00a0żadnego planu?",
    /** Each "na" is bound to the word after it, so neither line ends on one. */
    floors: "Obiad na\u00a0dole, tańce na\u00a0górze?",
    outroTitle: "Wasza sala, wasi goście, jeden plan.",
    outroAction: "Narysujcie swoją salę",
  },
};

export const en: typeof pl = {
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

  walkthrough: {
    hook: "An empty hall, a guest list and no plan?",
    floors: "Dinner downstairs, dancing upstairs?",
    outroTitle: "Your hall, your guests, one plan.",
    outroAction: "Draw your hall",
  },
};
