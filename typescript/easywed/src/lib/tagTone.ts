// The color vocabulary shared by dietary tags and age-group brackets, so a
// caterer can scan a guest list and tell "vegan" from "gluten-free" without
// reading every pill. Kept as a pure module (no store, no React) like
// @/lib/dietary and @/lib/ageGroup, so tone assignment stays testable.
//
// The tones are defined as palette-independent CSS vars in `src/styles.css`
// (`--tag-green` and friends) rather than as `--chart-*`: chart colors are
// per-palette and near-monochrome in `editorial`, and a tag's meaning must not
// shift when the couple switches theme.
export const TAG_TONES = [
  "green",
  "teal",
  "amber",
  "violet",
  "blue",
  "rose",
] as const

export type TagTone = (typeof TAG_TONES)[number]

// Outlined pill: colored border and text over a faint wash of the same hue.
// Reads on the guest row's white card and survives its `hover:bg-accent/50`.
//
// Both records are literal maps, not built from a template - Tailwind v4's
// scanner only sees class names written verbatim in the source, so
// `` `text-tag-${tone}` `` would compile to nothing. Same reason `SWATCH` in
// planner/Header/ThemeSubmenu.tsx is spelled out.
export const TAG_TONE_BADGE: Record<TagTone, string> = {
  green: "border-tag-green/35 bg-tag-green/10 text-tag-green",
  teal: "border-tag-teal/35 bg-tag-teal/10 text-tag-teal",
  amber: "border-tag-amber/35 bg-tag-amber/10 text-tag-amber",
  violet: "border-tag-violet/35 bg-tag-violet/10 text-tag-violet",
  blue: "border-tag-blue/35 bg-tag-blue/10 text-tag-blue",
  rose: "border-tag-rose/35 bg-tag-rose/10 text-tag-rose",
}

// Hover tint for interactive outlined pills (filter chips, form presets). Kept
// separate from TAG_TONE_BADGE so the read-only badges in the guest list don't
// grow a hover state they never use.
export const TAG_TONE_BADGE_HOVER: Record<TagTone, string> = {
  green: "hover:bg-tag-green/20",
  teal: "hover:bg-tag-teal/20",
  amber: "hover:bg-tag-amber/20",
  violet: "hover:bg-tag-violet/20",
  blue: "hover:bg-tag-blue/20",
  rose: "hover:bg-tag-rose/20",
}

// Filled counterpart, for the selected state of a chip or preset pill. Text is
// `background` rather than white so it tracks the palette's off-white paper.
export const TAG_TONE_SOLID: Record<TagTone, string> = {
  green:
    "border-transparent bg-tag-green text-background hover:bg-tag-green/90",
  teal: "border-transparent bg-tag-teal text-background hover:bg-tag-teal/90",
  amber:
    "border-transparent bg-tag-amber text-background hover:bg-tag-amber/90",
  violet:
    "border-transparent bg-tag-violet text-background hover:bg-tag-violet/90",
  blue: "border-transparent bg-tag-blue text-background hover:bg-tag-blue/90",
  rose: "border-transparent bg-tag-rose text-background hover:bg-tag-rose/90",
}

// Deterministic tone for a value with no reserved hue. Dietary tags and age
// brackets are free-form, so most real guest lists carry tags we've never seen
// ("lactose-free", "halal"); hashing the tag itself means the same tag gets the
// same color for every user, on every device, forever - no per-wedding color
// table to store or migrate.
//
// djb2 over UTF-16 code units, kept in the 32-bit range with `| 0` and folded
// to non-negative with `>>> 0` before the modulo.
export const toneFromKey = (key: string): TagTone => {
  let hash = 5381
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 33 + key.charCodeAt(i)) | 0
  }
  return TAG_TONES[(hash >>> 0) % TAG_TONES.length]
}
