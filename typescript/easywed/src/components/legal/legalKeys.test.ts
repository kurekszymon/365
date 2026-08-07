import { describe, expect, it } from "vitest"
import en from "@/i18n/locales/en.json"
import pl from "@/i18n/locales/pl.json"
import { legalI18nKeys } from "@/components/legal/legalStructure"

// The legal documents are rendered from a structure table, so a key that is
// missing or renamed in one locale does not fail loudly - i18next falls back to
// printing the key itself, and a clause of the contract silently turns into
// "terms.liability.c9". These are the checks that catch it.
const locales: Array<[string, Record<string, string>]> = [
  ["en", en],
  ["pl", pl],
]

const LEGAL_PREFIXES = ["terms.", "privacy.", "legal."]

const legalKeysOf = (locale: Record<string, string>) =>
  Object.keys(locale).filter((key) =>
    LEGAL_PREFIXES.some((prefix) => key.startsWith(prefix))
  )

describe("legal document i18n coverage", () => {
  it.each(locales)("%s defines every key the documents render", (_, locale) => {
    const missing = legalI18nKeys().filter((key) => !(key in locale))
    expect(missing).toEqual([])
  })

  it.each(locales)("%s has no blank legal strings", (_, locale) => {
    const blank = legalKeysOf(locale).filter((key) => !locale[key].trim())
    expect(blank).toEqual([])
  })

  it("defines the same legal keys in both locales", () => {
    expect(legalKeysOf(pl).sort()).toEqual(legalKeysOf(en).sort())
  })

  it("renders no orphaned legal keys", () => {
    const rendered = new Set(legalI18nKeys())
    const orphans = legalKeysOf(pl).filter((key) => !rendered.has(key))
    expect(orphans).toEqual([])
  })
})
