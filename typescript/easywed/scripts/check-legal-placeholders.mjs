// Publish gate for the two legal documents.
//
// `provider.ts` and the locale files carry `[PLACEHOLDER]` markers for details
// that only exist on paper - the trader's name, address, NIP and REGON, the
// Supabase region, the retention periods. Nothing in the app fails on them: the
// pages render, every key resolves, `pnpm test` stays green, and the Regulamin
// that has to identify the trader (art. 8 ust. 1 pkt 1 UŚUDE, art. 12 UPK,
// art. 13 RODO) instead identifies "[NIP]".
//
// Wired into `deploy:pages` rather than the test suite: this must block the one
// action that makes the documents binding, not every unrelated test run.

import fs from "node:fs"

const PLACEHOLDER = /\[[A-ZĄĆĘŁŃÓŚŹŻ][^\]]*\]/g

const findings = []

const providerSrc = fs.readFileSync("src/lib/legal/provider.ts", "utf8")
for (const line of providerSrc.split("\n")) {
  for (const hit of line.match(PLACEHOLDER) ?? []) {
    findings.push(`src/lib/legal/provider.ts  ${hit}`)
  }
}

for (const lang of ["pl", "en"]) {
  const path = `src/i18n/locales/${lang}.json`
  const locale = JSON.parse(fs.readFileSync(path, "utf8"))
  for (const [key, value] of Object.entries(locale)) {
    if (!/^(terms|privacy|legal)\./.test(key)) continue
    for (const hit of value.match(PLACEHOLDER) ?? []) {
      findings.push(`${path}  ${key}  ${hit}`)
    }
  }
}

if (findings.length > 0) {
  console.error(
    `\nRefusing to deploy: ${findings.length} unfilled placeholder(s) in the legal documents.\n`
  )
  for (const finding of findings) console.error(`  ${finding}`)
  console.error("")
  process.exit(1)
}

console.log("Legal documents: no unfilled placeholders.")
