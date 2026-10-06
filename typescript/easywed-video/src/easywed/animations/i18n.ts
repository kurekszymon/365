/** On-screen strings for the standalone animations; merged into `tl` by `../i18n`. */

import type { Motto } from "../components/LoopReel";

export const pl = {
  stressAway: {
    /**
     * English in both languages, on purpose (answered 2026-10-06): it bends
     * "an apple a day keeps the doctor away", which has no Polish twin, so the
     * Polish caption carries the meaning instead.
     */
    motto: [
      ["One guest", { accent: "per day" }],
      ["keeps the stress away"],
    ] as Motto,
  },
  extraChair: {
    motto: [
      ["Jeszcze dwie osoby?"],
      [{ accent: "dwa krzesła więcej" }],
      ["przy tym samym stole"],
    ] as Motto,
  },
};

export const en: typeof pl = {
  stressAway: {
    motto: [["One guest", { accent: "per day" }], ["keeps the stress away"]],
  },
  extraChair: {
    motto: [
      ["Two more coming?"],
      [{ accent: "two more chairs" }],
      ["at the same table"],
    ],
  },
};
