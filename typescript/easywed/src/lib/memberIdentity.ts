/**
 * Turning a member into an avatar: initials and a stable color. Both derive
 * only from what we're allowed to know (a self-chosen display name and the
 * user id) - never from an email.
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
 */
export const getInitials = (displayName: string): string => {
  const words = displayName.trim().split(/\s+/).filter(Boolean)

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
