// Pre-deploy gate for a release.
//
// A release is four edits that nothing ties together: the version in
// package.json, a new entry at the top of RELEASES in
// src/components/changelog/releases.ts, its folder of notes under
// src/i18n/locales/changelog/<id>/, and afterwards the `easywed/vX.Y.Z` tag.
// `changelogKeys.test.ts` already checks the notes against the table; this
// checks the table against the version, the tags and the calendar.
//
// The release date is load-bearing, not cosmetic: `hasUnseenRelease` compares
// it with each user's last sign-in, so a date earlier than the real deploy
// hides the "new" dot from everyone who signed in in between.
//
// Errors block, warnings are printed. When the automated part passes, every
// manual item has to be confirmed by hand - deliberately interactive, so a
// deploy never happens without someone reading the list.
//
// Wired into `deploy:pages`, run from the package root like `legal:check`.

import { execFileSync } from "node:child_process"
import fs from "node:fs"
import readline from "node:readline/promises"
import {
  compareSemver,
  devlogHeading,
  newestTag,
  orderingProblems,
  padVersion,
  parseReleases,
  parseSemver,
  previousTag as previousTagFor,
  utcIsoDate,
} from "./lib/release.mjs"

const RELEASES_PATH = "src/components/changelog/releases.ts"
const CHANGELOG_DIR = "src/i18n/locales/changelog"
const DEVLOG_PATH = "docs/DEVLOG.md"
const MIGRATIONS_DIR = "supabase/migrations"
const LEGAL_DIR = "src/lib/legal"
const TAG_PREFIX = "easywed/v"

const errors = []
const warnings = []

const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trimEnd()

const fail = (message) => {
  console.error(`\nRelease check failed: ${message}\n`)
  process.exit(1)
}

// --- What is being released --------------------------------------------------

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version
if (!parseSemver(version))
  fail(`package.json version "${version}" is not X.Y.Z`)

const releases = parseReleases(fs.readFileSync(RELEASES_PATH, "utf8"))
if (!releases?.length) fail(`could not read RELEASES from ${RELEASES_PATH}`)
const latest = releases[0]

const tag = `${TAG_PREFIX}${version}`
const tags = git("tag", "-l", `${TAG_PREFIX}*`).split("\n").filter(Boolean)
// Already tagged means this is a redeploy of a shipped release (a hotfix
// build, a rollback, a preview from the tag), so "is it new" doesn't apply
// and "is it today" becomes "is it the day it was tagged" - see 3a.
const redeploy = tags.includes(tag)

// The release this one is measured against: the newest tag below its version.
// For a rollback that is the tag before it, not the newer one rolled back from.
const previousTag = previousTagFor(tags, TAG_PREFIX, version)

// --- 1. Version and release table agree --------------------------------------

// 1a. package.json and the top of RELEASES name the same version. The table
//     drops a trailing ".0" ("1.4"), so it is padded before comparing. Catches
//     a bump with no release entry, and an entry added on top of an old version.
const latestVersion = padVersion(latest.version ?? "")
if (latestVersion !== version) {
  errors.push(
    `package.json is ${version} but the newest entry in ${RELEASES_PATH} is ${latest.id} (${latest.version}) - bump one or add the other`
  )
}

// 1b. The entry's notes folder exists in both languages. changelogKeys.test.ts
//     checks the keys inside; this is the cheap "did you create it at all",
//     so the gate fails before typecheck and tests even start.
for (const lang of ["en", "pl"]) {
  const file = `${CHANGELOG_DIR}/${latest.id}/${lang}.json`
  if (!fs.existsSync(file)) errors.push(`${file} is missing`)
}

// 1c. RELEASES is newest first: versions strictly decreasing, dates never
//     increasing. The page renders in table order and every check above reads
//     [0] as "this release", so an entry pasted lower down breaks both.
for (const problem of orderingProblems(releases)) {
  errors.push(`${RELEASES_PATH}  ${problem}`)
}

// --- 2. Newer than what shipped ----------------------------------------------

// 2a. A new release is a higher version than every tag - the newest one, not
//     previousTag, which is below this version by construction. Old tags are
//     short ("v1", "v1.1"), so they are padded too. Skipped on a redeploy,
//     where the version is the tag's own by definition.
const lastTag = newestTag(tags, TAG_PREFIX)
if (!redeploy && lastTag) {
  const padded = padVersion(lastTag.slice(TAG_PREFIX.length))
  if (compareSemver(version, padded) <= 0) {
    errors.push(
      `${version} is not newer than the last tag ${lastTag} - bump package.json`
    )
  }
}

