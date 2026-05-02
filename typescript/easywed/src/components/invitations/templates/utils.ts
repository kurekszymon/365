import type { FieldFormat } from "@/stores/invitation.store"

export const salutationLine = (
  salutation?: string,
  guestName?: string
): string | null => {
  if (guestName) return salutation ? `${salutation} ${guestName}` : guestName
  if (salutation) return `${salutation} …`
  return null
}

export function getFormatStyle(
  key: string,
  fieldFormats?: Partial<Record<string, FieldFormat>>
): React.CSSProperties {
  const fmt = fieldFormats?.[key]
  if (!fmt) return {}
  return {
    ...(fmt.bold !== undefined && { fontWeight: fmt.bold ? 700 : 400 }),
    ...(fmt.italic !== undefined && {
      fontStyle: fmt.italic ? "italic" : "normal",
    }),
    ...(fmt.underline && { textDecoration: "underline" }),
  }
}
