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
    }).format(minor / 100)
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`
  }
}

/**
 * A typed price back into minor units. `null` for anything that is not a
 * non-negative amount this app will store.
 *
 * Deliberately **not** `Math.round(Number(raw) * 100)`. That expression is
 * wrong for values a user can plainly type: `4.055 * 100` is
 * `405.49999999999994`, so the rounding lands a grosz low, and there is no
 * amount of rounding mode that fixes the class. This parses the decimal string
 * instead and never multiplies a fraction.
 *
 * The whitespace strip covers U+00A0 and U+202F as well as ordinary spaces, and
 * that is what makes a value round-trip: Polish `Intl` output uses a no-break
 * space as the group separator *and* before `zł`, so `formatMoney`'s own result
 * pasted back into the field must parse. It reads like over-thinking until the
 * first bug report from someone who copied a price out of the UI.
 *
 * The fraction is **truncated** to two digits rather than rounded. A third
 * digit in a price is a typo, and silently rounding 4,055 up to 4,06 invents an
 * amount nobody typed; taking 4,05 is at least a prefix of what they wrote.
 */
export const parsePriceInput = (raw: string): number | null => {
  // \s already covers both no-break spaces in JavaScript; they are spelled
  // out because the reason they matter is not obvious from `\s` alone.
  const stripped = raw.replace(/[\s\u00a0\u202f]/g, "")
  if (stripped.length === 0) return null

  // Everything that is not a digit, a separator or a sign is currency
  // decoration - `zł`, `PLN`, `€`. Dropped rather than rejected, so a pasted
  // formatted price is accepted.
  const candidate = stripped.replace(/[^\d.,-]/g, "").replace(/,/g, ".")

  // A minus survives the strip on purpose: a negative price is a mistake worth
  // refusing, not decoration worth ignoring.
  if (candidate.includes("-")) return null

  const parts = candidate.split(".")
  if (parts.length > 2) return null

  const [int = "", frac = ""] = parts
  if (int.length === 0 && frac.length === 0) return null

  const minor =
    Number(int || "0") * 100 + Number(frac.slice(0, 2).padEnd(2, "0"))

  if (!Number.isSafeInteger(minor) || minor > MAX_PRICE_MINOR) return null
  return minor
}
