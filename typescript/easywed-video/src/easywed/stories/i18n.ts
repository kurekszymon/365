/** On-screen strings for the 9:16 story cuts; merged into `tl` by `../i18n`. */
import { PL_NUMBERS, EN_NUMBERS, spelled } from "../lang";

export const pl = {
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
    /** The bride's name, over the thread on mum's phone. */
    sender: "Ania",
    /** Mum, over the same thread on Ania's phone - the hook's. */
    mum: "Mama",
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

  ciocie: {
    /**
     * The hook. The aunties' question is a real quotation, so it alone carries
     * Polish quotes; it is bound into one piece, so the line breaks after
     * "singli:" and "A" never ends a line.
     */
    hook: "Ciocie pytają singli: \u201eA\u00a0ty\u00a0kiedy?\u201d",
    /** The two names the couple types over *Stół 2* and *Stół 5* - user data, not app strings. */
    singles: "Single",
    aunts: "Ciocie",
    singlesLine: "Single - tutaj.",
    auntsLine: "Ciocie - tam.",
    /** "nikt nie zapyta." is bound into one piece, so the last word never wraps alone. */
    payoff: "Przez cały parkiet nikt\u00a0nie\u00a0zapyta.",
    ctaAction: "Nazwijcie stoły po swojemu",
  },
};

export const en: typeof pl = {
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
    mum: "Mum",
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

  ciocie: {
    hook: "The aunts ask the singles: \u201cSo when's it your\u00a0turn?\u201d",
    singles: "Singles",
    aunts: "Aunts",
    singlesLine: "Singles - here.",
    auntsLine: "Aunts - there.",
    payoff: "A whole dance floor away, nobody\u00a0asks.",
    ctaAction: "Name your tables your own way",
  },
};
