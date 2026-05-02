import type {
  FieldFormat,
  InvitationColorScheme,
  InvitationSide,
  InvitationTexts,
  SeparatorConfig,
  SeparatorStyle,
} from "@/stores/invitation.store"

export interface TemplateProps {
  texts: InvitationTexts
  colorScheme: InvitationColorScheme
  fontCss: string
  fieldFonts?: Partial<Record<keyof InvitationTexts, string>>
  fieldFormats?: Partial<Record<keyof InvitationTexts, FieldFormat>>
  separatorStyles?: Record<string, SeparatorStyle>
  separatorConfigs?: Record<string, SeparatorConfig>
  guestName?: string
  side: InvitationSide
  fieldSides: Record<string, InvitationSide>
  fieldOrder: Array<string>
  wrapField?: (id: string, content: React.ReactNode) => React.ReactNode
}
