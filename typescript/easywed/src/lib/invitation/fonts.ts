// Import latin-ext subsets so Polish characters (ą ę ó ś ź ż ć ń ł) render correctly.
// All fonts loaded upfront — each file is ~50-100 KB and only used on the /invitations route.
import "@fontsource/playfair-display/latin-ext-400.css"
import "@fontsource/playfair-display/latin-ext-400-italic.css"
import "@fontsource/playfair-display/latin-ext-700.css"
import "@fontsource/cormorant-garamond/latin-ext-300.css"
import "@fontsource/cormorant-garamond/latin-ext-300-italic.css"
import "@fontsource/cormorant-garamond/latin-ext-600.css"
import "@fontsource/lora/latin-ext-400.css"
import "@fontsource/lora/latin-ext-400-italic.css"
import "@fontsource/lora/latin-ext-600.css"

export interface FontOption {
  id: string
  label: string
  labelPl: string
  css: string
}

export const FONT_OPTIONS: Array<FontOption> = [
  {
    id: "playfair",
    label: "Playfair Display",
    labelPl: "Playfair Display",
    css: "'Playfair Display', Georgia, serif",
  },
  {
    id: "cormorant",
    label: "Cormorant Garamond",
    labelPl: "Cormorant Garamond",
    css: "'Cormorant Garamond', 'Times New Roman', serif",
  },
  {
    id: "lora",
    label: "Lora",
    labelPl: "Lora",
    css: "'Lora', Georgia, serif",
  },
  {
    id: "inter",
    label: "Inter",
    labelPl: "Inter",
    css: "'Inter Variable', 'Inter', sans-serif",
  },
]

export const DEFAULT_FONT_ID = "playfair"
export const DEFAULT_FONT_CSS = FONT_OPTIONS[0].css

export function getFontCss(fontId: string): string {
  return FONT_OPTIONS.find((f) => f.id === fontId)?.css ?? DEFAULT_FONT_CSS
}
