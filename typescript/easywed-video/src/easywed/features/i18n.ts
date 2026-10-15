/** On-screen strings for the single-feature cuts; merged into `tl` by `../i18n`. */

export const pl = {
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

export const en: typeof pl = {
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
