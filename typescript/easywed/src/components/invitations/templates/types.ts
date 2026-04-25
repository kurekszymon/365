import type { InvitationColorScheme, InvitationTexts } from "@/stores/invitation.store"

export interface TemplateProps {
  texts: InvitationTexts
  colorScheme: InvitationColorScheme
  fontCss: string
  guestName?: string
}
