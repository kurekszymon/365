// The `changelog` i18n namespace, assembled from one folder per group.
//
// Each folder holds the same locale pair - `en.json` and `pl.json` - and its
// name becomes the key prefix, so `v1/en.json`'s "title" is read as
// `changelog:v1.title`. Keys inside a folder are bare, which is the point: a
// release's strings sit together in one small file with no prefix repeated on
// every line, and the two languages sit side by side for translating.
//
// `page/` is the exception that contributes its keys unprefixed - it is the
// page's own chrome (title, SEO) rather than a release.
//
// Adding a release is a new folder (`v1.1/en.json`, `v1.1/pl.json`) plus its
// entry in components/changelog/releases.ts. Nothing here needs editing; the
// glob picks the folder up, and changelogKeys.test.ts fails if the folders and
// the release table disagree, or if one language is short.

const files = import.meta.glob<Record<string, string>>("./*/*.json", {
  eager: true,
  import: "default",
})

const LANGS = ["en", "pl"] as const

type Lang = (typeof LANGS)[number]

// Folder whose keys land at the root of the namespace instead of under a prefix.
const PAGE = "page"

const bundles: Record<Lang, Record<string, string>> = { en: {}, pl: {} }

for (const [path, strings] of Object.entries(files)) {
  const match = /^\.\/([^/]+)\/(en|pl)\.json$/.exec(path)
  if (!match) continue

  const [, group, lang] = match
  const prefix = group === PAGE ? "" : `${group}.`

  for (const [key, value] of Object.entries(strings)) {
    bundles[lang as Lang][`${prefix}${key}`] = value
  }
}

export const changelog = bundles
