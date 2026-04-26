import type {
  InvitationColorScheme,
  InvitationSide,
  InvitationTexts,
} from "@/stores/invitation.store"

export interface TemplateProps {
  texts: InvitationTexts
  colorScheme: InvitationColorScheme
  fontCss: string
  guestName?: string
  side: InvitationSide
  fieldSides: Record<keyof InvitationTexts, InvitationSide>
  fieldOrder: Array<keyof InvitationTexts>
}
