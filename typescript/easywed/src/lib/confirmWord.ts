/**
 * Typed-confirmation matching for irreversible actions.
 *
 * The word is translated ("DELETE" / "USUŃ"), so this has to be tolerant of
 * how people actually type: surrounding whitespace from a paste, and lowercase
 * because the uppercase styling is a display convention, not a requirement.
 * Locale-aware casing so "usuń" still matches "USUŃ".
 */
export const matchesConfirmWord = (input: string, word: string): boolean => {
  const normalize = (value: string) => value.trim().toLocaleUpperCase("pl")

  return normalize(input) === normalize(word) && word.trim().length > 0
}
