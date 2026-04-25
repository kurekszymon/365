import type {
  InvitationColorScheme,
  InvitationDesign,
  InvitationTemplate,
} from "@/stores/invitation.store"
import { DEFAULT_FONT_ID } from "@/lib/invitation/fonts"

export interface TemplateMetadata {
  id: InvitationTemplate
  labelKey: string
  defaultColorScheme: InvitationColorScheme
  colorSchemes: Array<InvitationColorScheme>
}

export const TEMPLATES: Array<TemplateMetadata> = [
  {
    id: "classic",
    labelKey: "invitations.template_classic",
    defaultColorScheme: "cream-gold",
    colorSchemes: ["cream-gold", "sage", "navy"],
  },
  {
    id: "modern",
    labelKey: "invitations.template_modern",
    defaultColorScheme: "pure-white",
    colorSchemes: ["pure-white", "slate", "midnight"],
  },
  {
    id: "romantic",
    labelKey: "invitations.template_romantic",
    defaultColorScheme: "blush",
    colorSchemes: ["blush", "lavender", "dusty-rose"],
  },
]

export const COLOR_SCHEME_LABELS: Record<InvitationColorScheme, string> = {
  "cream-gold": "Kremowy / Złoty",
  sage: "Szałwia",
  navy: "Granat",
  "pure-white": "Biel",
  slate: "Łupek",
  midnight: "Północ",
  blush: "Różany",
  lavender: "Lawenda",
  "dusty-rose": "Pudrowy róż",
}

export const DEFAULT_TEXTS: InvitationDesign["texts"] = {
  headline: "Zapraszamy na ślub",
  coupleNames: "",
  date: "",
  time: "",
  venue: "",
  venueAddress: "",
  rsvpEmail: "",
  rsvpDeadline: "",
  guestSalutation: "Drogi/a",
  footer: "",
}

export const DEFAULT_DESIGN: InvitationDesign = {
  template: "classic",
  colorScheme: "cream-gold",
  fontId: DEFAULT_FONT_ID,
  texts: DEFAULT_TEXTS,
  quantity: 50,
  guestNames: [],
}
