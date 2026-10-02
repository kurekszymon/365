/**
 * Turning a member into an avatar: initials and a stable color, both derived
 * only from what we are allowed to know - a self-chosen display name and the
 * user id, never an email.
 *
 * `getInitials` also labels *guest* avatars across the planner (seat markers,
 * guest list rows, the assign sheet). Nothing about it is member-specific; it
 * maps a name to at most two glyphs.
 */

/**
 * First letters of the first two words: "Anna Kowalska" -> "AK".
 * Locale-aware uppercase so Polish names ("łukasz") don't lose their casing
 * rules, and code-point aware so an emoji or an accented letter counts as one
 * character instead of half a surrogate pair.
 *
 * The locale is pinned to "pl" rather than read from i18n on purpose: initials
 * belong to the *name*, not to whoever is looking at it, so the same person must
 * not render as "İK" to one member and "IK" to another.
 *
 * A name with no letters at all yields "•" - these sit in a fixed avatar circle,
 * and an empty one reads as a rendering bug.
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
