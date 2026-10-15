/** On-screen strings for the 16:9 landing-page loops; merged into `tl` by `../i18n`. */

export const pl = {
  scale: {
    hook: "Zmieszczą się te stoły?",
    payoff: "Odległości w metrach, nie na oko.",
  },

  swap: {
    /** "się" is bound to "przesiąść?" so the question never breaks after it. */
    hook: "Ktoś musi się przesiąść?",
    payoff: "Przesiadka bez przepisywania listy.",
  },

  shape: {
    hook: "Sala nie jest prostokątem?",
    /** "naprawdę" is bound to "stoją." so the last word never wraps alone. */
    payoff: "Ściany tam, gdzie naprawdę\u00a0stoją.",
  },
};

export const en: typeof pl = {
  scale: {
    hook: "Will these tables fit?",
    payoff: "Distances in metres, not by eye.",
  },

  swap: {
    hook: "Someone has to move?",
    payoff: "Reseat without rewriting the list.",
  },

  shape: {
    hook: "Your room isn't a rectangle?",
    payoff: "Walls where they really stand.",
  },
};
