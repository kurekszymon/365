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
  fieldFonts?: Partial<Record<string, string>>
  fieldFormats?: Partial<Record<string, FieldFormat>>
  separatorStyles?: Record<string, SeparatorStyle>
  separatorConfigs?: Record<string, SeparatorConfig>
  textBlocks?: Record<string, string>
  guestName?: string
  side: InvitationSide
  fieldSides: Record<string, InvitationSide>
  fieldOrder: Array<string>
  wrapField?: (id: string, content: React.ReactNode) => React.ReactNode
}