// 2b. A redeploy that is not the tagged commit ships code under a version
//     number that already means something else. Only a warning: a hotfix
//     build on top of a tag is a legitimate thing to deploy.
if (redeploy && git("rev-parse", "HEAD") !== git("rev-list", "-n", "1", tag)) {
  warnings.push(
    `${tag} already exists but HEAD is not the tagged commit - you are deploying ${version} with changes the tag does not have`
  )
}

// --- 3. The date ---------------------------------------------------------------

// 3a. The release is dated the day it goes live, as a UTC day - the same day
//     `hasUnseenRelease` reads it as. Notes are often written a day or two
//     ahead, and the date then silently lies - see the header for what that
//     does to the unseen-release dot.
//
//     A redeploy keeps the date the release first went out, which is the day
//     it was tagged (the tag comes after the deploy). Checking that instead of
//     skipping means tagging *before* the first deploy can't switch the date
//     check off: the tag is from today, so a stale date still fails.
if (redeploy) {
  const taggedOn = utcIsoDate(
    new Date(
      git(
        "for-each-ref",
        `refs/tags/${tag}`,
        "--format=%(creatordate:iso-strict)"
      )
    )
  )
  if (latest.date !== taggedOn) {
    errors.push(
      `${latest.id} is dated ${latest.date} but ${tag} was created ${taggedOn} (UTC) - if it was tagged ahead of the deploy, delete the tag, fix the date, and tag after deploying`
    )
  }
} else {
  const today = utcIsoDate()
  if (latest.date !== today) {
    errors.push(
      `${latest.id} is dated ${latest.date} but today is ${today} (UTC) - set the date in ${RELEASES_PATH} to the day it goes live (it drives the unseen-release dot)`
    )
  }
}

// 3b. DEVLOG.md has a "### DD.MM" heading for the release date. A warning for
//     now - the log has known gaps being filled in.
const devlog = fs.readFileSync(DEVLOG_PATH, "utf8")
const heading = devlogHeading(latest.date)
if (!devlog.split("\n").some((line) => line.trim() === heading)) {
  warnings.push(`${DEVLOG_PATH} has no "${heading}" entry for this release`)
}

// --- 4. The release commit(s) touched every part -----------------------------

// 4a. Since the previous tag, all three parts of a release changed: the
//     version bump, the RELEASES entry, the notes folder. 1a only proves the
//     files agree *now* - this catches agreeing on a release that already
//     shipped, e.g. new code deployed with nothing bumped. Diffed against the
//     working commit, so only committed changes count (see 5a) - also on a
//     redeploy, so a hotfix on top of the tag still has its migrations and
//     legal changes seen by 4b.
let changedSincePrevious = []
if (previousTag) {
  const range = `${previousTag}..HEAD`
  changedSincePrevious = git(
    "diff",
    "--name-only",
    "--relative",
    range,
    "--",
    "."
  )
    .split("\n")
    .filter(Boolean)

  // Staged, modified or untracked - there, just not committed yet. Only used
  // to make the error say so; 5a refuses the dirty tree either way.
  const uncommitted = [
    git("diff", "--name-only", "--relative", "HEAD", "--", "."),
    git("ls-files", "--others", "--exclude-standard", "--", "."),
  ]
    .join("\n")
    .split("\n")
    .filter(Boolean)

  const under = (files, path) =>
    files.some((file) => file === path || file.startsWith(`${path}/`))

  const missing = (path, what) =>
    errors.push(
      under(uncommitted, path)
        ? `${path} has ${what} but it is not committed - commit it, the check reads ${previousTag}..HEAD`
        : `${path} unchanged since ${previousTag} - ${what} is missing from this release`
    )

  // The version *field*, not the file: package.json changes for scripts and
  // dependencies too, and a touched file would pass a release with no bump.
  const versionAt = (ref) =>
    JSON.parse(git("show", `${ref}:./package.json`)).version
  if (versionAt("HEAD") === versionAt(previousTag)) {
    missing("package.json", "the version bump")
  }

  const parts = [
    [RELEASES_PATH, "the release entry"],
    [`${CHANGELOG_DIR}/${latest.id}`, "the release notes"],
  ]
  for (const [path, what] of parts) {
    if (!under(changedSincePrevious, path)) missing(path, what)
  }
} else {
  warnings.push(
    `no ${TAG_PREFIX}* tag found - skipped the since-last-release checks`
  )
}

