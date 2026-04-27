import type {
  InvitationColorScheme,
  InvitationDesign,
  InvitationSide,
  InvitationTemplate,
  InvitationTexts,
} from "@/stores/invitation.store"
import { DEFAULT_FONT_ID } from "@/lib/invitation/fonts"

/** Physical card dimensions in px (used by the preview canvas and hash validation). */
export const CARD_W = 585
export const CARD_H = 830

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

export const COLOR_SCHEME_LABEL_KEYS: Record<InvitationColorScheme, string> = {
  "cream-gold": "invitations.color_scheme.cream_gold",
  sage: "invitations.color_scheme.sage",
  navy: "invitations.color_scheme.navy",
  "pure-white": "invitations.color_scheme.pure_white",
  slate: "invitations.color_scheme.slate",
  midnight: "invitations.color_scheme.midnight",
  blush: "invitations.color_scheme.blush",
  lavender: "invitations.color_scheme.lavender",
  "dusty-rose": "invitations.color_scheme.dusty_rose",
}

export const TEXT_MAX_LENGTHS: Record<keyof InvitationDesign["texts"], number> =
  {
    headline: 100,
    coupleNames: 100,
    date: 50,
    time: 20,
    venue: 200,
    venueAddress: 300,
    rsvpEmail: 320,
    rsvpDeadline: 50,
    guestSalutation: 50,
    footer: 500,
  }

export const FIELD_LABEL_KEYS: Record<keyof InvitationTexts, string> = {
  headline: "invitations.text_headline",
  coupleNames: "invitations.text_couple_names",
  date: "invitations.text_date",
  time: "invitations.text_time",
  venue: "invitations.text_venue",
  venueAddress: "invitations.text_venue_address",
  rsvpEmail: "invitations.text_rsvp_email",
  rsvpDeadline: "invitations.text_rsvp_deadline",
  guestSalutation: "invitations.text_guest_salutation",
  footer: "invitations.text_footer",
}

export const DEFAULT_TEXTS: InvitationDesign["texts"] = {
  headline: "",
  coupleNames: "",
  date: "",
  time: "",
  venue: "",
  venueAddress: "",
  rsvpEmail: "",
  rsvpDeadline: "",
  guestSalutation: "",
  footer: "",
}

export const DEFAULT_FIELD_ORDER: Array<keyof InvitationTexts> = [
  "headline",
  "coupleNames",
  "date",
  "time",
  "venue",
  "venueAddress",
  "guestSalutation",
  "rsvpEmail",
  "rsvpDeadline",
  "footer",
]

export const DEFAULT_FIELD_SIDES: Record<
  keyof InvitationTexts,
  InvitationSide
> = {
  headline: "front",
  coupleNames: "front",
  date: "front",
  time: "front",
  venue: "front",
  venueAddress: "front",
  guestSalutation: "front",
  rsvpEmail: "back",
  rsvpDeadline: "back",
  footer: "back",
}

export const DEFAULT_DESIGN: InvitationDesign = {
  template: "classic",
  colorScheme: "cream-gold",
  fontId: DEFAULT_FONT_ID,
  texts: DEFAULT_TEXTS,
  fieldSides: DEFAULT_FIELD_SIDES,
  fieldOrder: DEFAULT_FIELD_ORDER,
  fieldPositions: {},
  quantity: 50,
  guestNames: [],
}
