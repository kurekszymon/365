export const GUEST_NAME_MAX_LENGTH = 200
export const GUEST_LIST_MAX_SIZE = 500

/** Trim and cap a single guest name. Returns empty string if blank. */
export function sanitizeGuestName(name: string): string {
  return name.trim().slice(0, GUEST_NAME_MAX_LENGTH)
}

/** Trim, cap each name, drop blank entries, and limit array length. */
export function sanitizeGuestNames(names: Array<string>): Array<string> {
  return names
    .map(sanitizeGuestName)
    .filter(Boolean)
    .slice(0, GUEST_LIST_MAX_SIZE)
}
