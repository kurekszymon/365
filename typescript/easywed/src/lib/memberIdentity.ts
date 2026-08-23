/**
 * Turning a member into an avatar: initials and a stable color. Both derive
 * only from what we're allowed to know (a self-chosen display name and the
 * user id) - never from an email.
 *
 * `getInitials` also labels *guest* avatars all over the planner (seat markers,
 * guest list rows, the assign sheet). It used to have a second copy in
 * Canvas/utils.ts that indexed with `word[0]` and bare `.toUpperCase()`, which
 * halved an emoji into a lone surrogate and threw away the casing rules argued
 * for below - so the planner is pointed here instead. Nothing about it is
 * member-specific; it maps a name to at most two glyphs.
 */

/**
 * First letters of the first two words: "Anna Kowalska" -> "AK".
 * Locale-aware uppercase so Polish names ("łukasz") don't lose their casing
 * rules, and code-point aware so an emoji or an accented letter counts as one
 * character instead of half a surrogate pair.
 *
 * The locale is pinned to "pl" rather than read from i18n on purpose: initials
 * belong to the *name*, not to whoever is looking at it, so the same person
 * must not render as "İK" to one member and "IK" to another. "pl" and "en"
 * agree on every letter this touches, so pinning costs nothing today and keeps
 * the function pure.
 *
 * A name with no letters in it at all yields "•": these render inside a fixed
 * avatar circle, and an empty one reads as a rendering bug rather than as a
 * guest whose name the couple hasn't filled in yet.
 */
export const getInitials = (displayName: string): string => {
  const words = displayName.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "•"

  return words
    .slice(0, 2)
    .map((word) => [...word][0] ?? "")
    .join("")
    .toLocaleUpperCase("pl")
}

// Tailwind pairs rather than arbitrary hsl, so the swatches stay inside the
// design system and keep their contrast in both themes.
const TONES = [
  "bg-emerald-700 text-white",
  "bg-orange-700 text-white",
  "bg-teal-700 text-white",
  "bg-rose-700 text-white",
  "bg-indigo-700 text-white",
  "bg-amber-700 text-white",
]

/**
 * Deterministic per user id, so the same person keeps the same color across
 * reloads, devices, and every wedding they're a member of.
 */
export const getAvatarTone = (userId: string): string => {
  let hash = 0
  for (const char of userId) {
    hash = (hash * 31 + char.codePointAt(0)!) % 1_000_003
  }

  return TONES[hash % TONES.length]
}
