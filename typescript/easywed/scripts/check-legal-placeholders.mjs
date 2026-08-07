// Publish gate for the two legal documents.
//
// `config.ts` and the locale files carry `[PLACEHOLDER]` markers for details
// that only exist on paper - the trader's name, address, NIP and REGON.
// Nothing in the app fails on them: the pages render, every key resolves,
// `pnpm test` stays green, and the Regulamin that has to identify the trader
// (art. 8 ust. 1 pkt 1 UŚUDE, art. 12 UPK, art. 13 RODO) instead identifies
// "[NIP]".
//
// Beyond that it enforces two things a placeholder scan cannot see: that
// someone has actually reviewed the values that were filled in (a stale
// effective date looks exactly like a correct one), and that the operational
// numbers asserted in config.ts are the same numbers the Polish and English
// prose actually states.
//
// Wired into `deploy:pages` rather than the test suite: this must block the one
// action that makes the documents binding, not every unrelated test run.

import fs from "node:fs"

const PLACEHOLDER = /\[[A-ZĄĆĘŁŃÓŚŹŻ][^\]]*\]/g
const CONFIG_PATH = "src/lib/legal/config.ts"

const findings = []

const configSrc = fs.readFileSync(CONFIG_PATH, "utf8")

const locales = Object.fromEntries(
  ["pl", "en"].map((lang) => [
    lang,
    JSON.parse(fs.readFileSync(`src/i18n/locales/${lang}.json`, "utf8")),
  ])
)

const legalEntries = (locale) =>
  Object.entries(locale).filter(([key]) => /^(terms|privacy|legal)\./.test(key))

// 1. Unfilled placeholders, in the config and in the prose.
//
// Comment lines are skipped: a placeholder is a *value* waiting to be filled
// in, and the comments in config.ts discuss the markers by name. Without this
// the gate reports its own documentation as a finding.
const isComment = (line) => /^\s*(\/\/|\/\*|\*)/.test(line)

for (const line of configSrc.split("\n")) {
  if (isComment(line)) continue
  for (const hit of line.match(PLACEHOLDER) ?? []) {
    findings.push(`${CONFIG_PATH}  ${hit}`)
  }
}

for (const [lang, locale] of Object.entries(locales)) {
  for (const [key, value] of legalEntries(locale)) {
    for (const hit of value.match(PLACEHOLDER) ?? []) {
      findings.push(`src/i18n/locales/${lang}.json  ${key}  ${hit}`)
    }
  }
}

// 2. The operational facts config.ts asserts have to be the ones the prose
//    states. Read straight out of the source rather than imported: this is a
//    plain node script with no TypeScript loader, and the values are literals.
//
//    Comments are stripped first, for the same reason as the scan above and one
//    more: config.ts discusses these fields by name, so a line like
//    "e.g. analyticsRetentionMonths: 99 on a paid plan" would otherwise be
//    found before the real assignment and silently checked against instead.
//    The trailing `(?:\s+as\b[^,\n]*)?` tolerates the type assertions the
//    values carry, so `30 as number | null` reads as 30.
const configValueLines = configSrc
  .split("\n")
  .filter((line) => !isComment(line))
  .join("\n")

const readConfig = (path, valuePattern) => {
  const pattern = new RegExp(
    `${path.split(".").pop()}:\\s*(${valuePattern})(?:\\s+as\\b[^,\\n]*)?`
  )
  const match = configValueLines.match(pattern)
  if (!match) {
    findings.push(`${CONFIG_PATH}  could not read ${path} - has it been renamed?`)
    return null
  }
  return match[1]
}

const region = readConfig("infra.supabaseRegion", '"[^"]+"')?.slice(1, -1)
const analyticsMonths = readConfig("infra.analyticsRetentionMonths", "\\d+")
const backupDays = readConfig("infra.backupRetentionDays", "null|\\d+")

const mustMention = (key, needle, why) => {
  for (const [lang, locale] of Object.entries(locales)) {
    const value = locale[key]
    if (value === undefined) {
      findings.push(`src/i18n/locales/${lang}.json  ${key}  missing`)
    } else if (!value.includes(needle)) {
      findings.push(
        `src/i18n/locales/${lang}.json  ${key}  does not mention "${needle}" - ${why}`
      )
    }
  }
}

if (region) {
  mustMention("privacy.transfers.body", region, "config.ts says that is the region")
}

if (analyticsMonths) {
  mustMention(
    "privacy.retention.analytics",
    analyticsMonths,
    "config.ts says that is the retention"
  )
}

// Backups are a structural difference, not a number: with none, the policy says
// deletion is irreversible; with backups, it has to name the period instead.
// Both directions are checked - a policy promising to overwrite backups within
// 30 days when no backups exist is as wrong as one that omits a real period,
// and it is the likelier mistake, since it is what the sentence said before.
const RETENTION_PERIOD = /\d+\s*(dni|dzie[ńn]|dnia|days?|miesi\w*|months?)/i

if (backupDays === "null") {
  for (const [lang, locale] of Object.entries(locales)) {
    const value = locale["privacy.retention.backups"]
    const claimed = value?.match(RETENTION_PERIOD)
    if (claimed) {
      findings.push(
        `src/i18n/locales/${lang}.json  privacy.retention.backups  claims "${claimed[0]}" but config.ts says there are no backups`
      )
    }
  }
} else if (backupDays) {
  mustMention(
    "privacy.retention.backups",
    backupDays,
    "backups now exist, so the policy has to name the retention period"
  )
}

// 3. Everything above only catches a value nobody filled in, or two values that
//    disagree. It cannot catch a value that is filled in and simply wrong.
if (!/launchReviewed:\s*true/.test(configSrc)) {
  findings.push(
    `${CONFIG_PATH}  launchReviewed is not true - read the file top to bottom and confirm every value before publishing`
  )
}

if (findings.length > 0) {
  console.error(
    `\nRefusing to deploy: ${findings.length} problem(s) with the legal documents.\n`
  )
  for (const finding of findings) console.error(`  ${finding}`)
  console.error("")
  process.exit(1)
}

console.log("Legal documents: placeholders filled, prose agrees with config.")
