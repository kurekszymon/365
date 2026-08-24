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
   * The whole reason this is a hand-written parser.
   * `Math.round(4.055 * 100)` is 405, not 406, because `4.055 * 100` is
   * `405.49999999999994`. Nothing here multiplies a fraction, so the third
   * digit is simply dropped - a prefix of what was typed, rather than an amount
   * nobody wrote.
   */
  it("truncates a third decimal instead of rounding it", () => {
    expect(parsePriceInput("4,055")).toBe(405)
    expect(parsePriceInput("4,059")).toBe(405)
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

  it("refuses a number with two separators", () => {
    // Polish grouping is a space, so `1.405,50` is not a shape this app emits;
    // guessing which separator is which is how a price becomes 1,40550.
    expect(parsePriceInput("1.405,50")).toBeNull()
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
