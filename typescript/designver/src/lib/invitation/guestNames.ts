export const GUEST_NAME_MAX_LENGTH = 200
export const GUEST_LIST_MAX_SIZE = 500

export function sanitizeGuestName(name: string): string {
  return name.trim().slice(0, GUEST_NAME_MAX_LENGTH)
}

export function sanitizeGuestNames(names: string[]): string[] {
  return names
    .map(sanitizeGuestName)
    .filter(Boolean)
    .slice(0, GUEST_LIST_MAX_SIZE)
}
