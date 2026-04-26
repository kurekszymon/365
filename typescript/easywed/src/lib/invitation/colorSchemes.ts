import type { InvitationColorScheme } from "@/stores/invitation.store"

export interface ColorTokens {
  bg: string
  border: string
  accent: string
  text: string
  muted: string
}

export const COLOR_SCHEMES = {
  // Classic
  "cream-gold": {
    bg: "#fdf8f0",
    border: "#b8962e",
    accent: "#b8962e",
    text: "#2c1810",
    muted: "#7a6a5a",
  },
  sage: {
    bg: "#f4f7f2",
    border: "#5a7a5a",
    accent: "#3d5c3d",
    text: "#1a2e1a",
    muted: "#5a6a5a",
  },
  navy: {
    bg: "#f0f2f7",
    border: "#1a2d5a",
    accent: "#1a2d5a",
    text: "#0d1a35",
    muted: "#4a5a7a",
  },
  // Modern — `border` doubles as the horizontal-rule colour
  "pure-white": {
    bg: "#ffffff",
    border: "#1a1a1a",
    accent: "#1a1a1a",
    text: "#1a1a1a",
    muted: "#888888",
  },
  slate: {
    bg: "#f5f6f7",
    border: "#4a5568",
    accent: "#2d3748",
    text: "#2d3748",
    muted: "#718096",
  },
  midnight: {
    bg: "#0f1117",
    border: "#444444",
    accent: "#e8d5b7",
    text: "#f0f0f0",
    muted: "#a0a0a0",
  },
  // Romantic
  blush: {
    bg: "#fdf5f5",
    border: "#d4a0a0",
    accent: "#c9728a",
    text: "#3d1f2a",
    muted: "#9a7080",
  },
  lavender: {
    bg: "#f7f5fd",
    border: "#b0a0d0",
    accent: "#7c5cbf",
    text: "#2a1f3d",
    muted: "#7a6a9a",
  },
  "dusty-rose": {
    bg: "#fdf2ee",
    border: "#c8a898",
    accent: "#a06050",
    text: "#3d2018",
    muted: "#9a7060",
  },
} satisfies Record<InvitationColorScheme, ColorTokens>
