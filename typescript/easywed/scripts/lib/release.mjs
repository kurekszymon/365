// Pure helpers behind `check-release.mjs`, kept apart so they can be tested
// without a git repository or a terminal.

/** "1.4.0" → [1, 4, 0]; null when it is not plain X.Y.Z. */
export function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  return match ? match.slice(1).map(Number) : null
}

/**
 * Pads a changelog version to X.Y.Z. The release table drops a trailing `.0`
 * ("1.4", "1.0") while package.json and the tags carry all three parts.
 */
export function padVersion(version) {
  const parts = version.split(".")
  if (parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) return null
  while (parts.length < 3) parts.push("0")
  return parts.join(".")
}

/** Negative when a < b, positive when a > b. Both must be X.Y.Z. */
export function compareSemver(a, b) {
  const pa = parseSemver(a)
  const pb = parseSemver(b)
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  return 0
}

/**
 * The entries of `RELEASES` in releases.ts, read as text - same reason as the
 * legal check: a plain node script with no TypeScript loader, and the values
 * are literals. Order is kept, so [0] is the newest.
 */
export function parseReleases(source) {
  const table = /export const RELEASES[^=]*=\s*\[([\s\S]*?)\n\]/.exec(source)
  if (!table) return null

  const entries = []
  for (const [object] of table[1].matchAll(/\{[^}]*\}/g)) {
    const field = (name, pattern) =>
      new RegExp(`${name}:\\s*${pattern}`).exec(object)?.[1]
    entries.push({
      id: field("id", '"([^"]+)"'),
      version: field("version", '"([^"]+)"'),
      date: field("date", '"([^"]+)"'),
      items: Number(field("items", "(\\d+)")),
    })
  }
  return entries
}

/**
 * UTC calendar day as YYYY-MM-DD. `hasUnseenRelease` reads a release date as
 * UTC midnight, so the gate has to agree on what "today" is - a local day
 * would be a day ahead for the first hour or two after midnight in Poland,
 * and flag the release to people who signed in after it went live.
 */
export function utcIsoDate(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

/**
 * The tag a release is measured against: the newest one whose version sorts
 * strictly below `version`. Not simply the newest other tag - redeploying an
 * older release (a rollback) would otherwise be diffed against a newer one.
 */
export function previousTag(tags, prefix, version) {
  let best
  for (const tag of tags) {
    const padded = padVersion(tag.slice(prefix.length))
    if (!padded || compareSemver(padded, version) >= 0) continue
    if (!best || compareSemver(padded, best.version) > 0) {
      best = { tag, version: padded }
    }
  }
  return best?.tag
}

/** The newest tag by version, whatever it is. */
export function newestTag(tags, prefix) {
  let best
  for (const tag of tags) {
    const padded = padVersion(tag.slice(prefix.length))
    if (!padded) continue
    if (!best || compareSemver(padded, best.version) > 0) {
      best = { tag, version: padded }
    }
  }
  return best?.tag
}

/** "2026-10-15" → "15.10", the heading format DEVLOG.md uses. */
export function devlogHeading(isoDate) {
  const [, month, day] = isoDate.split("-")
  return `### ${day}.${month}`
}

/**
 * Ordering problems in the release table: it must be newest first, versions
 * strictly decreasing and dates never increasing.
 */
export function orderingProblems(releases) {
  const problems = []
  for (let i = 1; i < releases.length; i++) {
    const newer = releases[i - 1]
    const older = releases[i]
    const a = padVersion(newer.version)
    const b = padVersion(older.version)
    if (!a || !b) continue
    if (compareSemver(a, b) <= 0) {
      problems.push(`${newer.id} (${a}) is listed above ${older.id} (${b})`)
    }
    if (newer.date < older.date) {
      problems.push(
        `${newer.id} is dated ${newer.date}, before ${older.id} (${older.date})`
      )
    }
  }
  return problems
}
