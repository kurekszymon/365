/** On-screen strings for the „Wesele bez spiny” Instagram series; merged into `tl` by `../i18n`. */
import {
  plural,
  PL_NUMBERS,
  EN_NUMBERS,
  spelled,
  PL_TENS,
  EN_TENS,
  spelledCount,
  spelledMetres,
  collective,
} from "../lang";

export const pl = {
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
    round: (diameter: number) =>
      `Okrągłe, ${spelledMetres(diameter, { 1.5: "półtora metra" })}.`,
    /** The value as it is typed into *Ile*, in digits. */
    typed: (count: number) => `Wpisujesz ${count}.`,
    landed: (count: number) =>
      `Stoją. Wszystkie ${spelledCount(count, PL_NUMBERS, PL_TENS).toLowerCase()}.`,
    fixtures: "Parkiet, scena, drzwi.",
    payoff: (tables: number, seats: number) =>
      `${spelledCount(tables, PL_NUMBERS, PL_TENS)} ${plural(tables, { one: "stół", few: "stoły", many: "stołów" })}, ${spelledCount(
        seats,
        PL_NUMBERS,
        PL_TENS,
      ).toLowerCase()} ${plural(seats, { one: "miejsce", few: "miejsca", many: "miejsc" })}, parkiet przed sceną.`,
    ctaAction: "Rozstaw wszystkie stoły naraz",
  },

  /**
   * The list is the couple's own, typed into the app - demo data, not app
   * strings. No line here says the app will remind anyone: it doesn't.
   */
  todoList: {
    /** A word joiner after the hyphen, so "DJ-a" never breaks across two lines. */
    hook: "Zaliczka dla DJ-\u2060a… zapłaciliśmy czy nie?",
    /** "bo po terminie" is held together so the line breaks after the comma. */
    overdue: "Jest. Na czerwono, bo\u00a0po\u00a0terminie.",
    done: "Zapłacone. Odhaczone.",
    /**
     * Too long for one line at the payoff's size, so its two halves are each
     * held together and it breaks only at the comma and after the dash - which
     * also keeps "a" and "w" off a line's end.
     */
    payoff:
      "Co załatwione, a\u00a0co\u00a0jeszcze\u00a0nie\u00a0- w\u00a0jednym\u00a0miejscu.",
    ctaAction: "Wpiszcie, co jeszcze załatwić",
    items: {
      deposit: "Zaliczka dla DJ-a",
      plan: "Wysłać sali plan stołów",
      fitting: "Przymiarka garnituru",
      rings: "Odebrać obrączki",
      kidsMenu: "Dopytać o menu dla dzieci",
    },
  },

  /**
   * The speedrun. Its seconds - the hook's limit and what is left of it - are
   * read off the stopwatch, and the table's seats off the preset; never typed.
   */
  tryNow: {
    /** The number is bound to its noun so the question never breaks between them. */
    hook: (seconds: number) =>
      `Macie ${seconds}\u00a0${plural(seconds, { one: "sekundę", few: "sekundy", many: "sekund" })}?`,
    start: "Start.",
    hall: "Sala już czeka.",
    table: (seats: number) => `Stół na ${collective(seats)}.`,
    /** The guest the couple types - their data, not an app string. */
    guest: "Babcia Jadzia",
    listed: "Babcia na liście.",
    seated: "Babcia przy stole.",
    /** The second sentence is bound whole, so it keeps a line of its own; the verb agrees with the count. */
    payoff: (left: number) =>
      `Babcia siedzi. ${plural(left, { one: "Została", few: "Zostały", many: "Zostało" })}\u00a0${left}\u00a0${plural(
        left,
        {
          one: "sekunda",
          few: "sekundy",
          many: "sekund",
        },
      )}.`,
    /** "i" is bound to "sprawdźcie" so the line never ends on it. */
    ctaAction: "Włączcie stoper i\u00a0sprawdźcie sami",
  },
};

export const en: typeof pl = {
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
    round: (diameter) =>
      `Round, ${spelledMetres(diameter, { 1.5: "one and a half metres" })}.`,
    typed: (count) => `You type ${count}.`,
    landed: (count) =>
      `There they are. All ${spelledCount(count, EN_NUMBERS, EN_TENS).toLowerCase()}.`,
    fixtures: "Dance floor, stage, door.",
    payoff: (tables, seats) =>
      `${spelledCount(tables, EN_NUMBERS, EN_TENS)} ${tables === 1 ? "table" : "tables"}, ${spelledCount(
        seats,
        EN_NUMBERS,
        EN_TENS,
      ).toLowerCase()} ${seats === 1 ? "seat" : "seats"}, the dance floor in front of the stage.`,
    ctaAction: "Set out all your tables at once",
  },

  todoList: {
    hook: "The DJ deposit… did we pay it or not?",
    overdue: "There it is. Red, because it's overdue.",
    done: "Paid. Ticked off.",
    payoff: "What's done and what isn't - in one place.",
    ctaAction: "Write down what's still to sort out",
    items: {
      deposit: "DJ deposit",
      plan: "Send the venue the seating plan",
      fitting: "Suit fitting",
      rings: "Pick up the rings",
      kidsMenu: "Ask about the kids' menu",
    },
  },

  tryNow: {
    hook: (seconds) => `Got ${seconds}\u00a0seconds?`,
    start: "Go.",
    hall: "The hall's already waiting.",
    table: (seats) =>
      `A table for ${spelled(seats, EN_NUMBERS).toLowerCase()}.`,
    guest: "Grandma Jadzia",
    listed: "Grandma's on the list.",
    seated: "Grandma's at the table.",
    payoff: (left) =>
      `Grandma's seated. ${left}\u00a0${left === 1 ? "second" : "seconds"}\u00a0to\u00a0spare.`,
    ctaAction: "Start a stopwatch and try it yourselves",
  },
};
