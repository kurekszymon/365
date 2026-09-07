// Money, as integer minor units - grosze for PLN, cents for EUR. Currency is one
// per venue (`tenants.currency`), never carried alongside the integer; the
// caller passes both. Pure module: no store import, no React.

/**
 * Ceiling, mirroring the `price_per_person_minor between 0 and 100000000` CHECK
 * on `menu_packages`, so a slipped decimal point is refused by the form rather
 * than by PostgREST.
 */
export const MAX_PRICE_MINOR = 100_000_000

/**
 * The currency assumed before `tenants.currency` has been read, or when the read
 * fails. Mirrors the column's own default, so for every venue on that default it
 * is not a guess at all.
 */
export const DEFAULT_CURRENCY = "PLN"

/**
 * A price for display: `40500, "PLN", "pl"` → `405,00 zł`.
 *
 * The try/catch is load-bearing and the argument that throws is the **locale**:
 * `Intl.NumberFormat` raises `RangeError` on a language tag it cannot parse, and
 * this is called with `i18n.language`, which is whatever the browser reported.
 * Uncaught, that blanks the whole CRM screen around the price cell. The currency
 * is safer than it looks - `tenants.currency` is shape-checked `^[A-Z]{3}$`,
 * which is Intl's own well-formedness rule, so `ZZZ` formats rather than throws.
 *
 * The two fraction digits are pinned rather than left to the currency's minor
 * unit exponent: every price is stored as hundredths whatever the currency, and
 * Intl's default would print values `parsePriceInput` cannot read back (`¥1,405`
 * has no decimal mark left, `KWD 405.000` hits the ambiguous-separator trap).
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
 * Digits in groups of three - the only shape a thousands separator takes. Used
 * to tell grouping apart from a decimal mark, never to guess which character a
 * given locale would have used.
 */
const GROUPED = {
  ".": /^\d{1,3}(?:\.\d{3})+$/,
  ",": /^\d{1,3}(?:,\d{3})+$/,
} as const

/**
 * A cleaned-up amount into its integer and fraction digits, or `null` when the
 * two are not knowable from the string alone.
 *
 * Both `.` and `,` mean "decimal mark" to somebody. Two of three cases decide:
 *
 * - **Both present.** The rightmost is the decimal mark, since no locale writes
 *   grouping after it; the other side still has to be grouped, so `1.4,05` is
 *   refused.
 * - **One character, repeated.** Only grouping repeats: `1,234,567`.
 *
 * The third is the trap: a single separator with exactly three digits behind it
 * (`1,405`, `10,000`) reads as 1405 to an English venue and 1.405 to a Polish
 * one. Nothing breaks the tie and the readings are 1000x apart, so it is refused
 * and the form asks again.
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
 * Deliberately **not** `Math.round(Number(raw) * 100)`: `4.055 * 100` is
 * `405.49999999999994`, so that lands a grosz low and no rounding mode fixes the
 * class. This parses the decimal string and never multiplies a fraction.
 *
 * The separator handling exists so `formatMoney`'s own output round-trips -
 * `CrmMenuPackageEditor` seeds the field with it, and on an English UI that is
 * `PLN 1,405.00`, while Polish and French use no-break spaces for grouping.
 *
 * The fraction is truncated, not rounded: a third digit is a typo, and 4,05 is
 * at least a prefix of what was typed where 4,06 is an amount nobody wrote.
 */
export const parsePriceInput = (raw: string): number | null => {
  // \s already covers both no-break spaces; spelled out because Intl uses them
  // as group separators and before the symbol.
  const stripped = raw.replace(/[\s\u00a0\u202f]/g, "")
  if (stripped.length === 0) return null

  // Currency decoration (`zł`, `PLN`, `€`) is dropped rather than rejected, so a
  // pasted formatted price is accepted.
  const candidate = stripped.replace(/[^\d.,-]/g, "")

  // A minus survives that strip on purpose: a negative price is a mistake worth
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
