// Money, as integer minor units.
//
// Every price in this app is an integer count of the currency's smallest unit -
// grosze for PLN, cents for EUR - because a per-person price multiplied by 180
// guests is not a number to hold in a float. The currency is one per venue
// (`tenants.currency`) rather than one per price, so nothing here carries a
// currency alongside the integer; the caller passes both.
//
// Pure module: no store import, no React, the shape @/lib/dietary uses, so the
// parsing rules below stay testable on their own.

/**
 * Ceiling, mirroring the `price_per_person_minor between 0 and 100000000` CHECK
 * on `menu_packages`. Enforced client-side too, so a slipped decimal point is
 * refused by the form rather than by PostgREST.
 */
export const MAX_PRICE_MINOR = 100_000_000

/**
 * A price for display: `40500, "PLN", "pl"` → `405,00 zł`.
 *
 * The try/catch is load-bearing, and the argument that throws is the **locale**,
 * not the currency. `Intl.NumberFormat` raises `RangeError` on a language tag
 * it cannot parse, and this is called with `i18n.language` - which comes from
 * i18next's browser detector and is whatever the browser reported, validated
 * nowhere. Uncaught, that is a crash in a price cell that blanks the whole CRM
 * screen around it.
 *
 * The currency is the near miss worth writing down, because it reads like the
 * dangerous one. `tenants.currency` is shape-checked (`^[A-Z]{3}$`) rather than
 * checked against an ISO list - the codebase's stated preference, since an
 * allowlist is a migration the first time someone opens in Prague - and that
 * shape happens to be exactly Intl's own well-formedness rule. So a venue that
 * stores `ZZZ` gets `405,00 ZZZ`: an odd-looking price, not an exception. The
 * catch still covers it, which is what keeps that true if the CHECK is ever
 * loosened to something Intl would reject.
 *
 * The fallback puts the code after the number rather than guessing a symbol,
 * which is both honest and what most of Europe does anyway.
 *
 * The two fraction digits are pinned rather than left to the currency's own
 * minor-unit exponent, and that is not cosmetic. Every price here is stored as
 * hundredths (`minor / 100` above) whatever the currency is, so two digits is
 * what the app actually holds - and Intl's default would otherwise print a
 * value `parsePriceInput` cannot read back. `¥1,405` for JPY has no decimal
 * mark left to tell its group comma apart from one, and `KWD 405.000` lands
 * exactly on the three-digits-behind-a-lone-separator trap; both parse to
 * `null`, so a venue on such a currency would be refused a price the app
 * itself printed into the field. `tenants.currency` is shape-checked, not
 * allowlisted, so those currencies are reachable today.
 */