// 4b. Not checks themselves - what changed since previousTag decides which
//     conditional items the manual checklist asks (migrations → db push,
//     legal config → change notice).
const newMigrations = changedSincePrevious.filter(
  (file) => file.startsWith(`${MIGRATIONS_DIR}/`) && file.endsWith(".sql")
)
const legalChanged = changedSincePrevious.some((file) =>
  file.startsWith(`${LEGAL_DIR}/`)
)

// --- 5. What actually gets built ---------------------------------------------

// 5a. Clean working tree. wrangler deploys the local build and marks it with
//     HEAD, so a modified file ships in a deploy that claims to be a commit
//     without it - an error. Untracked files only reach the build if something
//     imports them, so they are a warning.
const status = git("status", "--porcelain", "--", ".")
  .split("\n")
  .filter(Boolean)
const modified = status.filter((line) => !line.startsWith("??"))
const untracked = status.filter((line) => line.startsWith("??"))
if (modified.length) {
  errors.push(
    `uncommitted changes would ship but not be in HEAD:\n${modified.map((l) => `      ${l}`).join("\n")}`
  )
}
if (untracked.length) {
  warnings.push(
    `untracked files (check none of them are imported):\n${untracked.map((l) => `      ${l}`).join("\n")}`
  )
}

// 5b. New migrations since the last tag. The frontend expecting a schema the
//     remote doesn't have yet breaks every signed-in user, and nothing in the
//     build can see the remote - so list them here and make 6 ask about it.
if (newMigrations.length) {
  warnings.push(
    `new migrations since ${previousTag}:\n${newMigrations.map((f) => `      ${f}`).join("\n")}`
  )
}

// --- Report ------------------------------------------------------------------

let ref
try {
  ref = git("symbolic-ref", "--short", "HEAD")
} catch {
  ref = `detached at ${git("describe", "--tags", "--always")}`
}

console.log(
  `\nRelease ${version} · ${latest.date} · ${latest.items} note(s) · ${redeploy ? `redeploy of ${tag}, ` : ""}since ${previousTag ?? "-"} · ${ref}\n`
)

for (const warning of warnings) console.warn(`  warning  ${warning}`)

if (errors.length) {
  for (const error of errors) console.error(`  error    ${error}`)
  console.error(
    `\nRefusing to deploy: ${errors.length} problem(s) with the release.\n`
  )
  process.exit(1)
}

// --- 6. Manual checklist -----------------------------------------------------

// Only asked once every automated check passed - no point confirming a deploy
// that is about to be refused. The first two are always asked; the rest only
// when 4b/warnings make them relevant, so the list stays short enough to
// actually read rather than mash "y" through.
const checklist = [
  `Read the ${latest.id} notes in both languages on /pl/changelog and /en/changelog`,
  "Smoke-tested the planner as a guest and signed in, on desktop and on a phone",
  ...(newMigrations.length
    ? [
        `Ran \`supabase db push\` - the ${newMigrations.length} new migration(s) above are on remote`,
      ]
    : []),
  ...(legalChanged
    ? ["Legal config changed - checked whether the terms need a change notice"]
    : []),
  ...(warnings.length
    ? ["Read every warning above and I'm fine with each"]
    : []),
]

// No terminal (CI, piped stdin) means nobody can confirm, which is a refusal
// rather than a skip - the point is that a person read the list.
if (!process.stdin.isTTY) {
  fail(
    "the manual checklist needs a terminal to confirm - run it interactively"
  )
}

console.log("\nConfirm each item (y to continue, anything else aborts):\n")
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})
for (const item of checklist) {
  // Ctrl+C / Ctrl+D reject the question - an abort like any other non-"y".
  const answer = await rl.question(`  ${item}? [y/N] `).catch(() => "")
  if (answer.trim().toLowerCase() !== "y") {
    rl.close()
    fail(`not confirmed: ${item}`)
  }
}
rl.close()

console.log(`\nRelease ${version} checked.`)
if (!redeploy) {
  console.log(
    `After the deploy succeeds, tag it:\n\n  git tag -a ${tag} -m "easywed v${version}"\n`
  )
}
