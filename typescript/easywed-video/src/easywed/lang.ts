/**
 * The active language and the helpers every string file shares - plurals,
 * spelled-out numbers, months. Strings themselves live in `i18n.ts` (shared)
 * and each group's own `i18n.ts`.
 */

export type Lang = "pl" | "en";

export const LANG: Lang = process.env.REMOTION_LANG === "en" ? "en" : "pl";

/** For `Intl` - plural rules, collation, dates. */
export const LOCALE: Record<Lang, string> = { pl: "pl-PL", en: "en-GB" };
export const locale = LOCALE[LANG];

export const pluralRules = new Intl.PluralRules(locale);

/** The `_one` / `_few` / `_many` form i18next picks for a count. */
export const plural = (
  count: number,
  forms: { one: string; few: string; many: string },
) => {
  const rule = pluralRules.select(count);
  return rule === "one" ? forms.one : rule === "few" ? forms.few : forms.many;
};

export type DietKey = "vegetarian" | "vegan" | "glutenFree";

/** Small counts spelled out, as a line of dialogue says them - index is the number. */
export const PL_NUMBERS = [
  "Zero",
  "Jeden",
  "Dwa",
  "Trzy",
  "Cztery",
  "Pięć",
  "Sześć",
  "Siedem",
  "Osiem",
  "Dziewięć",
  "Dziesięć",
  "Jedenaście",
  "Dwanaście",
];
export const EN_NUMBERS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];

/** A count as a word, so a spoken line can quote the plan; a room outgrowing the list fails loudly rather than printing a digit. */
export const spelled = (count: number, words: string[]): string => {
  const word = words[count];
  if (word === undefined) throw new Error(`No spelled-out form for ${count}`);
  return word;
};

/** Round tens, spelled out, for a count past `PL_NUMBERS` - index is the tens digit. */
export const PL_TENS = [
  "",
  "Dziesięć",
  "Dwadzieścia",
  "Trzydzieści",
  "Czterdzieści",
  "Pięćdziesiąt",
  "Sześćdziesiąt",
  "Siedemdziesiąt",
  "Osiemdziesiąt",
  "Dziewięćdziesiąt",
];
export const EN_TENS = [
  "",
  "Ten",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

/** `spelled`, reaching round tens too - a seat count read off the room; anything else fails loudly. */
export const spelledCount = (
  count: number,
  words: string[],
  tens: string[],
): string =>
  count < words.length
    ? spelled(count, words)
    : count % 10 === 0 && count < 100
      ? tens[count / 10]
      : spelled(count, []);

/** A reminder's two dates as date-fns prints them in the app, which the film has no copy of. */
export const PL_MONTHS_SHORT = [
  "sty",
  "lut",
  "mar",
  "kwi",
  "maj",
  "cze",
  "lip",
  "sie",
  "wrz",
  "paź",
  "lis",
  "gru",
];
export const PL_MONTHS_GENITIVE = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia",
];
export const EN_MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const hhmm = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
export const ordinal = (n: number) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

/** A diameter as a line says it; only the one the film types is spelled, so a changed value fails loudly. */
export const spelledMetres = (
  metres: number,
  words: Record<number, string>,
): string => {
  const word = words[metres];
  if (word === undefined)
    throw new Error(`No spelled-out form for ${metres} m`);
  return word;
};

/** A table's seats as the collective numeral a mixed group takes (*na ośmioro*); only the preset's count is spelled, so a changed one fails loudly. */
export const PL_COLLECTIVE: Record<number, string> = { 8: "ośmioro" };
export const collective = (count: number): string => {
  const word = PL_COLLECTIVE[count];
  if (word === undefined) throw new Error(`No collective numeral for ${count}`);
  return word;
};
