import type {
  FieldFormat,
  SeparatorConfig,
  SeparatorStyle,
} from "@/stores/invitation.store"

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
  return {
    whiteSpace: "pre-wrap" as const,
    ...(fmt?.bold !== undefined && { fontWeight: fmt.bold ? 700 : 400 }),
    ...(fmt?.italic !== undefined && {
      fontStyle: fmt.italic ? "italic" : "normal",
    }),
    ...(fmt?.underline && { textDecoration: "underline" }),
    ...(fmt?.fontSize !== undefined && { fontSize: `${fmt.fontSize}px` }),
  }
}

interface SepRenderOptions {
  lineOpacity: number
  simpleOpacity: number
  ornamentOpacity: number
  lineMargin: string
  ornamentMargin: string
}

const ORNAMENT: Record<SeparatorStyle, string> = {
  line: "",
  heart: "♥",
  flower: "✿",
  star: "✦",
  diamond: "◆",
}

export function renderSeparator(
  style: SeparatorStyle,
  cfg: SeparatorConfig,
  c: { border: string; accent: string },
  opts: SepRenderOptions
): React.ReactNode {
  const w = `${cfg.widthPct ?? 100}%`
  const h = cfg.thicknessPx ?? 1
  if (style === "line") {
    return (
      <div
        style={{
          width: w,
          height: h,
          backgroundColor: c.border,
          opacity: opts.simpleOpacity,
          margin: opts.lineMargin,
        }}
      />
    )
  }
  const lineEl = (
    <div
      style={{
        flex: 1,
        height: h,
        backgroundColor: c.border,
        opacity: opts.lineOpacity,
      }}
    />
  )
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        margin: opts.ornamentMargin,
        width: w,
      }}
    >
      {lineEl}
      <span
        style={{
          color: c.accent,
          fontSize: "11px",
          opacity: opts.ornamentOpacity,
          lineHeight: 1,
          flexShrink: 0,
          fontFamily: "serif",
        }}
      >
        {ORNAMENT[style]}
      </span>
      {lineEl}
    </div>
  )
}
