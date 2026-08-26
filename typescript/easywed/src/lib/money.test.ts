import { describe, expect, it } from "vitest"
import { MAX_PRICE_MINOR, formatMoney, parsePriceInput } from "./money"

describe("formatMoney", () => {
  it("formats minor units as a Polish price", () => {
    // Intl's exact spacing is an ICU detail (no-break space, sometimes narrow),
    // so the assertion is on the parts that are ours: the amount, the comma
    // decimal separator, and the symbol.
    const out = formatMoney(40500, "PLN", "pl")
    expect(out).toContain("405,00")
    expect(out).toContain("zł")
  })

  it("formats zero rather than blanking it", () => {
    expect(formatMoney(0, "PLN", "pl")).toContain("0,00")
  })

  it("keeps two decimals for a round amount in English", () => {
    expect(formatMoney(43500, "EUR", "en")).toContain("435.00")
  })

  /**
   * The reason this function exists rather than being an inline
   * `Intl.NumberFormat` call: it is handed `i18n.language`, which is whatever
   * the browser's language detector reported and is validated nowhere. Intl
   * raises `RangeError` on a tag it cannot parse, and an uncaught throw in a
   * price cell takes down the whole CRM screen around it.
   */
  it("falls back instead of throwing on a locale Intl rejects", () => {
    expect(() => formatMoney(40500, "PLN", "not a locale")).not.toThrow()
    expect(formatMoney(40500, "PLN", "not a locale")).toBe("405.00 PLN")
  })

  /**
   * The near miss, pinned so nobody re-derives it. `tenants.currency` is
   * shape-checked rather than allowlisted, and `^[A-Z]{3}$` is exactly Intl's
   * well-formedness rule - so a stored `ZZZ` formats with the code standing in
   * for the symbol. Odd-looking, not an exception, and no crash to catch.
   */
  it("renders an unknown-but-well-formed currency as its code", () => {
    expect(() => formatMoney(40500, "ZZZ", "pl")).not.toThrow()
    expect(formatMoney(40500, "ZZZ", "pl")).toContain("405,00")
    expect(formatMoney(40500, "ZZZ", "pl")).toContain("ZZZ")
  })
})

describe("parsePriceInput", () => {
  it("parses a plain integer", () => {
    expect(parsePriceInput("405")).toBe(40500)
  })

  it("parses a comma decimal, which is what Polish users type", () => {
    expect(parsePriceInput("405,50")).toBe(40550)
  })

  it("parses a dot decimal too", () => {
    expect(parsePriceInput("405.50")).toBe(40550)
  })

  it("pads a single decimal digit", () => {
    expect(parsePriceInput("405,5")).toBe(40550)
  })

  /**
   * The round trip. `formatMoney` in Polish emits a no-break space as the group
   * separator and before the symbol, so a price copied out of the UI and pasted
   * back must parse - and it only does because the strip covers U+00A0.
   */
  it("parses its own formatted output, no-break spaces and all", () => {
    const formatted = formatMoney(435050, "PLN", "pl")
    expect(formatted).toMatch(/[\s\u00a0\u202f]/)
    expect(parsePriceInput(formatted)).toBe(435050)
  })

  it("ignores a trailing currency", () => {
    expect(parsePriceInput("405 zł")).toBe(40500)
    expect(parsePriceInput("435,50 PLN")).toBe(43550)
  })

  it("ignores ordinary spaces used as a thousands separator", () => {
    expect(parsePriceInput("1 405,50")).toBe(140550)
  })

  /**
   * The bug this shape of parser is easiest to get wrong. `CrmMenuPackageEditor`
   * seeds the price field with `formatMoney(…, i18n.language)`, and on an
   * English UI that is `PLN 1,405.00` - so mapping `,` to `.` unconditionally
   * made the field unreadable to its own output and an English venue could not
   * edit a four-figure price without clearing it first.
   */
  it("parses its own formatted output in English, grouping and all", () => {
    const formatted = formatMoney(140500, "PLN", "en")
    // Exact spacing is an ICU detail (the gap after `PLN` is a no-break
    // space); the grouping comma is the part that matters here.
    expect(formatted).toContain("1,405.00")
    expect(parsePriceInput(formatted)).toBe(140500)
  })

  /**
   * With both characters present there is nothing to guess: no locale writes
   * its group separator after the decimal mark, so the rightmost one is the
   * decimal mark. That is what makes German `1.405,00 €` round-trip too.
   */
  it("reads the rightmost separator as the decimal mark", () => {
    expect(parsePriceInput("1,405.50")).toBe(140550)
    expect(parsePriceInput("1.405,50")).toBe(140550)
    expect(parsePriceInput(formatMoney(140500, "EUR", "de"))).toBe(140500)
  })

  /**
   * Only grouping repeats, so a second separator of the same character settles
   * the question by itself. `1 000 000` is the ceiling, so this is also the
   * largest amount the field will ever have to read back.
   */
  it("reads a repeated separator as grouping", () => {
    expect(parsePriceInput("1,000,000")).toBe(MAX_PRICE_MINOR)
    expect(parsePriceInput("1.000.000")).toBe(MAX_PRICE_MINOR)
  })

  /**
   * The factor-of-1000 trap, refused rather than guessed. `1,405` is 1405 to an
   * English venue and 1.405 to a Polish one; nothing in the string breaks the
   * tie, and storing 1,40 for a 1405 zł package is a worse outcome than making
   * the form ask again.
   */
  it("refuses a lone separator with exactly three digits behind it", () => {
    expect(parsePriceInput("1,405")).toBeNull()
    expect(parsePriceInput("1.405")).toBeNull()
    expect(parsePriceInput("10,000")).toBeNull()
    expect(parsePriceInput("999,000")).toBeNull()
  })

  it("refuses grouping that is not in threes", () => {
    expect(parsePriceInput("1.4,05")).toBeNull()
    expect(parsePriceInput("1,23,456.00")).toBeNull()
    expect(parsePriceInput("1.2.3,4")).toBeNull()
  })

  /**
   * The whole reason this is a hand-written parser.
   * `Math.round(4.0559 * 100)` rounds up, and `4.055 * 100` is
   * `405.49999999999994` so it rounds *down* past the digit it should have
   * kept. Nothing here multiplies a fraction, so the extra digits are simply
   * dropped - a prefix of what was typed, rather than an amount nobody wrote.
   *
   * The examples avoid a bare three-digit fraction because that shape is now
   * refused outright as ambiguous grouping (above); a leading group of four
   * digits, or a fourth decimal, leaves nothing to guess.
   */
  it("truncates a superfluous decimal instead of rounding it", () => {
    expect(parsePriceInput("4,0559")).toBe(405)
    expect(parsePriceInput("1405,059")).toBe(140505)
  })

  it("refuses a negative amount", () => {
    expect(parsePriceInput("-405")).toBeNull()
    expect(parsePriceInput("405-")).toBeNull()
  })

  it("refuses blanks and pure decoration", () => {
    expect(parsePriceInput("")).toBeNull()
    expect(parsePriceInput("   ")).toBeNull()
    expect(parsePriceInput("zł")).toBeNull()
    expect(parsePriceInput(",")).toBeNull()
  })

  it("refuses an amount over the column's CHECK", () => {
    expect(parsePriceInput("1000000")).toBe(MAX_PRICE_MINOR)
    expect(parsePriceInput("1000000,01")).toBeNull()
    expect(parsePriceInput("999999999999999999999")).toBeNull()
  })

  it("accepts zero", () => {
    expect(parsePriceInput("0")).toBe(0)
    expect(parsePriceInput("0,00")).toBe(0)
  })
})