export const formatMoney = (
  minor: number,
  currency: string,
  locale: string
): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(minor / 100)
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`
  }
}

/**
 * Digits in groups of three - the only shape a thousands separator ever takes,
 * in every locale that has one. Used to tell grouping apart from a decimal
 * mark, never to guess which character a given locale would have used.
 */
const GROUPED = {
  ".": /^\d{1,3}(?:\.\d{3})+$/,
  ",": /^\d{1,3}(?:,\d{3})+$/,
} as const

/**
 * A cleaned-up amount into its integer and fraction digits, or `null` when the
 * two are not knowable from the string alone.
 *
 * Both `.` and `,` mean "decimal mark" to somebody, so the separators have to
 * be classified before anything can be added up. Two of the three cases are
 * decidable:
 *
 * - **Both characters present.** The rightmost is the decimal mark and the
 *   other is grouping, because no locale writes its group separator *after* the
 *   decimal mark. `1.405,50` and `1,405.50` are both 1405.50, and that is a
 *   fact about how numbers are written rather than a guess about who typed it.
 *   The grouped side still has to be grouped, so `1.4,05` is refused.
 * - **One character, repeated.** Only grouping repeats: `1,234,567`.
 *
 * The third case is the trap. A single separator with **exactly three** digits
 * behind it and a plausible leading group in front - `1,405`, `10,000`,
 * `4,055` - reads as 1405 to an English venue and as 1.405 to a Polish one, and
 * the two readings are a factor of 1000 apart. Nothing in the string breaks the
 * tie, and a price is not a field to be wrong about by 1000x, so it is refused
 * and the form asks for it again: refusing `1,405` is strictly better than
 * silently storing 1,40.
 */
const splitAmount = (candidate: string): [string, string] | null => {
  const lastDot = candidate.lastIndexOf(".")
  const lastComma = candidate.lastIndexOf(",")

  if (lastDot < 0 && lastComma < 0) return [candidate, ""]

  if (lastDot >= 0 && lastComma >= 0) {
    const at = Math.max(lastDot, lastComma)
    const decimal = lastDot > lastComma ? "." : ","
    const group = decimal === "." ? "," : "."
    // A decimal mark cannot repeat: `1.2.3,4` is not an amount.
    if (candidate.indexOf(decimal) !== at) return null
    const int = candidate.slice(0, at)
    if (!GROUPED[group].test(int)) return null
    return [int.split(group).join(""), candidate.slice(at + 1)]
  }

  const sep = lastDot >= 0 ? "." : ","
  const parts = candidate.split(sep)

  if (parts.length > 2) {
    if (!GROUPED[sep].test(candidate)) return null
    return [parts.join(""), ""]
  }

  const [int = "", frac = ""] = parts
  if (frac.length === 3 && /^[1-9]\d{0,2}$/.test(int)) return null
  return [int, frac]
}

/**
 * A typed price back into minor units. `null` for anything that is not a
 * non-negative amount this app will store, **including an amount whose
 * thousands separator is ambiguous** - see `splitAmount`.
 *
 * Deliberately **not** `Math.round(Number(raw) * 100)`. That expression is
 * wrong for values a user can plainly type: `4.055 * 100` is
 * `405.49999999999994`, so the rounding lands a grosz low, and there is no
 * amount of rounding mode that fixes the class. This parses the decimal string
 * instead and never multiplies a fraction.
 *
 * The whitespace strip covers U+00A0 and U+202F as well as ordinary spaces, and
 * that is part of what makes a value round-trip: French and Polish `Intl`
 * output use a no-break space as the group separator *and* before the symbol,
 * so `formatMoney`'s own result pasted back into the field must parse. The
 * separator classification in `splitAmount` is the rest of it -
 * `CrmMenuPackageEditor` seeds the price field with
 * `formatMoney(…, i18n.language)`, which on an English UI is `PLN 1,405.00`, so
 * a parser that cannot read grouping is one an English venue cannot edit a
 * four-figure price in.
 *
 * The fraction is **truncated** to two digits rather than rounded. A third
 * digit in a price is a typo, and silently rounding 4,0559 up to 4,06 invents
 * an amount nobody typed; taking 4,05 is at least a prefix of what they wrote.
 */
export const parsePriceInput = (raw: string): number | null => {
  // \s already covers both no-break spaces in JavaScript; they are spelled
  // out because the reason they matter is not obvious from `\s` alone.
  const stripped = raw.replace(/[\s\u00a0\u202f]/g, "")
  if (stripped.length === 0) return null

  // Everything that is not a digit, a separator or a sign is currency
  // decoration - `zł`, `PLN`, `€`. Dropped rather than rejected, so a pasted
  // formatted price is accepted.
  const candidate = stripped.replace(/[^\d.,-]/g, "")

  // A minus survives the strip on purpose: a negative price is a mistake worth
  // refusing, not decoration worth ignoring.
  if (candidate.includes("-")) return null

  const split = splitAmount(candidate)
  if (split === null) return null

  const [int, frac] = split
  if (int.length === 0 && frac.length === 0) return null

  const minor =
    Number(int || "0") * 100 + Number(frac.slice(0, 2).padEnd(2, "0"))

  if (!Number.isSafeInteger(minor) || minor > MAX_PRICE_MINOR) return null
  return minor
}
