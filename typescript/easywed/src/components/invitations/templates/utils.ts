export const salutationLine = (
  salutation?: string,
  guestName?: string
): string | null => {
  if (guestName) return salutation ? `${salutation} ${guestName}` : guestName
  if (salutation) return `${salutation} …`
  return null
}
