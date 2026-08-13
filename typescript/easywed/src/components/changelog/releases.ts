// The release history, kept apart from the component that renders it so
// `changelogKeys.test.ts` can check both locale files against it - same reason
// as `legalStructure.ts`. A key missing from one locale does not crash: i18next
// prints the key itself, so a public page ends up reading "v1.i3".
//
// The prose lives in the `changelog` i18n namespace (src/i18n/locales/changelog),
// so the keys below carry no `changelog.` prefix - the namespace is the prefix.

export type Release = {
  /** Folder under src/i18n/locales/changelog holding this release's strings. */
  id: string
  /** Shown as the version badge. */
  version: string
  /** ISO date; formatted per locale at render time so both languages agree. */
  date: string
  /** How many `i<n>` bullets the entry's locale files define. */
  items: number
}

// Newest first - the page renders them in this order. Adding a release means an
// entry here plus a folder of the same name holding en.json and pl.json; the
// test fails if the two disagree or if either language is short.
export const RELEASES: Array<Release> = [
  { id: "v1", version: "1.0", date: "2026-08-13", items: 7 },
]

/** Every key in the `changelog` namespace the page renders, for the test. */
export function changelogI18nKeys(): Array<string> {
  const keys = ["seo_title", "seo_description", "title", "subtitle"]

  for (const { id, items } of RELEASES) {
    keys.push(`${id}.title`, `${id}.summary`)
    for (let i = 1; i <= items; i++) keys.push(`${id}.i${i}`)
  }

  return keys
}
