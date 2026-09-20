import { describe, expect, it } from "vitest"
import { changelog } from "@/i18n/locales/changelog"
import { RELEASES, changelogI18nKeys } from "@/components/changelog/releases"

// The changelog page renders from a release table (`releases.ts`) against a
// folder of locale files per release. Neither side knows about the other at
// runtime, and a missing key does not throw - i18next prints the key, so a
// public page ends up reading "v1.i3". These are the checks that catch it.
//
// `releases.ts` and `locales/changelog/index.ts` have both claimed this file
// existed since v1; it did not. It does now.
const locales: Array<[string, Record<string, string>]> = [
  ["en", changelog.en],
  ["pl", changelog.pl],
]

/** Keys belonging to a release entry, i.e. everything but the page chrome. */
const releaseKeysOf = (bundle: Record<string, string>) =>
  Object.keys(bundle).filter((key) => key.includes("."))

describe("changelog i18n coverage", () => {
  it.each(locales)("%s defines every key the page renders", (_, bundle) => {
    const missing = changelogI18nKeys().filter((key) => !(key in bundle))
    expect(missing).toEqual([])
  })

  it.each(locales)("%s has no blank changelog strings", (_, bundle) => {
    const blank = Object.keys(bundle).filter((key) => !bundle[key].trim())
    expect(blank).toEqual([])
  })

  it("defines the same changelog keys in both locales", () => {
    expect(Object.keys(changelog.pl).sort()).toEqual(
      Object.keys(changelog.en).sort()
    )
  })

  // A release whose folder carries more bullets than `items` renders short:
  // the extra i<n> never reaches the page, which is silent data loss.
  it("renders no orphaned release keys", () => {
    const rendered = new Set(changelogI18nKeys())
    const orphans = releaseKeysOf(changelog.pl).filter(
      (key) => !rendered.has(key)
    )
    expect(orphans).toEqual([])
  })

  // Matched by the id the table declares, never by splitting a key on ".":
  // an id like `v1.1` contains one, so `key.split(".")[0]` collapses it to
  // `v1` and silently counts two releases as one.
  it("gives every release a folder in both locales", () => {
    for (const { id } of RELEASES) {
      for (const [lang, bundle] of locales) {
        expect(
          bundle[`${id}.title`],
          `${id} has no ${lang} folder`
        ).toBeTruthy()
      }
    }
  })

  it("lists releases newest first", () => {
    const dates = RELEASES.map((r) => r.date)
    expect([...dates].sort().reverse()).toEqual(dates)
  })
})
